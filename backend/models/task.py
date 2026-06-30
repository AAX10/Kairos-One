# =============================================================================
# Kairos One — Task Domain Model
# Internal representation for task-level business logic.
# =============================================================================

from dataclasses import dataclass, field


@dataclass
class TaskDomain:
    """Internal domain model for task processing.

    Tasks are leaf nodes in the mission graph. They represent
    actionable work items with time estimates and dependencies.
    """

    id: str
    name: str
    description: str
    status: str
    priority: str
    deadline: str
    created_at: str
    completed_at: str | None = None
    estimated_hours: float = 0.0
    actual_hours: float = 0.0
    parent_id: str | None = None
    dependencies: list[str] = field(default_factory=list)
    completion_percentage: float = 0.0
    assigned_agent: str | None = None
    color: str = "#60a5fa"

    @property
    def is_blocked(self) -> bool:
        """Check if the task has unresolved dependencies."""
        return self.status == "blocked"

    @property
    def is_completable(self) -> bool:
        """Check if the task can be worked on."""
        return self.status in ("pending", "in-progress")

    @property
    def estimated_minutes(self) -> int:
        """Remaining estimated time in minutes."""
        remaining_pct = (100 - self.completion_percentage) / 100
        return int(self.estimated_hours * remaining_pct * 60)

