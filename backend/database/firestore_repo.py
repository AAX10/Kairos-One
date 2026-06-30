# =============================================================================
# Kairos One — Firestore Repository
# Implements the same interface as InMemoryRepository using Google Cloud Firestore.
# =============================================================================

import json
from copy import deepcopy
from typing import Any

import firebase_admin
from firebase_admin import credentials, firestore

from config import get_settings
from schemas.agent import AgentActivity, AgentPipelineState
from schemas.dashboard import AIRecommendation, CoachInsight, DayBrief
from schemas.mission import CreateMissionInput, MissionNode, MissionNodeStatus, MissionNodeType, MissionSuccess
from schemas.timeline import IntegrationStatus, RecoveryPlan, TimeBlock, CalendarEvent, CalendarCredentials
from schemas.memory import MemoryItem
from schemas.user import UserProfile
from services.logging_service import get_logger
from utils.helpers import iso_now, generate_id
from utils.credentials_helper import serialize_credentials, deserialize_credentials

logger = get_logger("firestore_repo")


class FirestoreRepository:
    """Firestore data store implementing the same interface as InMemoryRepository.
    
    Uses Firebase Admin SDK to interact with Google Cloud Firestore.
    Ensures initialization exactly once.
    """

    def __init__(self) -> None:
        if not firebase_admin._apps:
            logger.error("Firebase Admin SDK is not initialized! Ensure main.py initializes it.")
            raise RuntimeError("Firebase Admin SDK not initialized")
            
        self.db = firestore.client()
        logger.info("FirestoreRepository connected to Firestore.")

    # -------------------------------------------------------------------------

    def _get_collection(self, name: str):
        from utils.context import current_user_id
        uid = current_user_id.get()
        return self.db.collection('users').document(uid).collection(name)

    # -------------------------------------------------------------------------
    # Batch Commit
    # -------------------------------------------------------------------------
    
    def batch_commit(self, mutations: list[Any]) -> None:
        """Executes a list of deferred mutations in a single Firestore transaction/batch."""
        if not mutations:
            return
            
        # Firestore batch allows up to 500 operations. If more, we should chunk,
        # but for this pipeline, we expect far fewer than 500.
        batch = self.db.batch()
        for mut in mutations:
            doc_ref = self._get_collection(mut.collection).document(mut.doc_id)
            if mut.operation == "create" or mut.operation == "update":
                batch.set(doc_ref, mut.data, merge=(mut.operation == "update"))
            elif mut.operation == "delete":
                batch.delete(doc_ref)
        batch.commit()
        logger.info(f"Batched commit of {len(mutations)} operations completed.")

    # -------------------------------------------------------------------------
    # Mission CRUD
    # -------------------------------------------------------------------------

    def get_top_level_missions(self) -> list[MissionNode]:
        docs = self._get_collection("missions").where("type", "==", "mission").stream()
        return [MissionNode.model_validate(doc.to_dict()) for doc in docs]

    def get_all_missions(self) -> list[MissionNode]:
        docs = self._get_collection("missions").stream()
        return [MissionNode.model_validate(doc.to_dict()) for doc in docs]

    def get_mission_by_id(self, mission_id: str) -> MissionNode | None:
        doc = self._get_collection("missions").document(mission_id).get()
        if doc.exists:
            return MissionNode.model_validate(doc.to_dict())
        return None

    def get_mission_children(self, mission_id: str) -> list[MissionNode]:
        docs = self._get_collection("missions").where("parent_id", "==", mission_id).stream()
        return [MissionNode.model_validate(doc.to_dict()) for doc in docs]

    def create_mission(self, input_data: CreateMissionInput) -> MissionNode:
        mission_id = generate_id("mission")
        new_mission = MissionNode(
            id=mission_id,
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
        self._get_collection("missions").document(mission_id).set(new_mission.model_dump(mode="json", by_alias=False))
        return new_mission

    def update_mission(self, mission_id: str, updates: dict[str, Any]) -> MissionNode | None:
        doc_ref = self._get_collection("missions").document(mission_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        
        current_data = doc.to_dict()
        current_data.update(updates)
        updated_mission = MissionNode.model_validate(current_data)
        doc_ref.set(updated_mission.model_dump(mode="json", by_alias=False))
        return updated_mission

    def delete_mission(self, mission_id: str) -> bool:
        # Delete children
        children = self._get_collection("missions").where("parent_id", "==", mission_id).stream()
        batch = self.db.batch()
        for child in children:
            batch.delete(child.reference)
        # Delete mission
        batch.delete(self._get_collection("missions").document(mission_id))
        batch.commit()
        return True

    # -------------------------------------------------------------------------
    # Milestone CRUD
    # -------------------------------------------------------------------------

    def create_milestone(self, mission_id: str, title: str) -> Any:
        from schemas.milestone import Milestone, MilestoneStatus
        m_id = generate_id("milestone")
        milestone = Milestone(
            id=m_id,
            mission_id=mission_id,
            title=title,
            status=MilestoneStatus.PENDING,
            created_at=iso_now()
        )
        self._get_collection("milestones").document(m_id).set(milestone.model_dump(mode="json", by_alias=False))
        return milestone

    def get_milestones(self, mission_id: str) -> list[Any]:
        from schemas.milestone import Milestone
        docs = self._get_collection("milestones").where("mission_id", "==", mission_id).stream()
        return [Milestone.model_validate(doc.to_dict()) for doc in docs]

    def update_milestone(self, milestone_id: str, updates: dict[str, Any]) -> Any | None:
        from schemas.milestone import Milestone
        doc_ref = self._get_collection("milestones").document(milestone_id)
        doc = doc_ref.get()
        if not doc.exists:
            return None
        current_data = doc.to_dict()
        current_data.update(updates)
        updated_milestone = Milestone.model_validate(current_data)
        doc_ref.set(updated_milestone.model_dump(mode="json", by_alias=False))
        return updated_milestone

    # -------------------------------------------------------------------------
    # Dashboard Data
    # -------------------------------------------------------------------------

    def get_mission_success(self) -> MissionSuccess:
        doc = self._get_collection("dashboard").document("mission_success").get()
        if doc.exists:
            return MissionSuccess.model_validate(doc.to_dict())
        # Return fallback if not seeded
        return MissionSuccess(
            overall_score=0, confidence=0, delta=0, risk=0, trend="stable",
            reasoning=["No missions active. Create a mission to generate success metrics."], per_mission_scores=[], last_calculated_at=iso_now()
        )

    def get_day_brief(self) -> DayBrief:
        doc = self._get_collection("dashboard").document("day_brief").get()
        if doc.exists:
            return DayBrief.model_validate(doc.to_dict())
        return DayBrief(
            greeting="Welcome to Kairos One Mission Control.",
            todays_focus="Create a mission to initialize the autonomous AI pipeline.",
            critical_mission="None active", highest_risk="None",
            deep_work_recommendation="Awaiting calendar sync and mission creation.",
            expected_productivity="Pending Analysis", completion_estimate="Pending Analysis",
            upcoming_deadlines="No immediate deadlines."
        )

    def get_timeline(self) -> list[TimeBlock]:
        docs = self._get_collection("timeline").stream()
        return [TimeBlock.model_validate(doc.to_dict()) for doc in docs]

    def get_agent_activities(self) -> list[AgentActivity]:
        docs = self._get_collection("activities").order_by("timestamp", direction=firestore.Query.DESCENDING).stream()
        return [AgentActivity.model_validate(doc.to_dict()) for doc in docs]

    def add_agent_activity(self, activity: AgentActivity) -> None:
        doc_ref = self._get_collection("activities").document(activity.id)
        doc_ref.set(activity.model_dump(mode="json", by_alias=False))

    def get_calendar_events(self) -> list[CalendarEvent]:
        docs = self._get_collection("calendar_events").stream()
        return [CalendarEvent.model_validate(doc.to_dict()) for doc in docs]

    def get_recommendations(self) -> list[AIRecommendation]:
        docs = self._get_collection("recommendations").stream()
        return [AIRecommendation.model_validate(doc.to_dict()) for doc in docs]

    def get_coach_insights(self) -> list[CoachInsight]:
        doc = self._get_collection("dashboard").document("coach_insights").get()

        if doc.exists:
            data = doc.to_dict()
            if "insights" in data:
                return [CoachInsight.model_validate(i) for i in data["insights"]]
        return []

    def get_integrations(self) -> list[IntegrationStatus]:
        docs = self._get_collection("integrations").stream()
        results = [IntegrationStatus.model_validate(doc.to_dict()) for doc in docs]
        if not results:
            from schemas.timeline import IntegrationService, IntegrationStatusType
            results = [
                IntegrationStatus(service=IntegrationService.GEMINI, status=IntegrationStatusType.CONNECTED, last_sync=iso_now(), detail="Gemini 2.5 Flash active"),
                IntegrationStatus(service=IntegrationService.CALENDAR, status=IntegrationStatusType.PENDING, last_sync=iso_now(), detail="Ready for sync"),
            ]
            
        def sort_key(i: IntegrationStatus) -> int:
            if i.service == "gemini":
                return 0
            if i.service == "calendar":
                return 1
            return 2
            
        results.sort(key=sort_key)
        return results

    def update_integrations(self, integrations: list[IntegrationStatus]) -> None:
        batch = self.db.batch()
        integrations_ref = self._get_collection("integrations")
        for doc in integrations_ref.list_documents():
            batch.delete(doc)
        for i in integrations:
            doc_ref = integrations_ref.document(i.id if hasattr(i, 'id') else i.service)
            batch.set(doc_ref, i.model_dump(mode="json", by_alias=False))
        batch.commit()

    def update_pipeline(self, state: AgentPipelineState) -> None:
        self._get_collection("pipeline").document("state").set(state.model_dump(mode="json", by_alias=False))

    def get_pipeline(self) -> AgentPipelineState:
        doc = self._get_collection("pipeline").document("state").get()
        if doc.exists:
            return AgentPipelineState.model_validate(doc.to_dict())
        # Fallback state
        from schemas.agent import AgentState, AgentType, AgentStatusType
        return AgentPipelineState(
            agents=[
                AgentState(type=AgentType.PLANNER, status=AgentStatusType.IDLE, current_action="", result="", started_at=None, completed_at=None),
                AgentState(type=AgentType.SCHEDULER, status=AgentStatusType.IDLE, current_action="", result="", started_at=None, completed_at=None),
                AgentState(type=AgentType.RISK, status=AgentStatusType.IDLE, current_action="", result="", started_at=None, completed_at=None),
                AgentState(type=AgentType.RECOVERY, status=AgentStatusType.IDLE, current_action="", result="", started_at=None, completed_at=None),
                AgentState(type=AgentType.COACH, status=AgentStatusType.IDLE, current_action="", result="", started_at=None, completed_at=None),
            ],
            is_running=False, trigger=""
        )

    def get_recovery_plan(self) -> RecoveryPlan:
        doc = self._get_collection("recovery").document("plan").get()
        if doc.exists:
            return RecoveryPlan.model_validate(doc.to_dict())
        return RecoveryPlan(
            id="recovery-empty", trigger="", original_timeline=[], recovered_timeline=[],
            mission_success_before=0, mission_success_after=0, changes=[],
            explanation="No active recovery plan.", agent_pipeline=self.get_pipeline()
        )

    def get_user_profile(self, uid: str) -> UserProfile | None:
        doc = self.db.collection("users").document(uid).get()
        if doc.exists:
            return UserProfile.model_validate(doc.to_dict())
        return None

    def get_active_user_profile(self) -> UserProfile:
        from utils.context import current_user_id
        uid = current_user_id.get()
        doc = self.db.collection("users").document(uid).get()
        if doc.exists:
            return UserProfile.model_validate(doc.to_dict())
        return UserProfile(uid=uid, display_name="Unknown User", email="unknown@example.com", provider="firebase")

    # -------------------------------------------------------------------------
    # Updates
    # -------------------------------------------------------------------------

    def update_user_profile(self, profile: UserProfile) -> None:
        self._get_collection("users").document(profile.uid).set(profile.model_dump(mode="json", by_alias=False))

    def update_mission_success(self, success: MissionSuccess) -> None:
        self._get_collection("dashboard").document("mission_success").set(success.model_dump(mode="json", by_alias=False))

    def update_day_brief(self, brief: DayBrief) -> None:
        self._get_collection("dashboard").document("day_brief").set(brief.model_dump(mode="json", by_alias=False))

    def update_timeline(self, timeline: list[TimeBlock]) -> None:
        # Delete existing timeline docs first to mimic overwrite behavior
        docs = self._get_collection("timeline").stream()
        batch = self.db.batch()
        for doc in docs:
            batch.delete(doc.reference)
        # Add new timeline
        for block in timeline:
            doc_ref = self._get_collection("timeline").document(block.id)
            batch.set(doc_ref, block.model_dump(mode="json", by_alias=False))
        batch.commit()

    def update_recommendations(self, recs: list[AIRecommendation]) -> None:
        docs = self._get_collection("recommendations").stream()
        batch = self.db.batch()
        for doc in docs:
            batch.delete(doc.reference)
        for rec in recs:
            doc_ref = self._get_collection("recommendations").document(rec.id)
            batch.set(doc_ref, rec.model_dump(mode="json", by_alias=False))
        batch.commit()

    def update_calendar_events(self, events: list[CalendarEvent]) -> None:
        batch = self.db.batch()
        events_ref = self._get_collection("calendar_events")
        
        # Clear existing
        for doc in events_ref.list_documents():
            batch.delete(doc)
            
        # Write new
        for event in events:
            doc_ref = events_ref.document(event.id)
            batch.set(doc_ref, event.model_dump(by_alias=True))
            
        batch.commit()

    def get_calendar_credentials(self) -> CalendarCredentials | None:
        doc = self._get_collection("calendar_credentials").document("default").get()
        if doc.exists:
            return deserialize_credentials(doc.to_dict())
        return None


    def delete_calendar_credentials(self) -> None:
        self._get_collection('calendar_credentials').document('default').delete()

    def update_calendar_credentials(self, creds: CalendarCredentials) -> None:
        self._get_collection("calendar_credentials").document("default").set(
            serialize_credentials(creds)
        )

    def update_recovery_plan(self, plan: RecoveryPlan) -> None:
        doc_ref = self._get_collection("dashboard").document("recovery_plan")
        doc_ref.set(plan.model_dump(mode="json", by_alias=False))

    def get_planner_cache(self, mission_id: str) -> dict | None:
        doc = self._get_collection("agent_cache").document(f"planner_{mission_id}").get()
        return doc.to_dict() if doc.exists else None

    def set_planner_cache(self, mission_id: str, data: dict) -> None:
        self._get_collection("agent_cache").document(f"planner_{mission_id}").set(data)

    def get_orchestrator_cache(self, mission_id: str) -> dict | None:
        doc = self._get_collection("agent_cache").document(f"orchestrator_{mission_id}").get()
        return doc.to_dict() if doc.exists else None

    def set_orchestrator_cache(self, mission_id: str, data: dict) -> None:
        self._get_collection("agent_cache").document(f"orchestrator_{mission_id}").set(data)

    # -------------------------------------------------------------------------
    # Memory CRUD
    # -------------------------------------------------------------------------

    def add_memory(self, memory: MemoryItem) -> None:
        doc_ref = self._get_collection("memories").document(memory.id)
        doc_ref.set(memory.model_dump(by_alias=True))

    def get_memories(self, limit: int = 100, min_importance: float = 0.0) -> list[MemoryItem]:
        docs = (
            self._get_collection("memories")
            .where("importanceScore", ">=", min_importance)
            .order_by("importanceScore", direction="DESCENDING")
            .limit(limit)
            .stream()
        )
        memories: list[MemoryItem] = []

        for doc in docs:
            data = doc.to_dict()
            if data is None:
                continue
            memories.append(MemoryItem(**data))
        
        # Sort locally to bypass composite index requirement
        memories.sort(key=lambda m: (m.importance_score, m.timestamp), reverse=True)
        
        return memories

# =============================================================================
# Singleton
# =============================================================================

_firestore_repository: FirestoreRepository | None = None

def get_firestore_repository() -> FirestoreRepository:
    """Get or create the singleton repository instance."""
    global _firestore_repository
    if _firestore_repository is None:
        _firestore_repository = FirestoreRepository()
    return _firestore_repository

