# =============================================================================
# Kairos One — Mission Schemas
# Direct 1:1 mirror of frontend/src/types/index.ts mission types.
# All fields use camelCase serialization to match the frontend exactly.
# =============================================================================

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


# -----------------------------------------------------------------------------
# Enums
# -----------------------------------------------------------------------------


class MissionNodeType(StrEnum):
    GOAL = "goal"
    MISSION = "mission"
    TASK = "task"
    CALENDAR_BLOCK = "calendar-block"


class MissionNodeStatus(StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    MISSED = "missed"


class Priority(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# -----------------------------------------------------------------------------
# Mission Node
# -----------------------------------------------------------------------------


class MissionNode(BaseModel):
    """Core node in the mission dependency graph."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    name: str
    description: str
    type: MissionNodeType
    status: MissionNodeStatus
    priority: Priority
    deadline: str  # ISO 8601
    created_at: str
    completed_at: str | None = None
    estimated_hours: float
    actual_hours: float
    parent_id: str | None = None
    children: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    completion_percentage: float  # 0–100
    contribution_to_success: float
    assigned_agent: str | None = None
    color: str  # hex color
    critical_path: bool = False
    blocked_by: list[str] = Field(default_factory=list)
    complexity_score: int | None = None
    category: str | None = None
    project_classification: str | None = None
    milestones: list[str] = Field(default_factory=list)
    updated_at: str | None = None
    
    calendar_event_id: str | None = None
    scheduled_start: str | None = None
    scheduled_end: str | None = None


class MissionNodeWithChildren(MissionNode):
    """Mission node with resolved child nodes."""

    child_nodes: list[MissionNode] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Mission Success — Primary KPI
# -----------------------------------------------------------------------------


class MissionScoreBreakdown(BaseModel):
    """Per-mission score contribution."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    mission_id: str
    name: str
    score: float  # 0–100
    contribution: float  # positive or negative
    trend: str  # "up" | "down" | "stable"


class MissionSuccess(BaseModel):
    """Overall mission success KPI."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    overall_score: float  # 0–100
    confidence: float  # 0–100
    delta: float  # change from previous calculation
    risk: float  # 0-100
    trend: str  # "up" | "down" | "stable"
    reasoning: list[str]
    per_mission_scores: list[MissionScoreBreakdown]
    last_calculated_at: str


# -----------------------------------------------------------------------------
# API Input Types
# -----------------------------------------------------------------------------


class CreateMissionInput(BaseModel):
    """Input for creating a new mission."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    name: str = Field(min_length=2)
    description: str = Field(min_length=5)
    deadline: str
    priority: Priority
    estimated_hours: float = Field(ge=0.5, le=1000)


class UpdateMissionInput(BaseModel):
    """Partial update input for a mission."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    name: str | None = None
    description: str | None = None
    status: MissionNodeStatus | None = None
    priority: Priority | None = None
    deadline: str | None = None
    estimated_hours: float | None = None
    actual_hours: float | None = None
    completion_percentage: float | None = None

