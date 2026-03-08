"""Auth routes.

Registration and login are handled entirely by Supabase Auth on the frontend.
This router only exposes /me for the frontend to fetch the local user profile.
The local profile is auto-created on first authenticated request (see deps.py).
"""

from fastapi import APIRouter, Depends

from app.models.user import User
from app.api.schemas import UserResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
