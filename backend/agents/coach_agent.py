# =============================================================================
# Kairos One — Coach Agent
# Analyzes productivity patterns and generates behavioral insights.
# =============================================================================

import os
import time

from schemas.agent import AgentActivity, AgentState, AgentStatusType, AgentType
from schemas.agent_io import CoachOutput, AgentContext
from schemas.mission import MissionNode
from services.logging_service import AgentExecutionLogger, get_logger
from services.memory_service import get_memory_service

logger = get_logger("agent.coach")


class CoachAgent:
    def __init__(self) -> None:
        self._execution_logger = AgentExecutionLogger()
        self._memory = get_memory_service()
        self._agent_type = AgentType.COACH
        
    async def build_context(self, mission: MissionNode, context: AgentContext = None) -> str:
        """Gathers context for the orchestrator prompt."""
        memory_context = await self._memory.build_context(self._agent_type.value, query=mission.name)
        from services.firestore_service import get_firestore_service
        firestore = get_firestore_service()
        user_profile = await firestore.get_active_user_profile()
        settings = user_profile.settings
        efficiency = self._calculate_efficiency(mission)
        
        # Explicitly fetch recent memories to guarantee personalized insights (accepted/dismissed recs, etc.)
        recent_memories = await firestore.get_memories(limit=25)
        memory_text = "\n".join([f"- [{m.type}] {m.content}" for m in recent_memories])

        prompt = (
            f"--- COACH CONTEXT ---\n"
            f"Mission: {mission.name}\n"
            f"Efficiency: {efficiency}%\n"
            f"Actual vs Estimated: {mission.actual_hours}h / {mission.estimated_hours}h\n"
            f"User Settings: Working Hours {settings.working_hours_start}-{settings.working_hours_end}, Deep Work: {settings.deep_work_duration_minutes}m, Breaks: {settings.break_duration_minutes}m\n"
            f"General Context:\n{memory_context}\n\n"
            f"Raw AI Memories (Habits, Recs, Feedback):\n{memory_text}\n"
        )
        return prompt

    async def process_output(self, context: "PipelineContext", output: CoachOutput, duration_ms: float) -> tuple[AgentState, AgentActivity]:
        """Apply side effects based on the orchestrator's unified response slice."""
        self._execution_logger.agent_started(self._agent_type, context.mission.id)

        # 3. Create Activity
        activity = AgentActivity(
            id=f"aa-coach-{int(time.time() * 1000)}",
            agent=self._agent_type,
            action=output.action,
            impact=output.impact,
            reasoning=output.reasoning,
            timestamp=_iso_now(),
            related_mission_id=context.mission.id,
        )
        context.activities.append(activity)
        context.reflections.append(output.reflection)

        # 4. Create State
        result_text = f"Analyzed patterns. {output.impact}"
        state = AgentState(
            type=self._agent_type,
            status=AgentStatusType.FINISHED,
            current_action="",
            result=result_text,
            confidence=getattr(output, "confidence", 92.5),
            execution_duration_ms=duration_ms,
            started_at=_iso_now(),
            completed_at=_iso_now(),
        )

        self._execution_logger.agent_completed(self._agent_type, context.mission.id, duration_ms, output.impact)

        return state, activity

    async def status(self) -> AgentState:
        return AgentState(
            type=self._agent_type,
            status=AgentStatusType.IDLE,
            current_action="",
            result="",
            started_at=None,
            completed_at=None,
        )

    def _calculate_efficiency(self, mission: MissionNode) -> float:
        if mission.actual_hours <= 0:
            return 0.0
        expected_progress = (mission.actual_hours / mission.estimated_hours) * 100
        if expected_progress <= 0:
            return 0.0
        efficiency = (mission.completion_percentage / expected_progress) * 100
        return round(min(100, max(0, efficiency)), 1)


def _iso_now() -> str:
    from utils.helpers import iso_now
    return iso_now()

