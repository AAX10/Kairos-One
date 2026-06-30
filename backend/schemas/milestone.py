from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from enum import StrEnum

class MilestoneStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"

class Milestone(BaseModel):
    """Key milestones to track progress."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )

    id: str
    mission_id: str
    title: str
    status: MilestoneStatus
    created_at: str
    completed_at: str | None = None
