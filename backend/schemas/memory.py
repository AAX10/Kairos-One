# =============================================================================
# Kairos One — Memory Schemas
# =============================================================================

from enum import StrEnum
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Any

class MemoryType(StrEnum):
    USER_PROFILE = "user_profile"
    PREFERENCE = "preference"
    PROJECT = "project"
    MISSION = "mission"
    TASK_COMPLETED = "task_completed"
    TASK_MISSED = "task_missed"
    RECOVERY = "recovery"
    SCHEDULING = "scheduling"
    CALENDAR = "calendar"
    AGENT_DECISION = "agent_decision"
    COACH_INSIGHT = "coach_insight"
    GOAL = "goal"
    HABIT = "habit"
    PATTERN = "pattern"
    REFLECTION = "reflection"
    REC_ACCEPTED = "rec_accepted"
    REC_DISMISSED = "rec_dismissed"
    PLANNER_OUTPUT = "planner_output"
    SCHEDULER_OUTPUT = "scheduler_output"
    CALENDAR_SYNC = "calendar_sync"

class MemoryItem(BaseModel):
    """A single persistent memory record for AI context retrieval."""
    
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    type: MemoryType
    timestamp: str  # ISO 8601
    importance_score: float  # 0 to 100
    source: str
    content: str  # The actual text/context the AI uses
    metadata: dict[str, Any] = {}

class MemoryInsight(BaseModel):
    """Insight summarized for the Dashboard."""
    
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    category: str  # e.g., "habit", "trend", "learning", "goal"
    title: str
    description: str
    icon: str | None = None

