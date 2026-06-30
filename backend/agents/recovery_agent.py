# =============================================================================
# Kairos One — Recovery Agent
# Generates recovery plans when tasks are missed or deadlines are at risk.
# =============================================================================

import os
import time

from schemas.agent import AgentActivity, AgentState, AgentStatusType, AgentType
from schemas.agent_io import RecoveryOutput, AgentContext
from schemas.mission import MissionNode
from services.logging_service import AgentExecutionLogger, get_logger
from services.memory_service import get_memory_service

logger = get_logger("agent.recovery")


class RecoveryAgent:
    def __init__(self) -> None:
        self._execution_logger = AgentExecutionLogger()
        self._memory = get_memory_service()
        self._agent_type = AgentType.RECOVERY
        
    async def build_context(self, mission: MissionNode | None = None, trigger: str = "general", context: AgentContext = None) -> str:
        """Gathers context for the orchestrator prompt."""
        from services.firestore_service import get_firestore_service
        firestore = get_firestore_service()
        user_profile = await firestore.get_active_user_profile()
        settings = user_profile.settings

        memory_context = await self._memory.build_context(self._agent_type.value, query=trigger)

        prompt = (
            f"--- RECOVERY CONTEXT ---\n"
            f"Trigger: {trigger}\n"
            f"User Settings: Working Hours {settings.working_hours_start}-{settings.working_hours_end}, Deep Work: {settings.deep_work_duration_minutes}m, Breaks: {settings.break_duration_minutes}m\n"
            f"AI Memory Context:\n{memory_context}\n"
        )
        if mission:
            remaining = mission.estimated_hours - mission.actual_hours
            prompt += (
                f"Mission Focus: {mission.name}\n"
                f"Progress: {mission.completion_percentage}%\n"
                f"Remaining Work: {remaining:.1f}h\n"
            )
        return prompt

    async def process_output(self, context: "PipelineContext", trigger: str, output: RecoveryOutput, duration_ms: float) -> tuple[AgentState, AgentActivity]:
        """Apply side effects based on the orchestrator's unified response slice."""
        m_id = context.mission.id if context.mission else "global"
        self._execution_logger.agent_started(self._agent_type, m_id)

        # 3. Create Activity
        activity = AgentActivity(
            id=f"aa-recovery-{int(time.time() * 1000)}",
            agent=self._agent_type,
            action=output.action,
            impact=output.impact,
            reasoning=output.reasoning,
            timestamp=_iso_now(),
            related_mission_id=m_id if m_id != "global" else None,
        )
        context.activities.append(activity)
        context.reflections.append(output.reflection)

        # 4. Create State
        result_text = f"{len(output.execution_plan)} recovery actions proposed. {output.impact}"
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

        self._execution_logger.agent_completed(self._agent_type, m_id, duration_ms, output.impact)

        # 6. Actually rebuild schedule & create RecoveryPlan
        from schemas.timeline import RecoveryPlan, RecoveryChange, TimeBlockStatus
        from schemas.agent import AgentPipelineState
        
        original_timeline = list(context.timeline)
        recovered_timeline = []
        changes = []
        
        # Simple simulated recovery: move everything missed to scheduled
        for block in original_timeline:
            new_block = block.model_copy(deep=True)
            if new_block.status == TimeBlockStatus.MISSED:
                new_block.status = TimeBlockStatus.SCHEDULED
                changes.append(RecoveryChange(
                    type="rescheduled",
                    description=f"Rescheduled {new_block.title}",
                    before="Missed",
                    after="Scheduled"
                ))
                # Sync back to Calendar is skipped in fast-path
            recovered_timeline.append(new_block)
            
        context.timeline = recovered_timeline
        
        old_score = context.mission_success.overall_score if context.mission_success else 100
        new_score = max(0, old_score - 2) # Minor penalty for missing/recovering
        
        if context.mission_success:
            context.mission_success.overall_score = new_score
            context.mission_success.delta = new_score - old_score
            context.add_mutation("update", "dashboard", "mission_success", context.mission_success.model_dump(by_alias=False))

        plan = RecoveryPlan(
            id=f"rec-{int(time.time()*1000)}",
            trigger=trigger,
            original_timeline=original_timeline,
            recovered_timeline=recovered_timeline,
            mission_success_before=old_score,
            mission_success_after=new_score,
            changes=changes,
            explanation=output.recovery_explanation,
            agent_pipeline=AgentPipelineState(agents=[], is_running=False, trigger="")
        )
        context.add_mutation("update", "dashboard", "recovery_plan", plan.model_dump(by_alias=False))

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


def _iso_now() -> str:
    from utils.helpers import iso_now
    return iso_now()

