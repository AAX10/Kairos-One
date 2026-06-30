# =============================================================================
# Kairos One — Recovery & Timeline Endpoints
# POST /recovery/run and GET /timeline.
# =============================================================================

from fastapi import APIRouter, Depends, Query
from api.dependencies import get_current_user

from schemas.timeline import RecoveryPlan, RecoveryRunRequest, TimeBlock
from services.calendar_service import get_calendar_service
from services.firestore_service import get_firestore_service

router = APIRouter(tags=["Recovery & Timeline"])


@router.post("/recovery/run", response_model=RecoveryPlan)
async def run_recovery(request: RecoveryRunRequest) -> RecoveryPlan:
    """Trigger a recovery plan generation.

    The recovery agent analyzes the current schedule, identifies
    what was missed, and produces an optimized recovery plan with
    before/after timelines and Mission Success impact.
    """
    from orchestrator.mission_orchestrator import get_orchestrator
    
    # "type" is typically "missed-today" or "missed-task"
    trigger = f"User initiated recovery ({request.type})"
    
    orchestrator = get_orchestrator()
    # Force a synchronous pipeline run for this specific endpoint
    await orchestrator._run_pipeline_async(mission=None, trigger=trigger)
    
    # 2. Return the newly generated recovery plan
    firestore = get_firestore_service()
    return await firestore.get_recovery_plan()


@router.get("/timeline", response_model=list[TimeBlock])
async def get_timeline(
    date: str | None = Query(default=None, description="ISO date string (YYYY-MM-DD)"),
) -> list[TimeBlock]:
    """Get the scheduled time blocks for a given day.

    If no date is provided, returns today's timeline.
    """
    calendar = get_calendar_service()
    return await calendar.get_timeline(date)

