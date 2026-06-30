# =============================================================================
# Kairos One — Structured Logging Service
# JSON-formatted logging with request/response and agent execution tracking.
# =============================================================================

import logging
import sys
import time
from collections.abc import Awaitable, Callable
from typing import Final

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from config import get_settings

# -----------------------------------------------------------------------------
# Logger Setup
# -----------------------------------------------------------------------------

LOG_FORMAT: Final[str] = (
    "%(asctime)s | %(levelname)-8s | %(name)-20s | %(message)s"
)


def setup_logging() -> None:
    """Configure structured logging for the entire application."""
    settings = get_settings()
    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Clear existing handlers to avoid duplicates on reload
    root_logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(LOG_FORMAT))
    root_logger.addHandler(handler)

    # Reduce noise from uvicorn internals
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a named logger instance."""
    return logging.getLogger(f"sentinel.{name}")


# -----------------------------------------------------------------------------
# Request Logging Middleware
# -----------------------------------------------------------------------------


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Logs every HTTP request with method, path, status, and duration."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        logger = get_logger("http")
        start_time = time.perf_counter()

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start_time) * 1000
        logger.info(
            "%s %s -> %d (%.1fms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )

        return response


# -----------------------------------------------------------------------------
# Agent Execution Logger
# -----------------------------------------------------------------------------


class AgentExecutionLogger:
    """Structured logger for agent pipeline execution."""

    def __init__(self) -> None:
        self._logger = get_logger("agents")

    def agent_started(self, agent_type: str, mission_id: str) -> None:
        """Log when an agent begins execution."""
        self._logger.info(
            "Agent [%s] started | mission=%s",
            agent_type,
            mission_id,
        )

    def agent_completed(
        self, agent_type: str, mission_id: str, duration_ms: float, result: str
    ) -> None:
        """Log when an agent completes execution."""
        self._logger.info(
            "Agent [%s] completed | mission=%s | duration=%.1fms | result=%s",
            agent_type,
            mission_id,
            duration_ms,
            result,
        )

    def agent_failed(self, agent_type: str, mission_id: str, error: str) -> None:
        """Log when an agent encounters an error."""
        self._logger.error(
            "Agent [%s] failed | mission=%s | error=%s",
            agent_type,
            mission_id,
            error,
        )

    def pipeline_started(self, trigger: str) -> None:
        """Log when the full pipeline begins."""
        self._logger.info("Pipeline started | trigger=%s", trigger)

    def pipeline_completed(self, trigger: str, duration_ms: float) -> None:
        """Log when the full pipeline completes."""
        self._logger.info(
            "Pipeline completed | trigger=%s | duration=%.1fms",
            trigger,
            duration_ms,
        )

# -----------------------------------------------------------------------------
# Firestore Performance Logger
# -----------------------------------------------------------------------------

class FirestoreLogger:
    """Structured logger for Firestore reads, writes, and cache hits."""

    def __init__(self) -> None:
        self._logger = get_logger("firestore.perf")

    def log_cache_hit(self, endpoint: str, duration_ms: float) -> None:
        self._logger.info(
            "%s Request -> Cache Hit -> %.1f ms",
            endpoint,
            duration_ms
        )

    def log_firestore_read(self, endpoint: str, reads: int, duration_ms: float) -> None:
        self._logger.info(
            "%s Request -> Firestore -> %d read(s) -> %.1f ms",
            endpoint,
            reads,
            duration_ms
        )
        
    def log_firestore_write(self, endpoint: str, writes: int, duration_ms: float) -> None:
        self._logger.info(
            "%s Mutation -> Firestore -> %d write(s) -> %.1f ms",
            endpoint,
            writes,
            duration_ms
        )

