# =============================================================================
# Kairos One — Cache Service
# Centralized in-memory TTL caching layer for FastAPI.
# Prevents unnecessary Firestore reads and API quota exhaustion.
# =============================================================================

from cachetools import TTLCache
from typing import Any, Optional

from services.logging_service import get_logger

logger = get_logger("cache")

class CacheService:
    def __init__(self) -> None:
        # Define TTLCaches per domain with maximum size of 100 items each
        
        # Dashboard: 30 seconds
        self.dashboard_cache = TTLCache(maxsize=100, ttl=30)
        self.day_brief_cache = TTLCache(maxsize=100, ttl=30)
        
        # Timeline: 30 seconds
        self.timeline_cache = TTLCache(maxsize=100, ttl=30)
        
        # Calendar Events: 5 minutes (300s)
        self.calendar_events_cache = TTLCache(maxsize=100, ttl=300)
        
        # Recommendations: 60 seconds
        self.recommendations_cache = TTLCache(maxsize=100, ttl=60)
        
        # Mission Success: 30 seconds
        self.mission_success_cache = TTLCache(maxsize=100, ttl=30)
        
        # Insights: 60 seconds
        self.insights_cache = TTLCache(maxsize=100, ttl=60)
        
        # Agent Status & Activities: 10 seconds
        self.agent_status_cache = TTLCache(maxsize=100, ttl=10)
        self.agent_activities_cache = TTLCache(maxsize=100, ttl=10)
        
        # Calendar Credentials: 1 hour (3600s)
        self.calendar_credentials_cache = TTLCache(maxsize=10, ttl=3600)
        
        # User Profile: 10 minutes (600s)
        self.user_profile_cache = TTLCache(maxsize=100, ttl=600)
        
        # Memory Search: 2 minutes (120s)
        self.memory_cache = TTLCache(maxsize=500, ttl=120)
        
        # Core Models (Missions, Milestones, Integrations)
        self.missions_cache = TTLCache(maxsize=500, ttl=30)
        self.milestones_cache = TTLCache(maxsize=500, ttl=30)
        self.integrations_cache = TTLCache(maxsize=100, ttl=30)
        
        logger.info("CacheService initialized with in-memory TTL caching.")

    # -------------------------------------------------------------------------
    # Invalidation Methods
    # -------------------------------------------------------------------------
    
    def invalidate_mission(self, mission_id: Optional[str] = None) -> None:
        """Invalidates mission caches."""
        if mission_id and f"mission_{mission_id}" in self.missions_cache:
            del self.missions_cache[f"mission_{mission_id}"]
        if "all_missions" in self.missions_cache:
            del self.missions_cache["all_missions"]
        if "top_level_missions" in self.missions_cache:
            del self.missions_cache["top_level_missions"]
        if mission_id and f"children_{mission_id}" in self.missions_cache:
            del self.missions_cache[f"children_{mission_id}"]
        
        # Invalidate related aggregations
        self.invalidate_dashboard()
        self.invalidate_timeline()
        logger.info(f"Invalidated mission caches (target: {mission_id or 'all'})")

    def invalidate_dashboard(self) -> None:
        """Invalidates dashboard, success metrics, and day brief."""
        self.dashboard_cache.clear()
        self.day_brief_cache.clear()
        self.mission_success_cache.clear()
        logger.info("Invalidated dashboard caches")
        
    def invalidate_timeline(self) -> None:
        self.timeline_cache.clear()
        logger.info("Invalidated timeline caches")
        
    def invalidate_recommendations(self) -> None:
        self.recommendations_cache.clear()
        logger.info("Invalidated recommendations cache")
        
    def invalidate_calendar(self) -> None:
        self.calendar_events_cache.clear()
        self.invalidate_timeline()
        self.invalidate_dashboard()
        logger.info("Invalidated calendar and related caches")
        
    def invalidate_agent_status(self) -> None:
        self.agent_status_cache.clear()
        
    def invalidate_recovery(self) -> None:
        self.invalidate_dashboard()
        self.invalidate_timeline()
        self.invalidate_agent_status()
        logger.info("Invalidated recovery-related caches")

    def invalidate_pipeline_caches(self) -> None:
        """Invalidate all caches updated at the end of an agent pipeline execution."""
        self.invalidate_mission()
        self.invalidate_timeline()
        self.invalidate_dashboard()
        self.invalidate_recommendations()
        self.agent_activities_cache.clear()
        self.insights_cache.clear()
        self.memory_cache.clear()
        self.milestones_cache.clear()
        logger.info("Invalidated all pipeline-related caches.")


# =============================================================================
# Singleton
# =============================================================================

_cache_service: CacheService | None = None

def get_cache_service() -> CacheService:
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service

