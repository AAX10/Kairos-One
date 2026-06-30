import asyncio
from services.dashboard_engine import DashboardEngine

async def run():
    engine = DashboardEngine()
    await engine.update_dashboard()

if __name__ == "__main__":
    asyncio.run(run())
