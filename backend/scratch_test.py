import asyncio
from utils.context import current_user_id
from schemas.mission import CreateMissionInput
from services.firestore_service import get_firestore_service
from orchestrator.mission_orchestrator import get_orchestrator

async def main():
    current_user_id.set('demo-user')
    f = get_firestore_service()
    m = await f.create_mission(CreateMissionInput(name='Test', description='Test', estimated_hours=2.0))
    print('Mission:', m.id)
    o = get_orchestrator()
    state = await o._run_pipeline_async(m, 'Test')
    print('Pipeline finished.')
    acts = await f.get_agent_activities()
    print('Acts:', len(acts))

asyncio.run(main())
