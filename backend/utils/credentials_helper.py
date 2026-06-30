from datetime import datetime
from typing import Any

from google.oauth2.credentials import Credentials

from schemas.timeline import CalendarCredentials

def serialize_credentials(creds: CalendarCredentials) -> dict[str, Any]:
    """Serialize CalendarCredentials to a dictionary for Firestore."""
    data = creds.model_dump(by_alias=True)
    if creds.expiry:
        # Convert datetime to ISO string for Firestore serialization
        data["expiry"] = creds.expiry.isoformat()
    return data

def deserialize_credentials(data: dict[str, Any]) -> CalendarCredentials:
    """Deserialize Firestore dictionary to CalendarCredentials."""
    if "expiry" in data and data["expiry"] and isinstance(data["expiry"], str):
        data["expiry"] = datetime.fromisoformat(data["expiry"])
    return CalendarCredentials(**data)

def build_google_credentials(creds: CalendarCredentials) -> Credentials:
    """Build google.oauth2.credentials.Credentials from CalendarCredentials."""
    return Credentials(
        token=creds.access_token,
        refresh_token=creds.refresh_token,
        token_uri=creds.token_uri or "https://oauth2.googleapis.com/token",
        client_id=creds.client_id,
        client_secret=creds.client_secret,
        scopes=creds.scopes,
        expiry=creds.expiry
    )

def validate_persisted_credentials(stored_creds: CalendarCredentials | None) -> list[str]:
    """Verify that all required fields are present in the stored credentials."""
    missing_fields = []
    if not stored_creds:
        return ["entire_document"]

    if not stored_creds.access_token: missing_fields.append("access_token")
    if not stored_creds.refresh_token: missing_fields.append("refresh_token")
    if not stored_creds.client_id: missing_fields.append("client_id")
    if not stored_creds.client_secret: missing_fields.append("client_secret")
    if not stored_creds.token_uri: missing_fields.append("token_uri")
    if stored_creds.expiry is None: missing_fields.append("expiry")
    if not stored_creds.scopes: missing_fields.append("scopes")

    return missing_fields
