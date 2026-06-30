# =============================================================================
# Kairos One — Health & Version Endpoints
# =============================================================================

from fastapi import APIRouter, Depends
from api.dependencies import get_current_user

from config import get_settings
from services.gemini_service import get_gemini_service
from services.firestore_service import get_firestore_service
from utils.helpers import iso_now

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check() -> dict[str, object]:
    """Application health check with service status."""
    settings = get_settings()
    gemini = get_gemini_service()
    firestore = get_firestore_service()

    gemini_health = await gemini.health()
    firestore_health = await firestore.health()

    return {
        "status": "healthy",
        "version": "2.0.0",
        "environment": settings.environment,
        "timestamp": iso_now(),
        "services": {
            "gemini": gemini_health,
            "firestore": firestore_health,
        },
    }


@router.get("/version")
async def version_info() -> dict[str, str]:
    """Return API version information."""
    return {
        "name": "Kairos One API",
        "version": "2.0.0",
        "phase": "2",
        "description": "Production backend foundation with mock data",
    }

