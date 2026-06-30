# =============================================================================
# Kairos One — In-Memory Repository
# Pre-populated with realistic mock data matching frontend/src/services/mock-data.ts.
# Used as the fallback when Firebase credentials are not configured.
# =============================================================================

from copy import deepcopy
from typing import Any

from schemas.agent import AgentActivity, AgentPipelineState, AgentState, AgentStatusType, AgentType
from schemas.user import UserProfile, UserSettings
from schemas.dashboard import (
    AIRecommendation,
    BriefPriority,
    CoachInsight,
    DayBrief,
    RecommendationAction,
)
from schemas.mission import (
    CreateMissionInput,
    MissionNode,
    MissionNodeStatus,
    MissionNodeType,
    MissionScoreBreakdown,
    MissionSuccess,
    Priority,
)
from schemas.timeline import (
    IntegrationService,
    IntegrationStatus,
    IntegrationStatusType,
    RecoveryChange,
    RecoveryPlan,
    TimeBlock,
    TimeBlockStatus,
    TimeBlockType,
    CalendarEvent,
    CalendarCredentials,
)
from schemas.memory import MemoryItem
from utils.helpers import days_from_now, hours_ago, iso_now, minutes_ago, today_at


# =============================================================================
# Mission Colors (matches frontend MISSION_COLORS)
# =============================================================================

MISSION_COLORS = {
    "interview": "#818cf8",
    "mlAssignment": "#f59e0b",
    "hackathon": "#34d399",
    "default": "#60a5fa",
}

# =============================================================================
# Seed Data Factory
# =============================================================================

def _seed_missions() -> list[MissionNode]:
    return []

def _seed_mission_success() -> MissionSuccess:
    return MissionSuccess(
        overall_score=100,
        confidence=100,
        delta=0,
        risk=0,
        trend="stable",
        reasoning=["Ready for new missions."],
        per_mission_scores=[],
        last_calculated_at=iso_now(),
    )

def _seed_day_brief() -> DayBrief:
    return DayBrief(
        greeting="Welcome to Kairos One Mission Control.",
        todays_focus="Create a mission to initialize the autonomous AI pipeline.",
        critical_mission="None active",
        highest_risk="None",
        deep_work_recommendation="Schedule 2 hours of deep work after lunch.",
        expected_productivity="High",
        completion_estimate="By 5:00 PM",
        upcoming_deadlines="No immediate deadlines.",
    )

def _seed_timeline() -> list[TimeBlock]:
    return []

def _seed_agent_activities() -> list[AgentActivity]:
    return []

def _seed_recommendations() -> list[AIRecommendation]:
    return []

def _seed_coach_insights() -> list[CoachInsight]:
    return []

def _seed_integrations() -> list[IntegrationStatus]:
    return [
        IntegrationStatus(service=IntegrationService.GEMINI, status=IntegrationStatusType.CONNECTED, last_sync=iso_now(), detail="Gemini 2.5 Flash active"),
        IntegrationStatus(service=IntegrationService.CALENDAR, status=IntegrationStatusType.PENDING, last_sync=iso_now(), detail="Ready for sync"),
    ]

def _seed_pipeline() -> AgentPipelineState:
    return AgentPipelineState(
        agents=[
            AgentState(type=AgentType.PLANNER, status=AgentStatusType.IDLE, current_action="", result="", started_at=None, completed_at=None),
            AgentState(type=AgentType.SCHEDULER, status=AgentStatusType.IDLE, current_action="", result="", started_at=None, completed_at=None),
            AgentState(type=AgentType.RISK, status=AgentStatusType.IDLE, current_action="", result="", started_at=None, completed_at=None),
            AgentState(type=AgentType.RECOVERY, status=AgentStatusType.IDLE, current_action="", result="", started_at=None, completed_at=None),
            AgentState(type=AgentType.COACH, status=AgentStatusType.IDLE, current_action="", result="", started_at=None, completed_at=None),
        ],
        is_running=False,
        trigger="",
    )

def _seed_recovery_plan(timeline: list[TimeBlock]) -> RecoveryPlan:
    return RecoveryPlan(
        id="recovery-empty",
        trigger="",
        original_timeline=[],
        recovered_timeline=[],
        mission_success_before=0,
        mission_success_after=0,
        changes=[],
        explanation="No active recovery plan.",
        agent_pipeline=_seed_pipeline(),
    )

def _seed_user_profile() -> UserProfile:
    return UserProfile(
        uid="mock-user",
        display_name="Mock User",
        email="mock@example.com",
        provider="mock"
    )

# =============================================================================
# In-Memory Repository
# =============================================================================


class InMemoryRepository:
    """Thread-safe in-memory data store pre-populated with mock data.

    Serves as the fallback when Firebase credentials are not configured.
    All CRUD operations mutate data in-place for the lifetime of the process.
    """

    def __init__(self) -> None:
        self.missions: list[MissionNode] = _seed_missions()
        self.mission_success: MissionSuccess = _seed_mission_success()
        self.day_brief: DayBrief = _seed_day_brief()
        self.timeline: list[TimeBlock] = _seed_timeline()
        self.agent_activities: list[AgentActivity] = _seed_agent_activities()
        self.recommendations: list[AIRecommendation] = _seed_recommendations()
        self.coach_insights: list[CoachInsight] = _seed_coach_insights()
        self.integrations: list[IntegrationStatus] = _seed_integrations()
        self.pipeline: AgentPipelineState = _seed_pipeline()
        self.recovery_plan: RecoveryPlan = _seed_recovery_plan(self.timeline)
        self.user_profile: UserProfile = _seed_user_profile()
        self.calendar_events: list[CalendarEvent] = []
        self.calendar_credentials: CalendarCredentials | None = None
        self.memories: list[MemoryItem] = []
        self.milestones: list[Any] = []

    # -------------------------------------------------------------------------
    # Batch Commit
    # -------------------------------------------------------------------------

    def batch_commit(self, mutations: list[Any]) -> None:
        """Executes a list of deferred mutations in-memory."""
        from services.logging_service import get_logger
        logger = get_logger("in_memory")
        for mut in mutations:
            collection = mut.collection
            op = mut.operation
            
            # Simple manual routing for in-memory collections
            if collection == "missions":
                if op == "create":
                    from schemas.mission import MissionNode
                    self.missions.append(MissionNode(**mut.data))
                elif op == "update":
                    for i, m in enumerate(self.missions):
                        if m.id == mut.doc_id:
                            data = m.model_dump(by_alias=False)
                            data.update(mut.data)
                            from schemas.mission import MissionNode
                            self.missions[i] = MissionNode(**data)
                            break
                elif op == "delete":
                    self.missions = [m for m in self.missions if m.id != mut.doc_id]
            elif collection == "activities":
                if op == "create":
                    from schemas.agent import AgentActivity
                    self.agent_activities.append(AgentActivity(**mut.data))
            elif collection == "memories":
                if op == "create":
                    from schemas.memory import MemoryItem
                    self.memories.append(MemoryItem(**mut.data))
            elif collection == "dashboard":
                if op == "update":
                    if mut.doc_id == "mission_success":
                        from schemas.mission import MissionSuccess
                        self.mission_success = MissionSuccess(**mut.data)
                    elif mut.doc_id == "recovery_plan":
                        from schemas.timeline import RecoveryPlan
                        self.recovery_plan = RecoveryPlan(**mut.data)
            elif collection == "recommendations":
                if op == "create":
                    from schemas.dashboard import AIRecommendation
                    self.recommendations.append(AIRecommendation(**mut.data))
                elif op == "delete":
                    self.recommendations = [r for r in self.recommendations if r.id != mut.doc_id]
        logger.info(f"Batched commit of {len(mutations)} operations completed in-memory.")

    # -------------------------------------------------------------------------
    # Mission CRUD
    # -------------------------------------------------------------------------

    def get_top_level_missions(self) -> list[MissionNode]:
        """Return only top-level missions (type == mission, no parent)."""
        return [deepcopy(m) for m in self.missions if m.type == MissionNodeType.MISSION]

    def get_all_missions(self) -> list[MissionNode]:
        """Return all nodes (missions + tasks)."""
        return [deepcopy(m) for m in self.missions]

    def get_mission_by_id(self, mission_id: str) -> MissionNode | None:
        """Find a single mission/task by ID."""
        for m in self.missions:
            if m.id == mission_id:
                return deepcopy(m)
        return None

    def get_mission_children(self, mission_id: str) -> list[MissionNode]:
        """Return direct children of a mission."""
        return [deepcopy(m) for m in self.missions if m.parent_id == mission_id]

    def create_mission(self, input_data: CreateMissionInput) -> MissionNode:
        """Create a new mission from input data."""
        from utils.helpers import generate_id

        new_mission = MissionNode(
            id=generate_id("mission"),
            name=input_data.name,
            description=input_data.description,
            type=MissionNodeType.MISSION,
            status=MissionNodeStatus.PENDING,
            priority=input_data.priority,
            deadline=input_data.deadline,
            created_at=iso_now(),
            completed_at=None,
            estimated_hours=input_data.estimated_hours,
            actual_hours=0,
            parent_id=None,
            children=[],
            dependencies=[],
            completion_percentage=0,
            contribution_to_success=0,
            assigned_agent="planner",
            color="#60a5fa",
        )
        self.missions.append(new_mission)
        return deepcopy(new_mission)

    def update_mission(self, mission_id: str, updates: dict[str, object]) -> MissionNode | None:
        """Apply partial updates to a mission."""
        for i, m in enumerate(self.missions):
            if m.id == mission_id:
                current_data = m.model_dump(by_alias=False)
                current_data.update(updates)
                updated = MissionNode(**current_data)
                self.missions[i] = updated
                return deepcopy(updated)
        return None

    def delete_mission(self, mission_id: str) -> bool:
        """Delete a mission and its children."""
        children_ids = [m.id for m in self.missions if m.parent_id == mission_id]
        self.missions = [
            m for m in self.missions
            if m.id != mission_id and m.id not in children_ids
        ]
        return True

    # -------------------------------------------------------------------------
    # Milestone CRUD
    # -------------------------------------------------------------------------

    def create_milestone(self, mission_id: str, title: str) -> Any:
        from schemas.milestone import Milestone, MilestoneStatus
        from utils.helpers import generate_id, iso_now
        milestone = Milestone(
            id=generate_id("milestone"),
            mission_id=mission_id,
            title=title,
            status=MilestoneStatus.PENDING,
            created_at=iso_now()
        )
        self.milestones.append(milestone)
        return deepcopy(milestone)

    def get_milestones(self, mission_id: str) -> list[Any]:
        return [deepcopy(m) for m in self.milestones if m.mission_id == mission_id]

    def update_milestone(self, milestone_id: str, updates: dict[str, Any]) -> Any | None:
        for i, m in enumerate(self.milestones):
            if m.id == milestone_id:
                current_data = m.model_dump(by_alias=False)
                current_data.update(updates)
                from schemas.milestone import Milestone
                updated = Milestone(**current_data)
                self.milestones[i] = updated
                return deepcopy(updated)
        return None

    # -------------------------------------------------------------------------
    # Dashboard Data
    # -------------------------------------------------------------------------

    def get_mission_success(self) -> MissionSuccess:
        return deepcopy(self.mission_success)

    def get_day_brief(self) -> DayBrief:
        return deepcopy(self.day_brief)

    def get_timeline(self) -> list[TimeBlock]:
        return [deepcopy(tb) for tb in self.timeline]

    def get_agent_activities(self) -> list[AgentActivity]:
        # Sort activities by timestamp descending
        sorted_acts = sorted(self.agent_activities, key=lambda a: a.timestamp, reverse=True)
        return [deepcopy(a) for a in sorted_acts]

    def add_agent_activity(self, activity: AgentActivity) -> None:
        self.agent_activities.append(deepcopy(activity))

    def get_recommendations(self) -> list[AIRecommendation]:
        return [deepcopy(r) for r in self.recommendations]

    def get_coach_insights(self) -> list[CoachInsight]:
        return [deepcopy(ci) for ci in self.coach_insights]

    def get_calendar_events(self) -> list[CalendarEvent]:
        return [deepcopy(e) for e in self.calendar_events]

    def get_integrations(self) -> list[IntegrationStatus]:
        return [deepcopy(i) for i in self.integrations]

    def get_pipeline(self) -> AgentPipelineState:
        return deepcopy(self.pipeline)

    def get_recovery_plan(self) -> RecoveryPlan:
        return deepcopy(self.recovery_plan)

    def update_mission_success(self, success: MissionSuccess) -> None:
        self.mission_success = deepcopy(success)

    def update_day_brief(self, brief: DayBrief) -> None:
        self.day_brief = deepcopy(brief)

    def update_timeline(self, timeline: list[TimeBlock]) -> None:
        self.timeline = [deepcopy(tb) for tb in timeline]

    def update_recommendations(self, recs: list[AIRecommendation]) -> None:
        self.recommendations = [deepcopy(r) for r in recs]

    def update_recovery_plan(self, plan: RecoveryPlan) -> None:
        self.recovery_plan = deepcopy(plan)

    def get_planner_cache(self, mission_id: str) -> dict | None:
        if not hasattr(self, "planner_cache"):
            self.planner_cache = {}
        return self.planner_cache.get(mission_id)

    def set_planner_cache(self, mission_id: str, data: dict) -> None:
        if not hasattr(self, "planner_cache"):
            self.planner_cache = {}
        self.planner_cache[mission_id] = data

    def get_orchestrator_cache(self, mission_id: str) -> dict | None:
        if not hasattr(self, "orchestrator_cache"):
            self.orchestrator_cache = {}
        return self.orchestrator_cache.get(mission_id)

    def set_orchestrator_cache(self, mission_id: str, data: dict) -> None:
        if not hasattr(self, "orchestrator_cache"):
            self.orchestrator_cache = {}
        self.orchestrator_cache[mission_id] = data

    def get_user_profile(self, uid: str) -> UserProfile | None:
        if self.user_profile.uid == uid or self.user_profile.uid == "mock-user":
            return deepcopy(self.user_profile)
        return None

    def update_calendar_events(self, events: list[CalendarEvent]) -> None:
        self.calendar_events = [deepcopy(e) for e in events]

    def get_calendar_credentials(self) -> CalendarCredentials | None:
        return deepcopy(self.calendar_credentials)


    def delete_calendar_credentials(self) -> None:
        self.calendar_credentials = None

    def update_calendar_credentials(self, creds: CalendarCredentials) -> None:
        self.calendar_credentials = deepcopy(creds)

    def get_active_user_profile(self) -> UserProfile:
        return deepcopy(self.user_profile)

    def update_user_profile(self, profile: UserProfile) -> None:
        self.user_profile = deepcopy(profile)

    # -------------------------------------------------------------------------
    # Memory CRUD
    # -------------------------------------------------------------------------

    def add_memory(self, memory: MemoryItem) -> None:
        self.memories.append(deepcopy(memory))

    def get_memories(self, limit: int = 100, min_importance: float = 0.0) -> list[MemoryItem]:
        filtered = [m for m in self.memories if m.importance_score >= min_importance]
        # Sort by timestamp desc, importance desc
        filtered.sort(key=lambda m: (m.timestamp, m.importance_score), reverse=True)
        return [deepcopy(m) for m in filtered[:limit]]

# =============================================================================
# Singleton
# =============================================================================

_repository: InMemoryRepository | None = None


def get_repository() -> InMemoryRepository:
    """Get or create the singleton repository instance."""
    global _repository  # noqa: PLW0603
    if _repository is None:
        _repository = InMemoryRepository()
    return _repository

