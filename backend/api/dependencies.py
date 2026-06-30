# =============================================================================
# Kairos One — API Dependencies
# Authorization and common injection dependencies.
# =============================================================================

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from firebase_admin import auth

from schemas.user import UserProfile
from services.logging_service import get_logger
from utils.context import current_user_id

logger = get_logger("auth")
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserProfile:
    """
    Verify Firebase JWT and return the authenticated user profile.
    Raises 401 if token is invalid, expired, or missing.
    """
    token = credentials.credentials
    try:
        # Verify token synchronously in a fast call to memory/cached keys
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token.get("uid")
        if not uid:
            raise ValueError("Token does not contain a valid UID.")
        
        current_user_id.set(uid)
            
        email = decoded_token.get("email", "")
        name = decoded_token.get("name", "User")
        picture = decoded_token.get("picture")
        
        # We construct a partial UserProfile just for backend request context.
        return UserProfile(
            uid=uid,
            email=email,
            display_name=name,
            photo_url=picture,
            provider="firebase",
        )
        
    except auth.ExpiredIdTokenError:
        logger.warning("Expired Firebase ID token received.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Firebase token expired. Please refresh your session.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.InvalidIdTokenError:
        logger.warning("Invalid Firebase ID token received.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Error verifying Firebase token: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed.",
            headers={"WWW-Authenticate": "Bearer"},
        )
