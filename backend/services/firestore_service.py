# =============================================================================
# Kairos One — Firestore Service Abstraction
# Transparent fallback to InMemoryRepository when Firebase is not configured.
# Uses in-memory caching to drastically reduce Firestore API reads.
# =============================================================================

import time
from functools import wraps
from config import get_settings
from schemas.agent import AgentActivity, AgentPipelineState
from schemas.dashboard import AIRecommendation, CoachInsight, DayBrief
from schemas.mission import CreateMissionInput, MissionNode, MissionSuccess
from schemas.timeline import IntegrationStatus, RecoveryPlan, TimeBlock, CalendarEvent, CalendarCredentials
from schemas.memory import MemoryItem
from schemas.user import UserProfile
from services.logging_service import get_logger, FirestoreLogger

logger = get_logger("firestore")
perf_logger = FirestoreLogger()

def fallback_on_error(default_factory):
    """Decorator to catch Firestore exceptions (like 429 Quota Exceeded) and return a fallback."""
    def decorator(func):
        @wraps(func)
        async def wrapper(self, *args, **kwargs):
            try:
                return await func(self, *args, **kwargs)
            except Exception as e:
                logger.error("Firestore operation failed in %s: %s. Using fallback.", func.__name__, str(e))
                return default_factory() if callable(default_factory) else default_factory
        return wrapper
    return decorator


class FirestoreService:
    """Abstraction over Google Cloud Firestore.

    When Firebase credentials are not configured, all operations
    are transparently delegated to the InMemoryRepository.
    Callers never need to know which backend is active.
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._configured = settings.firebase_configured

        from services.cache_service import get_cache_service
        self._cache = get_cache_service()

        if self._configured:
            from database.firestore_repo import get_firestore_repository
            self._repo = get_firestore_repository()
            logger.info(
                "Firestore service initialized with project=%s",
                settings.firebase_project_id,
            )
        else:
            from database.init import get_repository
            self._repo = get_repository()
            logger.info("Firestore service running with in-memory fallback")

    @property
    def is_configured(self) -> bool:
        """Whether real Firebase credentials are available."""
        return self._configured

    async def _track_read(self, endpoint: str, cache_dict: dict, cache_key: str, repo_func, *args):
        import asyncio
        start = time.perf_counter()
        if cache_key in cache_dict:
            res = cache_dict[cache_key]
            perf_logger.log_cache_hit(endpoint, (time.perf_counter() - start) * 1000)
            return res
            
        res = await asyncio.to_thread(repo_func, *args)
        
        # Calculate approximate reads
        reads = 1
        if isinstance(res, list):
            reads = max(1, len(res))
            
        perf_logger.log_firestore_read(endpoint, reads, (time.perf_counter() - start) * 1000)
        
        if res is not None:
            cache_dict[cache_key] = res
        return res
        
    async def _track_write(self, endpoint: str, repo_func, invalidate_func, *args):
        import asyncio
        start = time.perf_counter()
        res = await asyncio.to_thread(repo_func, *args)
        perf_logger.log_firestore_write(endpoint, 1, (time.perf_counter() - start) * 1000)
        invalidate_func()
        return res

    # -------------------------------------------------------------------------
    # Batch Operations
    # -------------------------------------------------------------------------
    
    @fallback_on_error(None)
    async def batch_commit(self, mutations: list) -> None:
        if not mutations:
            return
        start = time.perf_counter()
        self._repo.batch_commit(mutations)
        perf_logger.log_firestore_write("BatchCommit", len(mutations), (time.perf_counter() - start) * 1000)

    # -------------------------------------------------------------------------
    # Mission Operations
    # -------------------------------------------------------------------------

    @fallback_on_error(list)
    async def get_top_level_missions(self) -> list[MissionNode]:
        return await self._track_read("TopMissions", self._cache.missions_cache, "top_level_missions", self._repo.get_top_level_missions)

    @fallback_on_error(list)
    async def get_all_missions(self) -> list[MissionNode]:
        return await self._track_read("AllMissions", self._cache.missions_cache, "all_missions", self._repo.get_all_missions)

    @fallback_on_error(None)
    async def get_mission_by_id(self, mission_id: str) -> MissionNode | None:
        return await self._track_read(f"Mission_{mission_id}", self._cache.missions_cache, f"mission_{mission_id}", self._repo.get_mission_by_id, mission_id)

    @fallback_on_error(list)
    async def get_mission_children(self, mission_id: str) -> list[MissionNode]:
        return await self._track_read(f"MissionChildren_{mission_id}", self._cache.missions_cache, f"children_{mission_id}", self._repo.get_mission_children, mission_id)

    @fallback_on_error(None)
    async def create_mission(self, input_data: CreateMissionInput) -> MissionNode:
        return await self._track_write("CreateMission", self._repo.create_mission, self._cache.invalidate_mission, input_data)

    @fallback_on_error(None)
    async def update_mission(self, mission_id: str, updates: dict[str, object]) -> MissionNode | None:
        return await self._track_write(f"UpdateMission_{mission_id}", self._repo.update_mission, lambda: self._cache.invalidate_mission(mission_id), mission_id, updates)

    @fallback_on_error(False)
    async def delete_mission(self, mission_id: str) -> bool:
        return await self._track_write(f"DeleteMission_{mission_id}", self._repo.delete_mission, lambda: self._cache.invalidate_mission(mission_id), mission_id)

    # -------------------------------------------------------------------------
    # Milestone Operations
    # -------------------------------------------------------------------------

    @fallback_on_error(None)
    async def create_milestone(self, mission_id: str, title: str) -> object:
        return await self._track_write(f"CreateMilestone_{mission_id}", self._repo.create_milestone, self._cache.milestones_cache.clear, mission_id, title)

    @fallback_on_error(list)
    async def get_milestones(self, mission_id: str) -> list[object]:
        return await self._track_read(f"GetMilestones_{mission_id}", self._cache.milestones_cache, f"milestones_{mission_id}", self._repo.get_milestones, mission_id)

    @fallback_on_error(None)
    async def update_milestone(self, milestone_id: str, updates: dict[str, object]) -> object | None:
        return await self._track_write(f"UpdateMilestone_{milestone_id}", self._repo.update_milestone, self._cache.milestones_cache.clear, milestone_id, updates)

    # -------------------------------------------------------------------------
    # Dashboard Data
    # -------------------------------------------------------------------------

    @fallback_on_error(lambda: MissionSuccess(overall_score=0, confidence=0, delta=0, risk=0, trend="stable", reasoning=["Quota Exceeded"], per_mission_scores=[], last_calculated_at=""))
    async def get_mission_success(self) -> MissionSuccess:
        return await self._track_read("MissionSuccess", self._cache.mission_success_cache, "mission_success", self._repo.get_mission_success)

    @fallback_on_error(lambda: DayBrief(greeting="Welcome", todays_focus="Database Quota Exceeded. Some data may be unavailable.", critical_mission="N/A", highest_risk="N/A", deep_work_recommendation="System running in degraded mode.", expected_productivity="N/A", completion_estimate="N/A", upcoming_deadlines="N/A"))
    async def get_day_brief(self) -> DayBrief:
        return await self._track_read("DayBrief", self._cache.day_brief_cache, "day_brief", self._repo.get_day_brief)

    @fallback_on_error(list)
    async def get_timeline(self) -> list[TimeBlock]:
        return await self._track_read("Timeline", self._cache.timeline_cache, "timeline", self._repo.get_timeline)

    @fallback_on_error(list)
    async def get_agent_activities(self) -> list[AgentActivity]:
        return await self._track_read("AgentActivities", self._cache.agent_activities_cache, "agent_activities", self._repo.get_agent_activities)

    @fallback_on_error(list)
    async def get_recommendations(self) -> list[AIRecommendation]:
        return await self._track_read("Recommendations", self._cache.recommendations_cache, "recommendations", self._repo.get_recommendations)

    @fallback_on_error(list)
    async def get_coach_insights(self) -> list[CoachInsight]:
        return await self._track_read("CoachInsights", self._cache.insights_cache, "coach_insights", self._repo.get_coach_insights)

    @fallback_on_error(list)
    async def get_integrations(self) -> list[IntegrationStatus]:
        return await self._track_read("Integrations", self._cache.integrations_cache, "integrations", self._repo.get_integrations)

    @fallback_on_error(None)
    async def update_integrations(self, integrations: list[IntegrationStatus]) -> None:
        return await self._track_write("UpdateIntegrations", self._repo.update_integrations, self._cache.integrations_cache.clear, integrations)

    @fallback_on_error(lambda: AgentPipelineState(agents=[], is_running=False, trigger=""))
    async def get_pipeline(self) -> AgentPipelineState:
        return await self._track_read("AgentPipeline", self._cache.agent_status_cache, "pipeline", self._repo.get_pipeline)

    @fallback_on_error(list)
    async def get_calendar_events(self) -> list[CalendarEvent]:
        return await self._track_read("CalendarEvents", self._cache.calendar_events_cache, "calendar_events", self._repo.get_calendar_events)

    @fallback_on_error(lambda: RecoveryPlan(id="fallback", trigger="", original_timeline=[], recovered_timeline=[], mission_success_before=0, mission_success_after=0, changes=[], explanation="Quota reached", agent_pipeline=AgentPipelineState(agents=[], is_running=False, trigger="")))
    async def get_recovery_plan(self) -> RecoveryPlan:
        return await self._track_read("RecoveryPlan", self._cache.dashboard_cache, "recovery_plan", self._repo.get_recovery_plan)

    @fallback_on_error(None)
    async def update_mission_success(self, success: MissionSuccess) -> None:
        return await self._track_write("UpdateMissionSuccess", self._repo.update_mission_success, self._cache.mission_success_cache.clear, success)

    @fallback_on_error(None)
    async def update_day_brief(self, brief: DayBrief) -> None:
        return await self._track_write("UpdateDayBrief", self._repo.update_day_brief, self._cache.day_brief_cache.clear, brief)

    @fallback_on_error(None)
    async def update_timeline(self, timeline: list[TimeBlock]) -> None:
        return await self._track_write("UpdateTimeline", self._repo.update_timeline, self._cache.invalidate_timeline, timeline)

    @fallback_on_error(None)
    async def update_recommendations(self, recs: list[AIRecommendation]) -> None:
        return await self._track_write("UpdateRecommendations", self._repo.update_recommendations, self._cache.invalidate_recommendations, recs)

    @fallback_on_error(None)
    async def update_calendar_events(self, events: list[CalendarEvent]) -> None:
        return await self._track_write("UpdateCalendarEvents", self._repo.update_calendar_events, self._cache.invalidate_calendar, events)

    @fallback_on_error(None)
    async def get_calendar_credentials(self) -> CalendarCredentials | None:
        return await self._track_read("CalendarCredentials", self._cache.calendar_credentials_cache, "calendar_creds", self._repo.get_calendar_credentials)

    @fallback_on_error(None)
    async def update_calendar_credentials(self, creds: CalendarCredentials) -> None:
        return await self._track_write("UpdateCalendarCredentials", self._repo.update_calendar_credentials, self._cache.calendar_credentials_cache.clear, creds)

    @fallback_on_error(None)
    async def update_recovery_plan(self, plan: RecoveryPlan) -> None:
        return await self._track_write("UpdateRecoveryPlan", self._repo.update_recovery_plan, self._cache.invalidate_recovery, plan)

    @fallback_on_error(None)
    async def update_pipeline(self, state: AgentPipelineState) -> None:
        return await self._track_write("UpdatePipeline", self._repo.update_pipeline, self._cache.agent_status_cache.clear, state)

    @fallback_on_error(None)
    async def get_planner_cache(self, mission_id: str) -> dict | None:
        return self._repo.get_planner_cache(mission_id)

    @fallback_on_error(None)
    async def set_planner_cache(self, mission_id: str, data: dict) -> None:
        self._repo.set_planner_cache(mission_id, data)

    @fallback_on_error(None)
    async def get_orchestrator_cache(self, mission_id: str) -> dict | None:
        return self._repo.get_orchestrator_cache(mission_id)

    @fallback_on_error(None)
    async def set_orchestrator_cache(self, mission_id: str, data: dict) -> None:
        self._repo.set_orchestrator_cache(mission_id, data)

    @fallback_on_error(None)
    async def get_user_profile(self, uid: str) -> UserProfile | None:
        return await self._track_read(f"UserProfile_{uid}", self._cache.user_profile_cache, f"profile_{uid}", self._repo.get_user_profile, uid)

    @fallback_on_error(lambda: UserProfile(uid="fallback", display_name="Fallback Mode", email="quota@exceeded", provider="none"))
    async def get_active_user_profile(self) -> UserProfile:
        return await self._track_read("ActiveUserProfile", self._cache.user_profile_cache, "active_profile", self._repo.get_active_user_profile)

    @fallback_on_error(None)
    async def update_user_profile(self, profile: UserProfile) -> None:
        return await self._track_write("UpdateUserProfile", self._repo.update_user_profile, self._cache.user_profile_cache.clear, profile)

    # -------------------------------------------------------------------------
    # Memory CRUD
    # -------------------------------------------------------------------------

    @fallback_on_error(None)
    async def add_memory(self, memory: MemoryItem) -> None:
        return await self._track_write("AddMemory", self._repo.add_memory, self._cache.memory_cache.clear, memory)

    @fallback_on_error(None)
    async def add_agent_activity(self, activity: AgentActivity) -> None:
        return await self._track_write("AddAgentActivity", self._repo.add_agent_activity, self._cache.agent_activities_cache.clear, activity)

    @fallback_on_error(list)
    async def get_memories(self, limit: int = 100, min_importance: float = 0.0) -> list[MemoryItem]:
        return await self._track_read(f"Memories_{limit}_{min_importance}", self._cache.memory_cache, f"memories_{limit}_{min_importance}", self._repo.get_memories, limit, min_importance)

    # -------------------------------------------------------------------------
    # Health
    # -------------------------------------------------------------------------

    @fallback_on_error(lambda: {"status": "error", "detail": "Quota Exceeded"})
    async def health(self) -> dict[str, str]:
        if not self._configured:
            return {
                "status": "mock",
                "detail": "Running with in-memory fallback",
            }
        return {
            "status": "configured",
            "detail": "Firebase credentials present — ready for Phase 3",
        }


# =============================================================================
# Singleton
# =============================================================================

_firestore_service: FirestoreService | None = None


def get_firestore_service() -> FirestoreService:
    """Get or create the singleton FirestoreService instance."""
    global _firestore_service  # noqa: PLW0603
    if _firestore_service is None:
        _firestore_service = FirestoreService()
    return _firestore_service

