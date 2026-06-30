# =============================================================================
# Kairos One — Agent Schemas
# Direct 1:1 mirror of frontend/src/types/index.ts agent types.
# =============================================================================

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


# -----------------------------------------------------------------------------
# Enums
# -----------------------------------------------------------------------------


class AgentType(StrEnum):
    PLANNER = "planner"
    SCHEDULER = "scheduler"
    RISK = "risk"
    RECOVERY = "recovery"
    COACH = "coach"


class AgentStatusType(StrEnum):
    IDLE = "idle"
    THINKING = "thinking"
    WORKING = "working"
    FINISHED = "finished"
    ERROR = "error"


# -----------------------------------------------------------------------------
# Agent State
# -----------------------------------------------------------------------------


class AgentState(BaseModel):
    """State of a single agent in the pipeline."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    type: AgentType
    status: AgentStatusType
    current_action: str
    result: str
    confidence: float | None = None
    execution_duration_ms: float | None = None
    started_at: str | None = None
    completed_at: str | None = None


class AgentPipelineState(BaseModel):
    """Full pipeline state across all agents."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    agents: list[AgentState]
    is_running: bool
    trigger: str


# -----------------------------------------------------------------------------
# Agent Activity
# -----------------------------------------------------------------------------


class AgentActivity(BaseModel):
    """Record of an agent action for the activity feed."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    agent: AgentType
    action: str
    impact: str
    reasoning: str
    timestamp: str
    related_mission_id: str | None = None


# -----------------------------------------------------------------------------
# API Input / Output
# -----------------------------------------------------------------------------


class AgentRunRequest(BaseModel):
    """Input for POST /agents/run."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    mission_id: str
    trigger: str = "Manual analysis"


class AgentRunResponse(BaseModel):
    """Output for POST /agents/run."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    pipeline: AgentPipelineState
    activities: list[AgentActivity] = Field(default_factory=list)

