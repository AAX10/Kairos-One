# =============================================================================
# Kairos One — Dashboard Endpoints
# GET /dashboard returns the full composite dashboard data.
# =============================================================================

from fastapi import APIRouter, Depends
from api.dependencies import get_current_user, HTTPException
from pydantic import BaseModel
import httpx

from schemas.dashboard import DashboardResponse
from schemas.memory import MemoryInsight
from services.firestore_service import get_firestore_service
from orchestrator.mission_orchestrator import get_orchestrator

router = APIRouter(tags=["Dashboard"], dependencies=[Depends(get_current_user)])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard() -> DashboardResponse:
    """Return the full dashboard data for Mission Control.

    Includes mission success KPI, day brief, recommendations,
    agent activities, coach insights, integrations, and timeline.
    """
    firestore = get_firestore_service()

    mission_success = await firestore.get_mission_success()
    day_brief = await firestore.get_day_brief()
    recommendations = await firestore.get_recommendations()
    agent_activities = await firestore.get_agent_activities()
    coach_insights = await firestore.get_coach_insights()
    integrations = await firestore.get_integrations()
    timeline = await firestore.get_timeline()
    
    # Compute real analytics from Firestore
    memory_insights = []
    all_missions = await firestore.get_all_missions()
    tasks = [m for m in all_missions if m.type == "task"]
    completed_tasks = [t for t in tasks if t.status == "completed"]
    
    completion_rate = round(len(completed_tasks) / len(tasks) * 100) if tasks else 0
    
    # Compute average deep work from timeline
    deep_work_blocks = [tb for tb in timeline if tb.type == "deep-work" and tb.status == "completed"]
    avg_deep_work = "N/A"
    if deep_work_blocks:
        from datetime import datetime
        total_mins = 0
        for tb in deep_work_blocks:
            try:
                start_dt = datetime.fromisoformat(tb.start.replace("Z", "+00:00")).replace(tzinfo=None)
                end_dt = datetime.fromisoformat(tb.end.replace("Z", "+00:00")).replace(tzinfo=None)
                total_mins += (end_dt - start_dt).total_seconds() / 60
            except:
                pass
        avg_deep_work = f"{int(total_mins / len(deep_work_blocks))}m"
    
    memory_insights.append(MemoryInsight(
        id="mi-trend",
        category="trend",
        title="Historical Completion",
        description=f"Your overall task completion rate is {completion_rate}%.",
        icon="trending-up"
    ))
    
    memory_insights.append(MemoryInsight(
        id="mi-habit",
        category="habit",
        title="Deep Work Rhythm",
        description=f"Your average completed deep work block is {avg_deep_work}." if deep_work_blocks else "Complete a deep work session to generate insights.",
        icon="clock"
    ))
    
    recent_memories = await firestore.get_memories(limit=1, min_importance=80.0)
    if recent_memories:
        mem = recent_memories[0]
        memory_insights.append(MemoryInsight(
            id=f"mi-learn-{mem.id}",
            category="learning",
            title="Recent Agent Learning",
            description=mem.content[:100] + "..." if len(mem.content) > 100 else mem.content,
            icon="brain"
        ))

    return DashboardResponse(
        mission_success=mission_success,
        day_brief=day_brief,
        recommendations=recommendations,
        agent_activities=agent_activities,
        coach_insights=coach_insights,
        integrations=integrations,
        timeline=timeline,
        memory_insights=memory_insights,
    )


@router.post("/recommendations/{rec_id}/accept")
async def accept_recommendation(rec_id: str):
    firestore = get_firestore_service()
    recs = await firestore.get_recommendations()
    rec = next((r for r in recs if r.id == rec_id), None)
    
    if rec:
        filtered = [r for r in recs if r.id != rec_id]
        await firestore.update_recommendations(filtered)
        
        # Execute Recommendation Action
        if rec.category in ("schedule", "focus"):
            # Add a deep work block or execute the specific action
            timeline = await firestore.get_timeline()
            from schemas.timeline import TimeBlock, TimeBlockType, TimeBlockStatus
            from datetime import datetime, timedelta
            import time
            
            now = datetime.utcnow()
            start_time = now.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
            end_time = start_time + timedelta(hours=2)
            
            tb = TimeBlock(
                id=f"tb-rec-{int(time.time()*1000)}",
                mission_id="rec",
                mission_name="AI Action",
                title=rec.title,
                start=start_time.isoformat() + "Z",
                end=end_time.isoformat() + "Z",
                type=TimeBlockType.DEEP_WORK,
                status=TimeBlockStatus.SCHEDULED,
                color="#6366f1",
                description=rec.reason
            )
            # Sync to calendar
            from services.calendar_service import get_calendar_service
            cal_service = get_calendar_service()
            await cal_service.sync_block_to_calendar(tb)
            
            timeline.append(tb)
            await firestore.update_timeline(timeline)
            
        
        # Record to memory
        from services.memory_service import get_memory_service
        from schemas.memory import MemoryType
        memory = get_memory_service()
        await memory.add_memory(
            m_type=MemoryType.REC_ACCEPTED,
            content=f"User accepted recommendation: {rec.title}. Action taken: {rec.category}",
            importance_score=60.0,
            source="user"
        )
        
        trigger_msg = f"Accepted recommendation: {rec.title}"
    else:
        trigger_msg = "Accepted recommendation (stale ID)"
    
    # Trigger orchestrator manually (global or most critical mission)
    # This simulates AI Recommendations executing actions
    orchestrator = get_orchestrator()
    
    # start_pipeline is synchronous and manages its own background task
    orchestrator.start_pipeline(None, trigger=trigger_msg)
    
    return {"status": "accepted"}


@router.post("/recommendations/{rec_id}/dismiss")
async def dismiss_recommendation(rec_id: str):
    firestore = get_firestore_service()
    recs = await firestore.get_recommendations()
    rec = next((r for r in recs if r.id == rec_id), None)
    
    if rec:
        filtered = [r for r in recs if r.id != rec_id]
        await firestore.update_recommendations(filtered)
        
        # Record to memory
        from services.memory_service import get_memory_service
        from schemas.memory import MemoryType
        memory = get_memory_service()
        await memory.add_memory(
            m_type=MemoryType.REC_DISMISSED,
            content=f"User dismissed recommendation: {rec.title}. Reason: {rec.reason}",
            importance_score=50.0,
            source="user"
        )
    
    return {"status": "dismissed"}




