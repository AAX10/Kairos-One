# =============================================================================
# Kairos One — Custom Exceptions
# Typed exception hierarchy with standard JSON error responses.
# =============================================================================

from typing import ClassVar


class SentinelException(Exception):
    """Base exception for all Kairos One errors."""

    status_code: ClassVar[int] = 500
    error_type: ClassVar[str] = "internal_error"

    def __init__(self, detail: str) -> None:
        self.detail = detail
        super().__init__(detail)


class MissionNotFoundException(SentinelException):
    """Raised when a mission ID does not exist."""

    status_code: ClassVar[int] = 404
    error_type: ClassVar[str] = "mission_not_found"

    def __init__(self, mission_id: str) -> None:
        super().__init__(f"Mission not found: {mission_id}")
        self.mission_id = mission_id


class AgentExecutionError(SentinelException):
    """Raised when an agent fails during execution."""

    status_code: ClassVar[int] = 500
    error_type: ClassVar[str] = "agent_execution_error"

    def __init__(self, agent_type: str, detail: str) -> None:
        super().__init__(f"Agent '{agent_type}' failed: {detail}")
        self.agent_type = agent_type


class ValidationError(SentinelException):
    """Raised for business logic validation failures."""

    status_code: ClassVar[int] = 422
    error_type: ClassVar[str] = "validation_error"


class ServiceUnavailableError(SentinelException):
    """Raised when an external service is unavailable."""

    status_code: ClassVar[int] = 503
    error_type: ClassVar[str] = "service_unavailable"


