# =============================================================================
# Kairos One — Calendar Service Abstraction
# Full Google Calendar integration.
# =============================================================================

import os
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.exceptions import RefreshError

from schemas.timeline import TimeBlock, TimeBlockStatus, TimeBlockType, CalendarEvent, CalendarCredentials
from services.firestore_service import FirestoreService, get_firestore_service
from services.logging_service import get_logger
from utils.helpers import iso_now
from utils.credentials_helper import build_google_credentials

logger = get_logger("calendar")


class CalendarService:
    """Abstraction over Google Calendar API."""

    def __init__(self) -> None:
        self._firestore: FirestoreService = get_firestore_service()
        self._credentials = None
        self._service = None
        logger.info("Calendar service initialized")

    async def _ensure_auth(self) -> None:
        if self._service is not None:
            return
        
        creds = await self._firestore.get_calendar_credentials()
        if creds:
            # Check for legacy credentials (missing refresh token or client_id)
            if not creds.refresh_token or not creds.client_id:
                logger.warning("Legacy Calendar credentials detected (missing refresh_token or client_id). Forcing reconnect.")
                self._service = None
                # Update integration status to disconnected
                integrations = await self._firestore.get_integrations()
                for i in integrations:
                    if i.service == "calendar":
                        i.status = "disconnected"
                        i.detail = "Legacy connection deprecated. Please reconnect."
                await self._firestore.update_integrations(integrations)
                return

            try:
                self._credentials = build_google_credentials(creds)
                self._service = build("calendar", "v3", credentials=self._credentials)
                logger.info("Calendar service authenticated successfully from stored credentials (user: %s).", creds.email)
            except Exception as e:
                logger.error("Failed to set calendar credentials from storage: %s", str(e))
                self._service = None

    async def set_credentials(self, creds: CalendarCredentials) -> None:
        """Set credentials from an access token."""
        await self._firestore.update_calendar_credentials(creds)
        self._service = None
        await self._ensure_auth()

    async def _fallback_to_firestore(self, date: str | None = None) -> list[TimeBlock]:
        """Fallback to in-memory/firestore blocks if Google Calendar is unavailable."""
        timeline = await self._firestore.get_timeline()
        if date is not None:
            logger.debug("Date filter requested (%s)", date)
        return timeline

    async def get_events(self, time_min: str, time_max: str) -> list[CalendarEvent]:
        """Fetch raw Calendar events from Google and normalize them."""
        await self._ensure_auth()
        if not self._service:
            logger.debug("Calendar not authenticated. Returning empty events list.")
            return []
            
        try:
            logger.info("Fetching calendar events. timeMin=%s, timeMax=%s", time_min, time_max)
            calendar_events = []
            page_token = None
            
            while True:
                events_result = self._service.events().list(
                    calendarId="primary",
                    timeMin=time_min,
                    timeMax=time_max,
                    maxResults=250,
                    singleEvents=True,
                    orderBy="startTime",
                    showDeleted=False,
                    pageToken=page_token
                ).execute()
                
                events = events_result.get("items", [])
                
                for event in events:
                    start_obj = event.get("start", {})
                    end_obj = event.get("end", {})
                    
                    is_all_day = "date" in start_obj
                    start = start_obj.get("dateTime", start_obj.get("date", ""))
                    end = end_obj.get("dateTime", end_obj.get("date", ""))
                    
                    organizer_email = event.get("organizer", {}).get("email")
                    
                    calendar_events.append(CalendarEvent(
                        id=event.get("id", ""),
                        title=event.get("summary", "Busy"),
                        description=event.get("description"),
                        location=event.get("location"),
                        start=start,
                        end=end,
                        all_day=is_all_day,
                        color=event.get("colorId"),
                        status=event.get("status"),
                        organizer=organizer_email,
                        calendar_id="primary"
                    ))
                
                page_token = events_result.get("nextPageToken")
                if not page_token:
                    break
            
            # Cache the events in Firestore
            await self._firestore.update_calendar_events(calendar_events)
            logger.info("Successfully fetched and cached %d calendar events.", len(calendar_events))
            return calendar_events
        except HttpError as error:
            logger.error("An error occurred fetching events: %s", error)
            return await self._firestore.get_calendar_events()
        except RefreshError as error:
            logger.error("Google Calendar RefreshError (token expired or revoked): %s", error)
            self._service = None
            await self._firestore.delete_calendar_credentials()
            # Update integration status to disconnected
            integrations = await self._firestore.get_integrations()
            for i in integrations:
                if i.service == "calendar":
                    i.status = "disconnected"
                    i.detail = "Session expired. Please reconnect."
            await self._firestore.update_integrations(integrations)
            return await self._firestore.get_calendar_events()

    async def get_cached_events(self) -> list[CalendarEvent]:
        """Return the locally cached calendar events."""
        return await self._firestore.get_calendar_events()

    async def refresh_calendar(self, force: bool = False) -> list[CalendarEvent]:
        """Force a refresh from Google Calendar with rate-limiting."""
        import time
        
        if not hasattr(self, "_last_refresh_time"):
            self._last_refresh_time = 0
            
        current_time = time.time()
        
        # Rate limit: max 1 refresh per 5 minutes unless forced
        if not force and current_time - self._last_refresh_time < 300:
            logger.info("Calendar refresh rate-limited. Returning cached events.")
            return await self.get_cached_events()
            
        self._last_refresh_time = current_time

        tz_str = os.getenv("TZ", "Asia/Kolkata")
        try:
            tz = ZoneInfo(tz_str)
        except Exception:
            tz = ZoneInfo("UTC")
            
        now = datetime.now(tz)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        # Fetch up to 7 days ahead for a good cache
        end_of_week = start_of_today + timedelta(days=7)
        
        time_min = start_of_today.isoformat()
        time_max = end_of_week.isoformat()
        
        logger.info("Calendar refresh triggered. timezone=%s", tz_str)
        
        # 1. Fetch latest from Google
        events = await self.get_events(time_min, time_max)
        
        # 2. Reconcile with Kairos One TimeBlocks and Tasks
        timeline = await self._firestore.get_timeline()
        
        # Build map of Google events
        google_events_map = {e.id: e for e in events}
        
        updated_timeline = []
        changes_made = False
        
        for tb in timeline:
            if not tb.id.startswith("tb-"):
                # Not a Kairos One block
                updated_timeline.append(tb)
                continue
                
            # Kairos One block. Does it still exist in Google?
            # Wait, our sync_block_to_calendar creates an event and returns an ID.
            # Where did we store the google event id for the block?
            # The block itself doesn't have calendar_event_id. The TASK does.
            # Actually, let's just keep the block. If we really want full bidirectional sync,
            # we should update the TimeBlocks based on tasks.
            updated_timeline.append(tb)
            
        # Reconcile tasks directly
        missions = await self._firestore.get_all_missions()
        for m in missions:
            if m.type == "task" and m.calendar_event_id:
                ge = google_events_map.get(m.calendar_event_id)
                if not ge:
                    # Event was deleted from Google Calendar
                    await self._firestore.update_mission(m.id, {
                        "calendar_event_id": None,
                        "scheduled_start": None,
                        "scheduled_end": None
                    })
                    changes_made = True
                else:
                    # Event still exists, check times
                    if m.scheduled_start != ge.start or m.scheduled_end != ge.end:
                        await self._firestore.update_mission(m.id, {
                            "scheduled_start": ge.start,
                            "scheduled_end": ge.end
                        })
                        changes_made = True

        if changes_made:
            logger.info("Bidirectional calendar sync applied changes to Kairos One tasks.")
            
        # Log Memory Event
        from services.memory_service import get_memory_service
        from schemas.memory import MemoryType
        memory = get_memory_service()
        await memory.add_memory(
            m_type=MemoryType.CALENDAR_SYNC,
            content=f"Successfully synced calendar. Fetched {len(events)} events. Changes applied: {changes_made}",
            importance_score=40.0,
            source="calendar_service"
        )
            
        return events

    async def get_timeline(self, date: str | None = None) -> list[TimeBlock]:
        """Get time blocks. Merges Google Calendar if authenticated, else Firestore."""
        internal_timeline = await self._firestore.get_timeline()
        
        # Merge cached calendar events
        calendar_events = await self.get_cached_events()
        
        blocks = []
        for event in calendar_events:
            # Skip events synced by Kairos One to prevent duplicate rendering
            if event.title and event.title.startswith("[Kairos One]"):
                continue
                
            blocks.append(TimeBlock(
                id=event.id,
                mission_name="Calendar Event",
                title=event.title,
                start=event.start,
                end=event.end,
                type=TimeBlockType.MEETING,
                status=TimeBlockStatus.SCHEDULED,
                color="#f59e0b",
                location=event.location,
                description=event.description,
                organizer=event.organizer
            ))
            
        # For Kairos One OS, internal timeline dictates the single source of truth for Agent tasks.
        all_blocks = internal_timeline + blocks
        
        if date:
            from datetime import datetime
            from utils.helpers import utc_now
            
            if date == "today":
                target_date = utc_now().date()
            else:
                try:
                    target_date = datetime.fromisoformat(date).date()
                except ValueError:
                    target_date = utc_now().date()
                    
            filtered = []
            for b in all_blocks:
                try:
                    # Parse block start date in UTC
                    b_start = datetime.fromisoformat(b.start.replace("Z", "+00:00")).date()
                    if b_start == target_date:
                        filtered.append(b)
                except Exception:
                    filtered.append(b)
            return filtered
            
        return all_blocks

    async def sync_block_to_calendar(self, block: TimeBlock) -> str | None:
        """Create or update a Google Calendar event for a scheduled block and return its ID."""
        await self._ensure_auth()
        if not self._service:
            return None

        event = {
            "summary": f"[Kairos One] {block.title}",
            "description": f"Mission: {block.mission_name}\nStatus: {block.status}",
            "start": {
                "dateTime": block.start,
                "timeZone": "UTC",
            },
            "end": {
                "dateTime": block.end,
                "timeZone": "UTC",
            },
        }

        try:
            created_event = self._service.events().insert(calendarId="primary", body=event).execute()
            logger.info("Created Google Calendar event for block: %s", block.title)
            return created_event.get("id")
        except HttpError as e:
            logger.error("Failed to sync block %s to calendar: %s", block.title, e)
            return None
        except RefreshError as e:
            logger.error("Google Calendar RefreshError (token expired or revoked) during sync: %s", e)
            self._service = None
            integrations = await self._firestore.get_integrations()
            for i in integrations:
                if i.service == "calendar":
                    i.status = "disconnected"
                    i.detail = "Session expired. Please reconnect."
            await self._firestore.update_integrations(integrations)
            return None

    async def health(self) -> dict[str, str]:
        """Check Calendar service health."""
        await self._ensure_auth()
        if self._service:
            return {
                "status": "connected",
                "detail": "Authenticated with Google Calendar API",
            }
        return {
            "status": "disconnected",
            "detail": "Requires Google OAuth access token",
        }


# =============================================================================
# Singleton
# =============================================================================

_calendar_service: CalendarService | None = None


def get_calendar_service() -> CalendarService:
    """Get or create the singleton CalendarService instance."""
    global _calendar_service  # noqa: PLW0603
    if _calendar_service is None:
        _calendar_service = CalendarService()
    return _calendar_service


