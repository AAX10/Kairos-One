# =============================================================================
# Kairos One — Risk Agent
# Assesses deadline risks and calculates completion probabilities.
# =============================================================================

import os
import time

from schemas.agent import AgentActivity, AgentState, AgentStatusType, AgentType
from schemas.agent_io import RiskOutput, AgentContext
from schemas.dashboard import RiskAssessment
from schemas.mission import MissionNode
from services.logging_service import AgentExecutionLogger, get_logger
from services.memory_service import get_memory_service

logger = get_logger("agent.risk")


class RiskAgent:
    def __init__(self) -> None:
        self._execution_logger = AgentExecutionLogger()
        self._memory = get_memory_service()
        self._agent_type = AgentType.RISK
        
    async def build_context(self, mission: MissionNode, trigger: str = "", context: AgentContext = None) -> str:
        """Gathers context for the orchestrator prompt."""
        memory_context = await self._memory.build_context(self._agent_type.value, query=mission.name)
        from services.firestore_service import get_firestore_service
        firestore = get_firestore_service()
        user_profile = await firestore.get_active_user_profile()
        settings = user_profile.settings

        prompt = (
            f"--- RISK CONTEXT ---\n"
            f"Mission: {mission.name}\n"
            f"Progress: {mission.completion_percentage}%\n"
            f"Actual vs Estimated: {mission.actual_hours}h / {mission.estimated_hours}h\n"
            f"Deadline: {mission.deadline}\n"
            f"Status: {mission.status}\n"
            f"Trigger Reason: {trigger}\n"
            f"User Settings: Working Hours {settings.working_hours_start}-{settings.working_hours_end}, Deep Work: {settings.deep_work_duration_minutes}m, Breaks: {settings.break_duration_minutes}m\n"
            f"AI Memory Context:\n{memory_context}\n"
        )
        return prompt

    async def process_output(self, context: "PipelineContext", output: RiskOutput, duration_ms: float) -> tuple[AgentState, AgentActivity, RiskAssessment]:
        """Apply side effects based on the orchestrator's unified response slice."""
        self._execution_logger.agent_started(self._agent_type, context.mission.id)

        # 3. Create Activity
        activity = AgentActivity(
            id=f"aa-risk-{int(time.time() * 1000)}",
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
        risk_level = "low" if output.completion_probability > 75 else "high"
        result_text = f"Prob: {output.completion_probability}% ({risk_level} risk). {output.impact}"
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

        # 5. Create Risk Assessment
        assessment = RiskAssessment(
            mission_id=context.mission.id,
            mission_name=context.mission.name,
            completion_probability=output.completion_probability,
            risk_level=risk_level,
            risk_factors=output.risk_factors,
            recommended_actions=output.critical_bottlenecks,
        )
        context.risk_assessment = assessment

        # 6. Log and Store Memory & Reflection
        self._execution_logger.agent_completed(self._agent_type, context.mission.id, duration_ms, output.impact)

        return state, activity, assessment

    async def status(self) -> AgentState:
        return AgentState(
            type=self._agent_type,
            status=AgentStatusType.IDLE,
            current_action="",
            result="",
            started_at=None,
            completed_at=None,
        )


def _iso_now() -> str:
    from utils.helpers import iso_now
    return iso_now()

