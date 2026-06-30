# =============================================================================
# Kairos One — Main Application Entry Point
# Initializes FastAPI, CORS, middleware, and routers.
# =============================================================================

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.router import api_router
from config import get_settings
from services.logging_service import RequestLoggingMiddleware, setup_logging
from utils.exceptions import SentinelException
from utils.responses import error_response

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

settings = get_settings()

def validate_env_vars(s):
    required = {
        "GEMINI_API_KEY": s.gemini_api_key,
        "GOOGLE_CLIENT_ID": s.google_client_id,
        "GOOGLE_CLIENT_SECRET": s.google_client_secret,
        "FIREBASE_PROJECT_ID": s.firebase_project_id,
    }
    for key, val in required.items():
        if not val or val.startswith("mock-"):
            raise ValueError(f"Missing or invalid {key} in backend environment. Production run cannot proceed.")
    if not s.firebase_credentials and not s.firebase_credentials_path:
        raise ValueError("Missing FIREBASE_CREDENTIALS or FIREBASE_CREDENTIALS_PATH.")

validate_env_vars(settings)

# Initialize Firebase App globally before any requests
import os
import json
import firebase_admin
from firebase_admin import credentials

if not firebase_admin._apps:
    if settings.firebase_credentials:
        # JSON credentials stored directly in an environment variable
        try:
            cred_dict = json.loads(settings.firebase_credentials)
            cred = credentials.Certificate(cred_dict)
        except Exception as e:
            raise ValueError(f"Failed to parse FIREBASE_CREDENTIALS: {e}")

    else:
        # Prefer Render/Cloud secret file if available
        firebase_path = (
            os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            or settings.firebase_credentials_path
        )

        if not firebase_path:
            raise ValueError(
                "No Firebase credentials provided. "
                "Set FIREBASE_CREDENTIALS, GOOGLE_APPLICATION_CREDENTIALS, "
                "or FIREBASE_CREDENTIALS_PATH."
            )

        cred = credentials.Certificate(firebase_path)

    firebase_admin.initialize_app(
        cred,
        {
            "projectId": settings.firebase_project_id,
        },
    )

setup_logging()

# -----------------------------------------------------------------------------
# FastAPI App Initialization
# -----------------------------------------------------------------------------

app = FastAPI(
    title="Kairos One API",
    version="2.0.0",
    description="Production backend foundation with mock data",
    docs_url="/docs",
    redoc_url=None,
)

# -----------------------------------------------------------------------------
# Middleware
# -----------------------------------------------------------------------------

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Logging
app.add_middleware(RequestLoggingMiddleware)

# -----------------------------------------------------------------------------
# Exception Handlers
# -----------------------------------------------------------------------------


@app.exception_handler(SentinelException)
async def sentinel_exception_handler(request: Request, exc: SentinelException) -> JSONResponse:
    """Global handler for all domain-specific exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(
            error=exc.error_type,
            detail=exc.detail,
            status_code=exc.status_code,
        ),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Fallback handler for unhandled exceptions."""
    import logging
    import traceback
    logger = logging.getLogger("sentinel.app")
    logger.exception("Unhandled exception: %s", str(exc))
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "internal_server_error",
            "detail": "An unexpected server error occurred. Please try again later.",
        },
    )

# -----------------------------------------------------------------------------
# Routing
# -----------------------------------------------------------------------------

app.include_router(api_router)

