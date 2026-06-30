# =============================================================================
# Kairos One — Planner Agent
# Analyzes mission requirements and creates subtask dependency graphs.
# =============================================================================

import os
import time

from schemas.agent import AgentActivity, AgentState, AgentStatusType, AgentType
from schemas.agent_io import PlannerOutput, AgentContext, PlannerSubtask
from schemas.mission import MissionNode
from services.logging_service import AgentExecutionLogger, get_logger
from services.memory_service import get_memory_service

logger = get_logger("agent.planner")


class PlannerAgent:
    def __init__(self) -> None:
        self._execution_logger = AgentExecutionLogger()
        self._memory = get_memory_service()
        self._agent_type = AgentType.PLANNER
        
    async def build_context(self, mission: MissionNode) -> str:
        """Gathers context for the orchestrator prompt."""
        context = await self._memory.build_context(self._agent_type.value, query=mission.name)
        from services.firestore_service import get_firestore_service
        firestore = get_firestore_service()
        user_profile = await firestore.get_active_user_profile()
        settings = user_profile.settings
        
        all_missions = await firestore.get_all_missions()
        tasks = [m for m in all_missions if m.type == "task"]
        completed_tasks = [t for t in tasks if t.status == "completed"]
        completion_rate = round(len(completed_tasks) / len(tasks) * 100) if tasks else 0

        completed_tasks_text = ""
        if completed_tasks:
            completed_tasks_text = "Completed Tasks (DO NOT REGENERATE THESE):\n" + "\n".join([f"- {t.name}" for t in completed_tasks]) + "\n"

        prompt = (
            f"--- PLANNER CONTEXT ---\n"
            f"Mission: {mission.name}\n"
            f"Description: {mission.description}\n"
            f"Estimated Hours: {mission.estimated_hours}\n"
            f"Deadline: {mission.deadline}\n"
            f"Priority: {mission.priority}\n"
            f"User Settings: Working Hours {settings.working_hours_start}-{settings.working_hours_end}, Deep Work: {settings.deep_work_duration_minutes}m, Breaks: {settings.break_duration_minutes}m\n"
            f"Historical Completion Rate: {completion_rate}%. Adjust estimates based on user history.\n"
            f"{completed_tasks_text}"
            f"AI Memory Context:\n{context}\n"
        )
        return prompt

    async def process_output(self, context: "PipelineContext", output: PlannerOutput, duration_ms: float) -> tuple[AgentState, AgentActivity]:
        """Apply side effects based on the orchestrator's unified response slice."""
        self._execution_logger.agent_started(self._agent_type, context.mission.id)

        # 3. Create Activity
        activity = AgentActivity(
            id=f"aa-planner-{int(time.time() * 1000)}",
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
        result_text = f"Parsed {context.mission.name}, {len(output.tasks)} subtasks. {output.impact}"
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

        # 6. Save Subtasks to PipelineContext (Dependency Graph)
        from schemas.mission import CreateMissionInput, MissionNode, MissionNodeType, MissionNodeStatus
        from utils.helpers import generate_id
        
        existing_children = [m for m in context.all_missions if m.parent_id == context.mission.id]
        name_to_id = {}
        for child in existing_children:
            if child.status != "completed":
                context.add_mutation("delete", "missions", child.id)
                context.all_missions = [m for m in context.all_missions if m.id != child.id]
            else:
                name_to_id[child.name] = child.id
            
        child_nodes = []
        for st in output.tasks:
            child_id = generate_id("mission")
            child_node = MissionNode(
                id=child_id,
                name=st.name,
                description=st.description,
                type=MissionNodeType.TASK,
                status=MissionNodeStatus.PENDING,
                priority=st.priority,
                deadline=context.mission.deadline,
                created_at=_iso_now(),
                estimated_hours=st.estimated_hours,
                actual_hours=0,
                children=[],
                dependencies=[],
                completion_percentage=0,
                contribution_to_success=0,
                assigned_agent="planner",
                color="#60a5fa",
            )
            name_to_id[st.name] = child_node.id
            child_nodes.append((child_node, st))
            
        for child_node, st in child_nodes:
            is_critical = st.name in output.critical_path
            
            mapped_dependencies = []
            for dep_name in st.dependencies:
                if dep_name in name_to_id:
                    mapped_dependencies.append(name_to_id[dep_name])
            
            child_node.parent_id = context.mission.id
            child_node.dependencies = mapped_dependencies
            child_node.critical_path = is_critical
            child_node.category = getattr(st, "category", None)
            child_node.status = MissionNodeStatus.BLOCKED if mapped_dependencies else MissionNodeStatus.PENDING
            
            context.all_missions.append(child_node)
            context.add_mutation("create", "missions", child_node.id, child_node.model_dump(by_alias=False))

        # Save Milestones
        milestone_ids = []
        from schemas.milestone import Milestone, MilestoneStatus
        for m_title in output.milestones:
            m_id = generate_id("milestone")
            milestone = Milestone(
                id=m_id,
                mission_id=context.mission.id,
                title=m_title,
                status=MilestoneStatus.PENDING,
                created_at=_iso_now()
            )
            context.add_mutation("create", "milestones", m_id, milestone.model_dump(by_alias=False))
            milestone_ids.append(m_id)

        # 7. Update Parent Mission
        context.mission.project_classification = getattr(output, "classification", None)
        context.mission.complexity_score = getattr(output, "mission_complexity_score", 50)
        context.mission.estimated_hours = getattr(output, "estimated_project_hours", context.mission.estimated_hours)
        if hasattr(context.mission, "milestones"):
            context.mission.milestones = milestone_ids
            
        context.add_mutation("update", "missions", context.mission.id, {
            "project_classification": context.mission.project_classification,
            "complexity_score": context.mission.complexity_score,
            "estimated_hours": context.mission.estimated_hours,
            "milestones": milestone_ids,
        })
        
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

