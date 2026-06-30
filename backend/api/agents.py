# =============================================================================
# Kairos One — Agent Pipeline Endpoints
# Exposes both individual agent execution and full orchestration.
# =============================================================================

from fastapi import APIRouter, Depends
from api.dependencies import get_current_user

from orchestrator.mission_orchestrator import get_orchestrator
from schemas.agent import AgentRunRequest, AgentRunResponse, AgentPipelineState
from services.firestore_service import get_firestore_service
from utils.exceptions import MissionNotFoundException

router = APIRouter(prefix="/agents", tags=["Agents"], dependencies=[Depends(get_current_user)])

# -----------------------------------------------------------------------------
# Orchestrator Endpoints
# -----------------------------------------------------------------------------


@router.post("/run", response_model=AgentRunResponse)
async def run_agent_pipeline(request: AgentRunRequest) -> AgentRunResponse:
    """Start the full 5-agent pipeline asynchronously."""
    firestore = get_firestore_service()
    mission = await firestore.get_mission_by_id(request.mission_id)

    if mission is None:
        raise MissionNotFoundException(request.mission_id)

    orchestrator = get_orchestrator()
    pipeline_state = orchestrator.start_pipeline(mission=mission, trigger=request.trigger)

    return AgentRunResponse(
        pipeline=pipeline_state,
        activities=orchestrator.get_recent_activities(),
    )


@router.get("/status", response_model=AgentRunResponse)
async def get_pipeline_status() -> AgentRunResponse:
    """Poll the current status of the running pipeline."""
    orchestrator = get_orchestrator()
    return AgentRunResponse(
        pipeline=orchestrator.get_pipeline_state(),
        activities=orchestrator.get_recent_activities(),
    )

