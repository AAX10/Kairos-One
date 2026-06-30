# =============================================================================
# Kairos One — Central API Router
# Assembles all sub-routers under the /api/v1 prefix.
# =============================================================================

from fastapi import APIRouter, Depends
from api.dependencies import get_current_user

from api.agents import router as agents_router
from api.dashboard import router as dashboard_router
from api.database import router as database_router
from api.health import router as health_router
from api.missions import router as missions_router
from api.users import router as users_router
from api.calendar import router as calendar_router
from api.memory import router as memory_router

api_router = APIRouter(prefix="/api/v1", dependencies=[Depends(get_current_user)])

# Mount all sub-routers
api_router.include_router(health_router)
api_router.include_router(dashboard_router)
api_router.include_router(missions_router)
api_router.include_router(agents_router)
api_router.include_router(users_router)
api_router.include_router(database_router)
api_router.include_router(calendar_router)
api_router.include_router(memory_router)

