# =============================================================================
# Kairos One — Date/Time Helpers
# Mirrors the frontend's mock-data.ts helper functions exactly.
# =============================================================================

from datetime import datetime, timedelta, timezone


def utc_now() -> datetime:
    """Current UTC datetime."""
    return datetime.now(timezone.utc)


def iso_now() -> str:
    """Current UTC time as ISO 8601 string."""
    return utc_now().isoformat()


def today_at(hour: int, minute: int = 0) -> str:
    """Today's date at the specified hour/minute in UTC, as ISO 8601."""
    now = utc_now()
    dt = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return dt.isoformat()


def days_from_now(days: int) -> str:
    """ISO 8601 string for N days from now (negative for past)."""
    dt = utc_now() + timedelta(days=days)
    return dt.isoformat()


def hours_ago(hours: float) -> str:
    """ISO 8601 string for N hours ago."""
    dt = utc_now() - timedelta(hours=hours)
    return dt.isoformat()


def minutes_ago(minutes: float) -> str:
    """ISO 8601 string for N minutes ago."""
    dt = utc_now() - timedelta(minutes=minutes)
    return dt.isoformat()


import uuid

def generate_id(prefix: str) -> str:
    """Generate a unique ID with the given prefix using UUID4."""
    return f"{prefix}-{uuid.uuid4()}"

