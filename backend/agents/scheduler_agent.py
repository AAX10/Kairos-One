# =============================================================================
# Kairos One — Scheduler Agent
# Optimizes calendar blocks and protects deep work time.
# =============================================================================

import os
import time

from schemas.agent import AgentActivity, AgentState, AgentStatusType, AgentType
from schemas.agent_io import SchedulerOutput, AgentContext
from schemas.mission import MissionNode
from services.logging_service import AgentExecutionLogger, get_logger
from services.memory_service import get_memory_service

logger = get_logger("agent.scheduler")


class SchedulerAgent:
    def __init__(self) -> None:
        self._execution_logger = AgentExecutionLogger()
        self._memory = get_memory_service()
        self._agent_type = AgentType.SCHEDULER
        
    async def build_context(self, mission: MissionNode) -> str:
        """Gathers context for the orchestrator prompt."""
        from services.firestore_service import get_firestore_service
        firestore = get_firestore_service()
        children = await firestore.get_mission_children(mission.id)
        
        # Topological Sort
        from collections import deque
        in_degree = {c.id: 0 for c in children}
        adj = {c.id: [] for c in children}
        for c in children:
            for dep in c.dependencies:
                if dep in adj:
                    adj[dep].append(c.id)
                    in_degree[c.id] += 1
        
        q = deque([k for k, v in in_degree.items() if v == 0])
        sorted_ids = []
        while q:
            node = q.popleft()
            sorted_ids.append(node)
            for neighbor in adj[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    q.append(neighbor)
                    
        # Append any remaining (cycles)
        sorted_set = set(sorted_ids)
        for c in children:
            if c.id not in sorted_set:
                sorted_ids.append(c.id)
                
        child_map = {c.id: c for c in children}
        children_sorted = [child_map[cid] for cid in sorted_ids]
        
        user_profile = await firestore.get_active_user_profile()
        settings = user_profile.settings
        
        # Fetch real calendar events
        from services.calendar_service import get_calendar_service
        cal_service = get_calendar_service()
        calendar_events = await cal_service.refresh_calendar()
        
        cal_str = "\n".join([f"- {e.title}: {e.start} to {e.end}" for e in calendar_events])
        subtasks_str = "\n".join([f"- {c.name} ({c.estimated_hours}h)" for c in children_sorted])
        
        prompt = (
            f"--- SCHEDULER CONTEXT ---\n"
            f"Subtasks to Schedule (in optimal dependency order):\n{subtasks_str}\n"
            f"Current Calendar Events:\n{cal_str}\n"
            f"User Settings: Working Hours {settings.working_hours_start}-{settings.working_hours_end}\n"
        )
        return prompt

    async def process_output(self, context: "PipelineContext", output: SchedulerOutput, duration_ms: float) -> tuple[AgentState, AgentActivity]:
        """Apply side effects based on the orchestrator's unified response slice."""
        self._execution_logger.agent_started(self._agent_type, context.mission.id)

        # 3. Create Activity
        activity = AgentActivity(
            id=f"aa-scheduler-{int(time.time() * 1000)}",
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
        result_text = f"Scheduled {len(output.blocks)} blocks. {output.impact}"
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

        # 6. Apply to Timeline
        from schemas.timeline import TimeBlock, TimeBlockStatus, TimeBlockType
        from datetime import datetime, timedelta

        children = [m for m in context.all_missions if m.parent_id == context.mission.id]
        settings = getattr(context.user_profile, "settings", None)
        
        # We don't delete events from Google Calendar here in the fast path to avoid IO.
        # But we DO need to clear `calendar_event_id` from children.
        for child in children:
            if getattr(child, "calendar_event_id", None):
                child.calendar_event_id = None
                child.scheduled_start = None
                child.scheduled_end = None

        # Remove previous blocks for this mission
        context.timeline = [tb for tb in context.timeline if tb.mission_id != context.mission.id]
        
        new_blocks = []
        
        now = datetime.utcnow()
        current_time = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        
        busy_slots = []
        for e in context.calendar_events:
            try:
                start_dt = datetime.fromisoformat(e.start.replace("Z", "+00:00")).replace(tzinfo=None)
                end_dt = datetime.fromisoformat(e.end.replace("Z", "+00:00")).replace(tzinfo=None)
                busy_slots.append((start_dt, end_dt))
            except Exception:
                pass
                
        for tb in context.timeline:
            try:
                start_dt = datetime.fromisoformat(tb.start.replace("Z", "+00:00")).replace(tzinfo=None)
                end_dt = datetime.fromisoformat(tb.end.replace("Z", "+00:00")).replace(tzinfo=None)
                busy_slots.append((start_dt, end_dt))
            except Exception:
                pass

        try:
            wh_start_h, wh_start_m = map(int, settings.working_hours_start.split(":")) if settings else (9, 0)
            wh_end_h, wh_end_m = map(int, settings.working_hours_end.split(":")) if settings else (17, 0)
        except:
            wh_start_h, wh_start_m = 9, 0
            wh_end_h, wh_end_m = 17, 0

        now = datetime.utcnow()
        base_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        for i in range(14):
            day = base_day + timedelta(days=i - 3)
            sleep_start = day
            sleep_end = day.replace(hour=wh_start_h, minute=wh_start_m)
            busy_slots.append((sleep_start, sleep_end))
            
            evening_start = day.replace(hour=wh_end_h, minute=wh_end_m)
            evening_end = day + timedelta(days=1)
            busy_slots.append((evening_start, evening_end))

        busy_slots.sort(key=lambda x: x[0])
        merged_busy = []
        for slot in busy_slots:
            if not merged_busy:
                merged_busy.append(slot)
            else:
                last_start, last_end = merged_busy[-1]
                if slot[0] <= last_end:
                    merged_busy[-1] = (last_start, max(last_end, slot[1]))
                else:
                    merged_busy.append(slot)

        task_end_times = {}
        current_time = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        
        child_names = {c.name: c for c in children}
        
        valid_blocks = []
        existing_block_titles = set()
        for b in output.blocks:
            if b.title in child_names and b.title not in existing_block_titles:
                valid_blocks.append(b)
                existing_block_titles.add(b.title)
        
        output.blocks = valid_blocks

        for child in children:
            if child.name not in existing_block_titles:
                from schemas.agent_io import ScheduleBlock
                output.blocks.append(ScheduleBlock(
                    title=child.name,
                    type="deep-work",
                    duration_hours=child.estimated_hours,
                    best_time_of_day="morning"
                ))

        for idx, block in enumerate(output.blocks):
            duration = timedelta(hours=max(0.25, block.duration_hours))
            
            earliest_possible = current_time
            matched_child = next((c for c in children if c.name == block.title), None)
            if matched_child:
                for dep_id in matched_child.dependencies:
                    dep_child = next((c for c in children if c.id == dep_id), None)
                    if dep_child and dep_child.name in task_end_times:
                        if task_end_times[dep_child.name] > earliest_possible:
                            earliest_possible = task_end_times[dep_child.name]
            
            search_start = earliest_possible
            gap_start = search_start
            found_slot = False
            
            while not found_slot and gap_start < search_start + timedelta(days=7):
                gap_end = gap_start + duration
                
                overlap = False
                for b_start, b_end in merged_busy:
                    if gap_start < b_end and gap_end > b_start:
                        overlap = True
                        gap_start = b_end
                        break
                
                if not overlap:
                    found_slot = True
                    break

            if not found_slot:
                logger.warning(f"Failed to find valid slot for {block.title}. Generating Recovery Action.")
                from schemas.dashboard import AIRecommendation, RecommendationCategory, RecommendationAction
                from utils.helpers import generate_id
                
                rec = AIRecommendation(
                    id=generate_id("rec"),
                    title=f"Schedule Overflow: {block.title}",
                    priority="high",
                    confidence=95.0,
                    reason=f"No {block.duration_hours}h gap available within working hours for {block.title}.",
                    estimated_impact=0.0,
                    category=RecommendationCategory.SCHEDULE,
                    actions=[
                        RecommendationAction(label="Accept", type="accept"),
                        RecommendationAction(label="Dismiss", type="dismiss")
                    ]
                )
                context.recommendations.append(rec)
                context.add_mutation("create", "recommendations", rec.id, rec.model_dump(by_alias=False))
                return state, activity
                
            start_iso = gap_start.isoformat() + "Z"
            end_iso = gap_end.isoformat() + "Z"
            
            tb = TimeBlock(
                id=f"tb-{context.mission.id}-{idx}-{int(time.time()*1000)}",
                mission_id=context.mission.id,
                mission_name=context.mission.name,
                title=block.title,
                start=start_iso,
                end=end_iso,
                type=TimeBlockType.DEEP_WORK if block.type == "deep-work" else TimeBlockType.MEETING,
                status=TimeBlockStatus.SCHEDULED,
                color=context.mission.color
            )
            
            for b_start, b_end in merged_busy:
                if gap_start < b_end and gap_end > b_start:
                    logger.error(f"Final validation failed! Overlap detected for {block.title}")
                    return state, activity
                    
            new_blocks.append(tb)
            task_end_times[block.title] = gap_end
            
            merged_busy.append((gap_start, gap_end))
            merged_busy.sort(key=lambda x: x[0])
            new_merged = []
            for slot in merged_busy:
                if not new_merged:
                    new_merged.append(slot)
                else:
                    last_start, last_end = new_merged[-1]
                    if slot[0] <= last_end:
                        new_merged[-1] = (last_start, max(last_end, slot[1]))
                    else:
                        new_merged.append(slot)
            merged_busy = new_merged
            
            # NOTE: Syncing to Google Calendar is a slow I/O operation.
            # In this optimized pipeline, we skip sync here. A separate background
            # job or the user interface handles bidirectional sync later.
            event_id = None
            
            if matched_child:
                matched_child.calendar_event_id = event_id
                matched_child.scheduled_start = start_iso
                matched_child.scheduled_end = end_iso
                context.add_mutation("update", "missions", matched_child.id, {
                    "calendar_event_id": event_id,
                    "scheduled_start": start_iso,
                    "scheduled_end": end_iso
                })

        context.timeline.extend(new_blocks)

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

