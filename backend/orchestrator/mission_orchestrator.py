import asyncio
import time
import hashlib
import json
from datetime import datetime

from agents.coach_agent import CoachAgent
from agents.planner_agent import PlannerAgent
from agents.recovery_agent import RecoveryAgent
from agents.risk_agent import RiskAgent
from agents.scheduler_agent import SchedulerAgent
from schemas.agent import (
    AgentActivity,
    AgentPipelineState,
    AgentState,
    AgentStatusType,
    AgentType,
)
from schemas.dashboard import RiskAssessment
from schemas.mission import MissionNode
from schemas.agent_io import AgentContext, OrchestratorOutput
from services.firestore_service import get_firestore_service
from services.gemini_service import get_gemini_service
from services.logging_service import AgentExecutionLogger, get_logger
from utils.helpers import iso_now

logger = get_logger("orchestrator")


class MissionOrchestrator:
    """Orchestrates the sequential execution of all five agents asynchronously via a single LLM request."""

    def __init__(self) -> None:
        self._planner = PlannerAgent()
        self._scheduler = SchedulerAgent()
        self._risk = RiskAgent()
        self._recovery = RecoveryAgent()
        self._coach = CoachAgent()
        self._execution_logger = AgentExecutionLogger()
        self._firestore = get_firestore_service()
        self._gemini = get_gemini_service()

        self._pipeline_state = AgentPipelineState(
            agents=self._create_idle_states(),
            is_running=False,
            trigger="",
        )
        self._activities: list[AgentActivity] = []
        self._active_tasks: dict[str, asyncio.Task] = {}

    def _create_idle_states(self) -> list[AgentState]:
        return [
            AgentState(type=AgentType.PLANNER, status=AgentStatusType.IDLE, current_action="", result=""),
            AgentState(type=AgentType.SCHEDULER, status=AgentStatusType.IDLE, current_action="", result=""),
            AgentState(type=AgentType.RISK, status=AgentStatusType.IDLE, current_action="", result=""),
            AgentState(type=AgentType.RECOVERY, status=AgentStatusType.IDLE, current_action="", result=""),
            AgentState(type=AgentType.COACH, status=AgentStatusType.IDLE, current_action="", result=""),
        ]

    def _update_agent_state(self, index: int, state: AgentState) -> None:
        self._pipeline_state.agents[index] = state

    def get_pipeline_state(self) -> AgentPipelineState:
        return self._pipeline_state

    def get_recent_activities(self) -> list[AgentActivity]:
        return self._activities

    def start_pipeline(self, mission: MissionNode | None = None, trigger: str = "Manual analysis") -> AgentPipelineState:
        """Kicks off the pipeline in the background and returns initial state."""
        mission_id = mission.id if mission else "global"
        
        if self._pipeline_state.is_running or mission_id in self._active_tasks:
            logger.info(f"Pipeline already running for {mission_id}. Ignoring duplicate trigger.")
            return self._pipeline_state

        self._pipeline_state.agents = self._create_idle_states()
        self._pipeline_state.is_running = True
        self._pipeline_state.trigger = trigger
        self._activities.clear()

        # Run in background without blocking
        task = asyncio.create_task(self._run_pipeline_async(mission, trigger))
        self._active_tasks[mission_id] = task
        
        # Cleanup callback
        task.add_done_callback(lambda t: self._active_tasks.pop(mission_id, None))
        
        return self._pipeline_state

    def _generate_cache_hash(self, mission: MissionNode, calendar_events: list, memories: list) -> str:
        """Generates a deterministic hash for caching based on relevant inputs."""
        hash_input = {
            "mission_id": mission.id,
            "updated_at": mission.updated_at,
            "estimated_hours": mission.estimated_hours,
            "actual_hours": mission.actual_hours,
            "status": mission.status,
            "calendar_ids": [e.id for e in calendar_events],
            "memory_ids": [m.id for m in memories]
        }
        hash_str = json.dumps(hash_input, sort_keys=True)
        return hashlib.sha256(hash_str.encode('utf-8')).hexdigest()

    def _get_mock_fallback(self, mission: MissionNode) -> OrchestratorOutput:
        from schemas.agent_io import PlannerOutput, PlannerSubtask, SchedulerOutput, ScheduleBlock, RiskOutput, RecoveryOutput, CoachOutput
        return OrchestratorOutput(
            planner=PlannerOutput(
                action=f"Analyzed requirements for {mission.name}",
                impact="Created mock subtask dependency graph",
                reasoning="Fallback logic triggered.",
                classification="General Project",
                estimated_project_hours=mission.estimated_hours,
                completion_probability=85,
                tasks=[PlannerSubtask(name="Phase 1", description="Initial execution.", estimated_hours=mission.estimated_hours, category="Execution", dependencies=[], priority="medium")],
                milestones=["Phase 1 Complete"],
                dependencies={"Phase 1": []},
                critical_path=["Phase 1"],
                suggested_schedule="Standard linear execution.",
                risks=["Standard execution risks."],
                difficulty_score=50,
                required_context=[],
                priority="medium",
                mission_complexity_score=50,
                learning_curve="medium",
                deep_work_recommendations="Focus blocks",
                reflection="Fallback mock reflection.",
                initial_risks=[],
                initial_recommendations=[],
                coach_insights=[]
            ),
            scheduler=SchedulerOutput(
                action="Optimized schedule",
                impact="Scheduled 1 block",
                reasoning="Deterministic mock scheduling.",
                blocks=[ScheduleBlock(title=mission.name, type="deep-work", duration_hours=mission.estimated_hours, best_time_of_day="morning")],
                best_execution_order=["Phase 1"],
                protected_time="Morning",
                conflict_detection=[],
                scheduling_confidence=95,
                reflection="Fallback mock."
            ),
            risk=RiskOutput(
                action="Assessed risk",
                impact="Calculated probability at 85%",
                reasoning="Mock fallback.",
                completion_probability=85,
                deadline_confidence=85,
                delay_prediction="None",
                risk_factors=[],
                critical_bottlenecks=[],
                priority_conflicts=[],
                reflection="Fallback mock."
            ),
            recovery=RecoveryOutput(
                action="No intervention required",
                impact="Routine check passed",
                reasoning="Mock fallback.",
                missed_work_analysis="None",
                recalculated_dependencies=[],
                recovery_explanation="Fallback mock.",
                execution_plan=[],
                reflection="Fallback mock."
            ),
            coach=CoachOutput(
                action="Analyzed patterns",
                impact="Work efficiency steady",
                reasoning="Mock fallback.",
                personalized_coaching="Maintain focus on the critical path.",
                expected_productivity_gain="+5%",
                confidence=85,
                estimated_mission_success_improvement=2,
                reflection="Fallback mock."
            )
        )

    async def _run_pipeline_async(self, mission: MissionNode | None, trigger: str) -> None:
        """The actual async execution loop that updates state."""
        pipeline_start = time.perf_counter()
        self._execution_logger.pipeline_started(trigger)

        risk_assessment: RiskAssessment | None = None

        try:
            if mission is None:
                missions = await self._firestore.get_top_level_missions()
                if not missions:
                    mission = MissionNode(
                        id="global",
                        name="Global Calendar & Tasks",
                        description="General execution when no specific mission is active.",
                        status="in-progress",
                        estimated_hours=0,
                        actual_hours=0,
                        dependencies=[],
                        subtasks=[],
                        created_at=iso_now(),
                        updated_at=iso_now()
                    )
                else:
                    mission = next((m for m in missions if m.status != "completed"), missions[0])

            # PRE-FETCH ALL DATA INTO PIPELINE CONTEXT
            from services.calendar_service import get_calendar_service
            from schemas.pipeline import PipelineContext
            
            cal_service = get_calendar_service()
            calendar_events = await cal_service.refresh_calendar()
            recent_memories = await self._firestore.get_memories(limit=25)
            
            context = PipelineContext(
                mission=mission,
                all_missions=await self._firestore.get_all_missions(),
                timeline=await self._firestore.get_timeline(),
                calendar_events=calendar_events,
                user_profile=await self._firestore.get_active_user_profile(),
                mission_success=await self._firestore.get_mission_success(),
                recommendations=await self._firestore.get_recommendations(),
                memories=recent_memories
            )
            
            cache_hash = self._generate_cache_hash(mission, calendar_events, recent_memories)
            
            # STAGE 1: CONTEXT GATHERING (THINKING)
            # ----------------------------------------------------
            # Sequential UI updates to maintain the illusion of independent thought
            
            self._update_agent_state(0, AgentState(type=AgentType.PLANNER, status=AgentStatusType.THINKING, current_action="Loading mission context...", result="", started_at=iso_now()))
            planner_context = await self._planner.build_context(mission)
            await asyncio.sleep(0.3)
            
            self._update_agent_state(1, AgentState(type=AgentType.SCHEDULER, status=AgentStatusType.THINKING, current_action="Reviewing calendar capacity...", result="", started_at=iso_now()))
            scheduler_context = await self._scheduler.build_context(mission)
            await asyncio.sleep(0.3)
            
            self._update_agent_state(2, AgentState(type=AgentType.RISK, status=AgentStatusType.THINKING, current_action="Scanning for bottlenecks...", result="", started_at=iso_now()))
            risk_context = await self._risk.build_context(mission, trigger=trigger)
            await asyncio.sleep(0.3)
            
            self._update_agent_state(3, AgentState(type=AgentType.RECOVERY, status=AgentStatusType.THINKING, current_action="Checking constraints...", result="", started_at=iso_now()))
            recovery_context = await self._recovery.build_context(mission, trigger=trigger)
            await asyncio.sleep(0.3)
            
            self._update_agent_state(4, AgentState(type=AgentType.COACH, status=AgentStatusType.THINKING, current_action="Reviewing performance history...", result="", started_at=iso_now()))
            coach_context = await self._coach.build_context(mission)
            await asyncio.sleep(0.3)

            # STAGE 2: SINGLE LLM INVOCATION (OR CACHE HIT)
            # ----------------------------------------------------
            cached_data = await self._firestore.get_orchestrator_cache(mission.id)
            force_replan = trigger and ("replan" in trigger.lower() or "manual" in trigger.lower() or "missed" in trigger.lower())
            
            orchestrator_output: OrchestratorOutput = None
            cache_hit = False
            
            if cached_data and not force_replan:
                if cached_data.get("hash") == cache_hash:
                    try:
                        orchestrator_output = OrchestratorOutput.model_validate(cached_data["output"])
                        cache_hit = True
                        logger.info(f"Pipeline Metrics: Cache HIT for mission {mission.id}. No Gemini call needed.")
                    except Exception as e:
                        logger.error(f"Failed to validate cached orchestrator output: {e}")

            if not cache_hit:
                logger.info(f"Pipeline Metrics: Cache MISS for mission {mission.id}. Triggering single Gemini call.")
                logger.info("Pipeline Metrics: Gemini calls = 1")
                
                # Update all to WORKING briefly while we wait for Gemini
                for i in range(5):
                    s = self._pipeline_state.agents[i]
                    s.status = AgentStatusType.WORKING
                    s.current_action = "Synthesizing AI output..."
                    self._update_agent_state(i, s)
                
                combined_prompt = (
                    "You are Kairos One, a multi-agent AI Productivity Operating System.\n"
                    "Analyze the following contexts provided by your specialized sub-agents and return a comprehensive unified JSON response.\n\n"
                    f"{planner_context}\n"
                    f"{scheduler_context}\n"
                    f"{risk_context}\n"
                    f"{recovery_context}\n"
                    f"{coach_context}\n"
                )
                
                system_instruction = "You are a master AI orchestrator. Provide highly detailed, structured JSON outputs for all 5 sub-agent domains based on the provided context."
                
                start_gemini = time.perf_counter()
                orchestrator_output = await self._gemini.generate_structured(
                    prompt=combined_prompt,
                    system_instruction=system_instruction,
                    response_model=OrchestratorOutput,
                    mock_response=self._get_mock_fallback(mission)
                )
                logger.info(f"Gemini orchestrator call completed in {(time.perf_counter() - start_gemini) * 1000:.1f}ms")

                await self._firestore.set_orchestrator_cache(mission.id, {
                    "output": orchestrator_output.model_dump(by_alias=False),
                    "hash": cache_hash,
                    "updated_at": iso_now()
                })

            # STAGE 3: SIDE EFFECT DISTRIBUTION (WORKING -> FINISHED) USING PIPELINE CONTEXT
            # ----------------------------------------------------
            
            # Planner
            self._update_agent_state(0, AgentState(type=AgentType.PLANNER, status=AgentStatusType.WORKING, current_action="Applying plan...", result="", started_at=iso_now()))
            planner_state, planner_activity = await self._planner.process_output(context, orchestrator_output.planner, duration_ms=10)
            self._update_agent_state(0, planner_state)
            self._activities.insert(0, planner_activity)
            await asyncio.sleep(0.4)
            
            # Scheduler
            self._update_agent_state(1, AgentState(type=AgentType.SCHEDULER, status=AgentStatusType.WORKING, current_action="Optimizing timeline...", result="", started_at=iso_now()))
            scheduler_state, scheduler_activity = await self._scheduler.process_output(context, orchestrator_output.scheduler, duration_ms=10)
            self._update_agent_state(1, scheduler_state)
            self._activities.insert(0, scheduler_activity)
            await asyncio.sleep(0.4)
            
            # Risk
            self._update_agent_state(2, AgentState(type=AgentType.RISK, status=AgentStatusType.WORKING, current_action="Calculating probabilities...", result="", started_at=iso_now()))
            risk_state, risk_activity, risk_assessment = await self._risk.process_output(context, orchestrator_output.risk, duration_ms=10)
            self._update_agent_state(2, risk_state)
            self._activities.insert(0, risk_activity)
            await asyncio.sleep(0.4)
            
            # Recovery
            self._update_agent_state(3, AgentState(type=AgentType.RECOVERY, status=AgentStatusType.WORKING, current_action="Evaluating recovery options...", result="", started_at=iso_now()))
            rec_trigger = f"Risk assessment triggered recovery for {mission.name}" if risk_assessment and risk_assessment.risk_level in ["high", "critical"] else trigger
            recovery_state, recovery_activity = await self._recovery.process_output(context, rec_trigger, orchestrator_output.recovery, duration_ms=10)
            self._update_agent_state(3, recovery_state)
            self._activities.insert(0, recovery_activity)
            await asyncio.sleep(0.4)
            
            # Coach
            self._update_agent_state(4, AgentState(type=AgentType.COACH, status=AgentStatusType.WORKING, current_action="Generating insights...", result="", started_at=iso_now()))
            coach_state, coach_activity = await self._coach.process_output(context, orchestrator_output.coach, duration_ms=10)
            self._update_agent_state(4, coach_state)
            self._activities.insert(0, coach_activity)

            # STAGE 4: BATCH COMMIT AND CACHE INVALIDATION
            # ----------------------------------------------------
            
            # 1. Update full collection replacements
            await self._firestore.update_timeline(context.timeline)
            
            # 2. Synthesize pipeline memory
            from services.memory_service import get_memory_service
            await get_memory_service().synthesize_pipeline_memory(context)
            
            # 3. Commit all changes at once
            await self._firestore.batch_commit(context.mutations)
            
            # 4. Invalidate specific caches
            from services.cache_service import get_cache_service
            get_cache_service().invalidate_pipeline_caches()

            # Optional: Fallback metrics update
            if risk_assessment:
                await self._update_mission_success(mission, risk_assessment)

        except Exception as e:
            logger.error("Pipeline failed: %s", str(e), exc_info=True)
            import traceback
            traceback.print_exc()
            for i in range(5):
                s = self._pipeline_state.agents[i]
                if s.status != AgentStatusType.FINISHED:
                    s.status = AgentStatusType.ERROR
                    s.result = "Failed"
                    self._update_agent_state(i, s)
        finally:
            self._pipeline_state.is_running = False
            _mission = locals().get('mission', None)
            self._pipeline_state.trigger = f"Analysis Complete: {_mission.name}" if _mission else "Idle"
            
            # Persist final state to Firestore so UI doesn't fallback to 'Waiting'
            try:
                # We need to await this, but we're in a finally block, which is safe for async
                await self._firestore.update_pipeline(self._pipeline_state)
            except Exception as e:
                logger.error("Failed to persist final pipeline state: %s", str(e))
                
            self._execution_logger.pipeline_completed(trigger, (time.perf_counter() - pipeline_start) * 1000)

    async def _update_mission_success(self, mission: MissionNode, risk: RiskAssessment) -> None:
        """Update global Mission Success based on risk."""
        pass  # Handled by PipelineContext mutations directly when necessary


# =============================================================================
# Singleton
# =============================================================================

_orchestrator: MissionOrchestrator | None = None


def get_orchestrator() -> MissionOrchestrator:
    """Get or create the singleton MissionOrchestrator instance."""
    global _orchestrator  # noqa: PLW0603
    if _orchestrator is None:
        _orchestrator = MissionOrchestrator()
    return _orchestrator


