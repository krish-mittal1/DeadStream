from __future__ import annotations

from typing import Optional

from fastapi import Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.user import User
from app.services.auth import auth_service


async def current_user(
    authorization: Optional[str] = Header(default=None),
    session: AsyncSession = Depends(get_session),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing_token")
    try:
        user = await auth_service.resolve_user(session, authorization.removeprefix("Bearer ").strip())
        # Prevent agent accounts from authenticating as human users
        if getattr(user, "is_agent", False):
            raise HTTPException(status_code=403, detail="agent_account_not_allowed")
        return user
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail="invalid_token") from exc

