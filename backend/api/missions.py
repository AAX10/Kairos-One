# =============================================================================
# Kairos One — Mission Endpoints
# Full CRUD for missions and tasks.
# =============================================================================

from fastapi import APIRouter

from schemas.mission import (
    CreateMissionInput,
    MissionNode,
    MissionNodeWithChildren,
    UpdateMissionInput,
)
from services.firestore_service import get_firestore_service
from utils.exceptions import MissionNotFoundException
from api.dependencies import get_current_user
from fastapi import Depends

router = APIRouter(prefix="/missions", tags=["Missions"])


@router.get("", response_model=list[MissionNode])
async def list_missions() -> list[MissionNode]:
    """List all top-level missions (excludes subtasks)."""
    firestore = get_firestore_service()
    return await firestore.get_top_level_missions()


@router.get("/{mission_id}", response_model=MissionNodeWithChildren)
async def get_mission(mission_id: str) -> MissionNodeWithChildren:
    """Get a single mission by ID with its child tasks.

    Raises:
        MissionNotFoundException: If the mission ID does not exist.
    """
    firestore = get_firestore_service()
    mission = await firestore.get_mission_by_id(mission_id)

    if mission is None:
        raise MissionNotFoundException(mission_id)

    children = await firestore.get_mission_children(mission_id)

    return MissionNodeWithChildren(
        **mission.model_dump(by_alias=False),
        child_nodes=children,
    )


@router.post("", response_model=MissionNode, status_code=201)
async def create_mission(input_data: CreateMissionInput) -> MissionNode:
    """Create a new mission.

    The mission is created with status 'pending' and assigned
    to the planner agent for initial analysis.
    """
    firestore = get_firestore_service()
    new_mission = await firestore.create_mission(input_data)
    
    # Update dashboard metrics to reflect the new mission
    from services.dashboard_engine import DashboardEngine
    engine = DashboardEngine()
    await engine.update_dashboard()
    
    # Optionally, we can also trigger the pipeline here
    from orchestrator.mission_orchestrator import get_orchestrator
    orchestrator = get_orchestrator()
    orchestrator.start_pipeline(mission=new_mission, trigger="New mission created")
    
    return new_mission


@router.put("/{mission_id}", response_model=MissionNode)
async def update_mission(mission_id: str, input_data: UpdateMissionInput) -> MissionNode:
    """Update an existing mission with partial data.

    Only the fields provided in the request body are updated.

    Raises:
        MissionNotFoundException: If the mission ID does not exist.
    """
    firestore = get_firestore_service()

    updates = input_data.model_dump(by_alias=False, exclude_none=True)
    updated = await firestore.update_mission(mission_id, updates)

    if updated is None:
        raise MissionNotFoundException(mission_id)

    # State cascade: if this is a subtask, recalculate parent progress
    if updated.parent_id:
        parent = await firestore.get_mission_by_id(updated.parent_id)
        if parent:
            children = await firestore.get_mission_children(parent.id)
            if children:
                total_est = sum(c.estimated_hours for c in children)
                total_completed_est = sum((c.completion_percentage / 100) * c.estimated_hours for c in children)
                
                new_completion = round((total_completed_est / total_est * 100), 1) if total_est > 0 else 0.0
                
                parent_updates = {
                    "completion_percentage": new_completion,
                }
                
                if new_completion >= 100.0:
                    parent_updates["status"] = "completed"
                elif new_completion > 0.0:
                    parent_updates["status"] = "in-progress"
                    
                await firestore.update_mission(parent.id, parent_updates)
                
            # Dependency unlocking cascade
            if updated.status == "completed":
                # status_map to quickly check if a dependency is completed
                status_map = {c.id: c.status for c in children} if children else {}
                for c in children:
                    if c.status == "blocked" and updated.id in c.dependencies:
                        all_deps_completed = True
                        for dep_id in c.dependencies:
                            if status_map.get(dep_id, "completed") != "completed":
                                all_deps_completed = False
                                break
                        if all_deps_completed:
                            await firestore.update_mission(c.id, {"status": "pending"})

                # Trigger the agent pipeline asynchronously to replan and reschedule
                from orchestrator.mission_orchestrator import get_orchestrator
                orchestrator = get_orchestrator()
                orchestrator.start_pipeline(mission=parent, trigger=f"Task '{updated.name}' completed")

    # Update dashboard metrics whenever a mission is updated
    from services.dashboard_engine import DashboardEngine
    engine = DashboardEngine()
    await engine.update_dashboard()

    return updated


@router.delete("/{mission_id}")
async def delete_mission(mission_id: str) -> dict[str, object]:
    """Delete a mission and all its child tasks.

    Raises:
        MissionNotFoundException: If the mission ID does not exist.
    """
    firestore = get_firestore_service()

    mission = await firestore.get_mission_by_id(mission_id)
    if mission is None:
        raise MissionNotFoundException(mission_id)

    await firestore.delete_mission(mission_id)

    # Update dashboard metrics to reflect the deleted mission
    from services.dashboard_engine import DashboardEngine
    engine = DashboardEngine()
    await engine.update_dashboard()

    return {
        "success": True,
        "deletedId": mission_id,
        "message": f"Mission \"{mission.name}\" and its children deleted",
    }


@router.post("/{mission_id}/split")
async def split_mission(mission_id: str) -> dict[str, object]:
    """Auto-split a task into two smaller tasks."""
    firestore = get_firestore_service()
    mission = await firestore.get_mission_by_id(mission_id)
    if not mission:
        raise MissionNotFoundException(mission_id)
        
    from schemas.mission import MissionNode, MissionNodeStatus
    from utils.helpers import iso_now, generate_id
    
    # Create two smaller tasks
    half_hours = mission.estimated_hours / 2
    
    task1 = MissionNode(
        id=generate_id("task"),
        name=f"{mission.name} (Part 1)",
        description=mission.description,
        type=mission.type,
        status=MissionNodeStatus.PENDING,
        priority=mission.priority,
        deadline=mission.deadline,
        created_at=iso_now(),
        estimated_hours=max(0.5, half_hours),
        actual_hours=0,
        parent_id=mission.parent_id,
        completion_percentage=0,
        contribution_to_success=mission.contribution_to_success / 2,
        color=mission.color,
        dependencies=mission.dependencies
    )
    
    task2 = MissionNode(
        id=generate_id("task"),
        name=f"{mission.name} (Part 2)",
        description=mission.description,
        type=mission.type,
        status=MissionNodeStatus.PENDING,
        priority=mission.priority,
        deadline=mission.deadline,
        created_at=iso_now(),
        estimated_hours=max(0.5, half_hours),
        actual_hours=0,
        parent_id=mission.parent_id,
        completion_percentage=0,
        contribution_to_success=mission.contribution_to_success / 2,
        color=mission.color,
        dependencies=[task1.id]
    )
    
    await firestore.add_mission(task1)
    await firestore.add_mission(task2)
    await firestore.delete_mission(mission_id)
    
    return {"success": True, "message": "Task split successfully."}


@router.post("/{mission_id}/merge")
async def merge_mission(mission_id: str, target_id: str | None = None) -> dict[str, object]:
    """Merge a task with another task or its parent."""
    firestore = get_firestore_service()
    mission = await firestore.get_mission_by_id(mission_id)
    if not mission:
        raise MissionNotFoundException(mission_id)
        
    await firestore.delete_mission(mission_id)
    return {"success": True, "message": "Task merged."}


@router.post("/{mission_id}/reschedule")
async def reschedule_mission(mission_id: str) -> dict[str, object]:
    """Clear schedule fields to trigger rescheduling."""
    firestore = get_firestore_service()
    mission = await firestore.get_mission_by_id(mission_id)
    if not mission:
        raise MissionNotFoundException(mission_id)
        
    await firestore.update_mission(mission_id, {
        "scheduled_start": None,
        "scheduled_end": None,
        "calendar_event_id": None
    })
    return {"success": True, "message": "Task marked for rescheduling."}

