# =============================================================================
# Kairos One — Standard API Response Helpers
# Consistent envelope structure for all endpoints.
# =============================================================================

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """Standard API response envelope."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    success: bool
    data: T | None = None
    error: str | None = None
    detail: str | None = None


class ErrorDetail(BaseModel):
    """Standard error response body."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    error: str
    detail: str
    status_code: int


def success_response(data: T) -> dict[str, object]:
    """Build a success response dict."""
    return {
        "success": True,
        "data": data,
        "error": None,
        "detail": None,
    }


def error_response(error: str, detail: str, status_code: int) -> dict[str, object]:
    """Build an error response dict."""
    return {
        "error": error,
        "detail": detail,
        "statusCode": status_code,
    }

