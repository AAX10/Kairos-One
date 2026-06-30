# =============================================================================
# Kairos One — Timeline & Recovery Schemas
# Direct 1:1 mirror of frontend/src/types/index.ts timeline types.
# =============================================================================

from enum import StrEnum
from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from schemas.agent import AgentPipelineState


# -----------------------------------------------------------------------------
# Enums
# -----------------------------------------------------------------------------


class TimeBlockType(StrEnum):
    DEEP_WORK = "deep-work"
    MEETING = "meeting"
    BREAK = "break"
    ADMIN = "admin"
    BUFFER = "buffer"


class TimeBlockStatus(StrEnum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    MISSED = "missed"


class IntegrationService(StrEnum):
    CALENDAR = "calendar"
    GMAIL = "gmail"
    DRIVE = "drive"
    GEMINI = "gemini"
    FIREBASE = "firebase"


class IntegrationStatusType(StrEnum):
    CONNECTED = "connected"
    SYNCING = "syncing"
    ANALYZING = "analyzing"
    DISCONNECTED = "disconnected"
    PENDING = "pending"


# -----------------------------------------------------------------------------
# Time Block & Calendar
# -----------------------------------------------------------------------------

class CalendarCredentials(BaseModel):
    """OAuth credentials for Google Calendar."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    access_token: str
    refresh_token: str | None = None
    expiry: datetime | None = None
    scopes: list[str] = []
    email: str | None = None
    calendar_id: str = "primary"
    client_id: str | None = None
    client_secret: str | None = None
    token_uri: str | None = None


class CalendarEvent(BaseModel):
    """Normalized Google Calendar Event."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    title: str
    description: str | None = None
    location: str | None = None
    start: str
    end: str
    all_day: bool = False
    color: str | None = None
    status: str | None = None
    organizer: str | None = None
    calendar_id: str | None = None



class TimeBlock(BaseModel):
    """A scheduled block of time on the calendar."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    mission_id: str | None = None
    mission_name: str
    title: str
    start: str  # ISO 8601
    end: str
    type: TimeBlockType
    status: TimeBlockStatus
    color: str
    location: str | None = None
    description: str | None = None
    organizer: str | None = None


# -----------------------------------------------------------------------------
# Recovery
# -----------------------------------------------------------------------------


class RecoveryChange(BaseModel):
    """A single change made during recovery."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    type: str  # "rescheduled" | "compressed" | "deprioritized" | "escalated"
    description: str
    before: str
    after: str


class RecoveryPlan(BaseModel):
    """Full recovery plan with before/after timelines."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    trigger: str
    original_timeline: list[TimeBlock]
    recovered_timeline: list[TimeBlock]
    mission_success_before: float
    mission_success_after: float
    changes: list[RecoveryChange]
    explanation: str
    agent_pipeline: AgentPipelineState


# -----------------------------------------------------------------------------
# Integration Status
# -----------------------------------------------------------------------------


class IntegrationStatus(BaseModel):
    """Status of a connected Google service."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    service: IntegrationService
    status: IntegrationStatusType
    last_sync: str
    detail: str


# -----------------------------------------------------------------------------
# API Input
# -----------------------------------------------------------------------------


class RecoveryRunRequest(BaseModel):
    """Input for POST /recovery/run."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    type: str = "missed-today"  # "missed-today" | "missed-task"

