from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.events.store import event_store
from app.models.user import User
from app.schemas import AuthResponse, LoginRequest, RegisterRequest

class AuthService:
    async def register(self, session: AsyncSession, request: RegisterRequest) -> AuthResponse:
        existing = await session.scalar(select(User).where(User.username == request.username))
        if existing is not None:
            raise ValueError("username_taken")
        user = User(
            username=request.username,
            display_name=request.display_name,
            password_hash=self._hash_password(request.password),
            is_agent=False,
        )
        session.add(user)
        await session.flush()
        await event_store.append(session, "user_registered", user.id, user.id, {"username": user.username})
        await session.commit()
        return self._response(user)

    async def login(self, session: AsyncSession, request: LoginRequest) -> AuthResponse:
        user = await session.scalar(select(User).where(User.username == request.username))
        if user is None or user.password_hash is None or not self._verify_password(request.password, user.password_hash):
            raise ValueError("invalid_credentials")
        return self._response(user)

    def _hash_password(self, password: str) -> str:
        return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    def _verify_password(self, password: str, password_hash: str) -> bool:
        try:
            return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
        except ValueError:
            return False

    def _response(self, user: User) -> AuthResponse:
        token = jwt.encode(
            {
                "sub": str(user.id),
                "username": user.username,
                "exp": datetime.now(timezone.utc) + timedelta(days=7),
            },
            settings.jwt_secret,
            algorithm="HS256",
        )
        return AuthResponse(token=token, user_id=user.id, username=user.username)

    async def resolve_user(self, session: AsyncSession, token: str) -> User:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        user_id = uuid.UUID(payload["sub"])
        user = await session.get(User, user_id)
        if user is None:
            raise ValueError("user_not_found")
        return user


auth_service = AuthService()
