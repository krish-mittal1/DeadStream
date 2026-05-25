from __future__ import annotations

from typing import Any, Optional

from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.logging import get_logger

logger = get_logger(__name__)


class AppError(Exception):
    """Base application error with structured metadata."""

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        code: Optional[str] = None,
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.code = code or message.lower().replace(" ", "_").replace("-", "_")
        self.details = details or {}
        super().__init__(self.message)


class NotFoundError(AppError):
    def __init__(self, entity: str, entity_id: Optional[str] = None) -> None:
        msg = f"{entity}_not_found"
        details = {"entity": entity}
        if entity_id:
            details["entity_id"] = entity_id
        super().__init__(msg, status_code=404, code=msg, details=details)


class ConflictError(AppError):
    def __init__(self, entity: str, field: str, value: str) -> None:
        msg = f"{entity}_{field}_taken"
        super().__init__(
            msg,
            status_code=409,
            code=msg,
            details={"entity": entity, "field": field, "value": value},
        )


class UnauthorizedError(AppError):
    def __init__(self, reason: str = "invalid_credentials") -> None:
        super().__init__(reason, status_code=401, code=reason)


class ValidationError(AppError):
    def __init__(self, message: str, details: Optional[dict[str, Any]] = None) -> None:
        super().__init__(message, status_code=422, code="validation_error", details=details)


class ErrorResponse(BaseModel):
    error: str
    code: str
    detail: Optional[dict[str, Any]] = None


async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch all exceptions and return a structured JSON error."""
    if isinstance(exc, AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(error=exc.message, code=exc.code, detail=exc.details or None).model_dump(),
        )

    # Fallback for unhandled errors — log the full traceback
    logger.exception("unhandled_exception", path=str(request.url.path))
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(error="internal_server_error", code="internal_error").model_dump(),
    )
