from fastapi import APIRouter, Depends
from api.dependencies import get_current_user, HTTPException
from schemas.user import UserProfile
from services.firestore_service import get_firestore_service
from services.logging_service import get_logger

logger = get_logger("users_api")
router = APIRouter(prefix="/users", tags=["Users"], dependencies=[Depends(get_current_user)])


@router.get("/{uid}", response_model=UserProfile)
async def get_user_profile(uid: str):
    """Get user profile by UID."""
    firestore = get_firestore_service()
    profile = await firestore.get_user_profile(uid)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


@router.post("/{uid}", response_model=UserProfile)
async def update_user_profile(uid: str, profile: UserProfile):
    """Update or create user profile."""
    if uid != profile.uid:
        raise HTTPException(status_code=400, detail="UID mismatch")
        
    firestore = get_firestore_service()
    await firestore.update_user_profile(profile)
    return profile
