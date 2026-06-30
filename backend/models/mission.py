# =============================================================================
# Kairos One — Mission Domain Model
# Internal representation for mission business logic.
# =============================================================================

from dataclasses import dataclass, field


@dataclass
class MissionDomain:
    """Internal domain model for mission processing.

    Used by agents and orchestrator for business logic.
    Converted to/from schema models at API boundaries.
    """

    id: str
    name: str
    description: str
    type: str
    status: str
    priority: str
    deadline: str
    created_at: str
    completed_at: str | None = None
    estimated_hours: float = 0.0
    actual_hours: float = 0.0
    parent_id: str | None = None
    children: list[str] = field(default_factory=list)
    dependencies: list[str] = field(default_factory=list)
    completion_percentage: float = 0.0
    contribution_to_success: float = 0.0
    assigned_agent: str | None = None
    color: str = "#60a5fa"

    @property
    def is_overdue(self) -> bool:
        """Check if the mission is past its deadline."""
        from datetime import datetime, timezone

        try:
            deadline_dt = datetime.fromisoformat(self.deadline)
            return datetime.now(timezone.utc) > deadline_dt and self.status != "completed"
        except (ValueError, TypeError):
            return False

    @property
    def remaining_hours(self) -> float:
        """Calculate estimated remaining hours."""
        remaining_pct = (100 - self.completion_percentage) / 100
        return self.estimated_hours * remaining_pct

    @property
    def is_at_risk(self) -> bool:
        """Heuristic: mission is at risk if behind schedule."""
        return self.completion_percentage < 50 and self.priority in ("critical", "high")

