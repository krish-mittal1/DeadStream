from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt, JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ConflictError, UnauthorizedError
from app.events.store import event_store
from app.models.user import User
from app.schemas import AuthResponse, LoginRequest, RegisterRequest


class AuthService:
    async def register(self, session: AsyncSession, request: RegisterRequest) -> AuthResponse:
        existing = await session.scalar(select(User).where(User.username == request.username))
        if existing is not None:
            raise ConflictError("user", "username", request.username)

        user = User(
            username=request.username,
            display_name=request.display_name,
            password_hash=await self._hash_password(request.password),
            is_agent=False,
        )
        session.add(user)
        await session.flush()
        await event_store.append(session, "user_registered", user.id, user.id, {"username": user.username})
        await session.commit()
        return self._response(user)

    async def login(self, session: AsyncSession, request: LoginRequest) -> AuthResponse:
        user = await session.scalar(select(User).where(User.username == request.username))
        if user is None or user.password_hash is None:
            raise UnauthorizedError("invalid_credentials")
        if not await self._verify_password(request.password, user.password_hash):
            raise UnauthorizedError("invalid_credentials")
        return self._response(user)

    async def _hash_password(self, password: str) -> str:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            None, lambda: bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        )

    async def _verify_password(self, password: str, password_hash: str) -> bool:
        try:
            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(
                None, lambda: bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
            )
        except ValueError:
            return False

    def _response(self, user: User) -> AuthResponse:
        token = jwt.encode(
            {
                "sub": str(user.id),
                "username": user.username,
                "exp": datetime.now(timezone.utc) + timedelta(days=7),
                "iat": datetime.now(timezone.utc),
            },
            settings.jwt_secret,
            algorithm="HS256",
        )
        return AuthResponse(token=token, user_id=user.id, username=user.username)

    async def resolve_user(self, session: AsyncSession, token: str) -> User:
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        except JWTError:
            raise UnauthorizedError("invalid_token")

        user_id_str = payload.get("sub")
        if not user_id_str:
            raise UnauthorizedError("invalid_token")

        try:
            user_id = uuid.UUID(user_id_str)
        except ValueError:
            raise UnauthorizedError("invalid_token")

        user = await session.get(User, user_id)
        if user is None:
            raise UnauthorizedError("user_not_found")
        return user


auth_service = AuthService()
