import asyncio
from utils.context import current_user_id
from services.firestore_service import get_firestore_service
from services.dashboard_engine import DashboardEngine

async def main():
    current_user_id.set('demo-user')
    engine = DashboardEngine()
    print("Running update_dashboard...")
    try:
        await engine.update_dashboard()
        print("Success!")
        f = get_firestore_service()
        ms = await f.get_mission_success()
        print("Score:", ms.overall_score)
    except Exception as e:
        print("Error:", e)

# Mock firestore initialization by importing main
from main import app
asyncio.run(main())
