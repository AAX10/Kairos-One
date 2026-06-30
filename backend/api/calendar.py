# =============================================================================
# Kairos One — Calendar Endpoints
# Endpoints for interacting with the Google Calendar integration.
# =============================================================================

import os
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends
from api.dependencies import get_current_user

from schemas.timeline import CalendarEvent, TimeBlock
from services.calendar_service import get_calendar_service
from pydantic import BaseModel
import httpx
from fastapi import APIRouter, Depends
from api.dependencies import get_current_user, HTTPException
from services.firestore_service import get_firestore_service

router = APIRouter(prefix="/calendar", tags=["Calendar"], dependencies=[Depends(get_current_user)])


@router.get("/primary", response_model=dict[str, str])
async def get_primary_calendar():
    """Get metadata for the primary calendar."""
    service = get_calendar_service()
    health = await service.health()
    if health["status"] == "connected":
        return {"id": "primary", "summary": "Primary Calendar"}
    return {"id": "none", "summary": "Not Connected"}


@router.get("/events/today", response_model=list[CalendarEvent])
async def get_today_events():
    """Get today's cached calendar events."""
    service = get_calendar_service()
    events = await service.get_cached_events()
    
    tz_str = os.getenv("TZ", "Asia/Kolkata")
    try:
        tz = ZoneInfo(tz_str)
    except Exception:
        tz = ZoneInfo("UTC")
        
    now_date = datetime.now(tz).date()
    
    # Filter for today
    today_events = []
    for event in events:
        try:
            start_str = event.start.replace("Z", "+00:00")
            event_dt = datetime.fromisoformat(start_str)
            if event_dt.tzinfo is None:
                event_date = event_dt.date()
            else:
                event_date = event_dt.astimezone(tz).date()
                
            if event_date == now_date:
                today_events.append(event)
        except Exception as e:
            continue
    return today_events


@router.get("/events/week", response_model=list[CalendarEvent])
async def get_week_events():
    """Get this week's cached calendar events."""
    service = get_calendar_service()
    return await service.get_cached_events()


from fastapi import BackgroundTasks

@router.post("/refresh", response_model=dict[str, str])
async def refresh_calendar(background_tasks: BackgroundTasks):
    """Force a refresh from Google Calendar API and update the cache in the background."""
    service = get_calendar_service()
    background_tasks.add_task(service.refresh_calendar)
    return {"status": "syncing"}


@router.post("/sync", response_model=dict[str, bool])
async def sync_event(block: TimeBlock):
    """Sync a single Sentinel time block to Google Calendar."""
    service = get_calendar_service()
    success = await service.sync_block_to_calendar(block)
    return {"success": success}

class CalendarExchangeRequest(BaseModel):
    auth_code: str
    redirect_uri: str = "postmessage"

class CalendarExchangeResponse(BaseModel):
    status: str
    event_count: int

@router.post("/exchange", response_model=CalendarExchangeResponse)
async def exchange_calendar_code(req: CalendarExchangeRequest):
    """Exchange OAuth authorization code for Google credentials including refresh_token."""
    from services.calendar_service import get_calendar_service
    from schemas.timeline import CalendarCredentials
    from google_auth_oauthlib.flow import Flow
    import logging
    logger = logging.getLogger("sentinel.calendar")
    
    from config import get_settings, GOOGLE_OAUTH_SCOPES
    from utils.credentials_helper import validate_persisted_credentials
    settings = get_settings()
    
    client_id = settings.google_client_id
    client_secret = settings.google_client_secret
    if not client_id or not client_secret:
        logger.error("Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in backend environment")
        raise HTTPException(status_code=500, detail="OAuth credentials not configured on backend")
        
    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }
    
    try:

        flow = Flow.from_client_config(
            client_config,
            scopes=GOOGLE_OAUTH_SCOPES,
            redirect_uri=req.redirect_uri
        )

        logger.info(
            "Calendar OAuth Exchange | ClientID: %s | RedirectURI: %s | AuthCodeLength: %d | Scopes: %s | Flow: %s",
            client_id, req.redirect_uri, len(req.auth_code), GOOGLE_OAUTH_SCOPES, "auth-code"
        )

        try:
            flow.fetch_token(code=req.auth_code)
        except Exception as flow_err:

            raise flow_err
            
        credentials = flow.credentials
        
        if not credentials.refresh_token:
            logger.error("OAuth exchange aborted: Google did not return a refresh_token. This happens when the user has already granted access previously. The user must revoke access in their Google Account settings and reconnect to generate a new refresh_token.")
            raise HTTPException(status_code=400, detail="Missing refresh token. Please revoke access in your Google Account security settings and try connecting again.")
        
        # Get email from token info
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://www.googleapis.com/oauth2/v3/tokeninfo?access_token={credentials.token}")
            email = resp.json().get("email", "unknown@gmail.com") if resp.status_code == 200 else "unknown@gmail.com"

        creds = CalendarCredentials(
            access_token=credentials.token,
            refresh_token=credentials.refresh_token,
            expiry=credentials.expiry,
            scopes=list(credentials.scopes) if credentials.scopes else [],
            email=email,
            client_id=client_id,
            client_secret=client_secret,
            token_uri="https://oauth2.googleapis.com/token",
        )

        cal = get_calendar_service()
        await cal.set_credentials(creds)
        
        # Verify persistence
        firestore = get_firestore_service()
        stored_creds = await firestore.get_calendar_credentials()
        
        missing_fields = validate_persisted_credentials(stored_creds)
            
        if missing_fields:
            logger.error("OAuth exchange failed: The following fields were not persisted to Firestore: %s", ", ".join(missing_fields))
            raise HTTPException(status_code=500, detail=f"OAuth exchange failed due to missing fields: {', '.join(missing_fields)}")
        
        # Update integration status to connected
        from schemas.timeline import IntegrationStatus, IntegrationService, IntegrationStatusType
        from datetime import datetime
        
        integrations = await firestore.get_integrations()
        found = False
        for i in integrations:
            if i.service == "calendar":
                i.status = IntegrationStatusType.CONNECTED
                i.detail = f"Authenticated as {creds.email}"
                i.last_sync = datetime.utcnow().isoformat()
                found = True
                break
                
        if not found:
            integrations.append(IntegrationStatus(
                service=IntegrationService.CALENDAR,
                status=IntegrationStatusType.CONNECTED,
                last_sync=datetime.utcnow().isoformat(),
                detail=f"Authenticated as {creds.email}"
            ))
            
        await firestore.update_integrations(integrations)
        
        # Update user profile to reflect calendar is connected
        user_profile = await firestore.get_active_user_profile()
        if user_profile and user_profile.uid != "fallback":
            user_profile.calendar_connected = True
            await firestore.update_user_profile(user_profile)
        
        # Immediately fetch and cache events
        events = await cal.refresh_calendar()

        return {"status": "authenticated", "event_count": len(events)}
    except Exception as e:
        logger.exception("Failed to exchange auth code: %s", str(e))
        raise HTTPException(status_code=401, detail="Failed to exchange authorization code")

