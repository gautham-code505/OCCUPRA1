import logging
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import verify_firebase_or_jwt_token
from app.database.repositories.user_repo import user_repository

logger = logging.getLogger(__name__)

# Support both Bearer and OAuth2 headers
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)
http_bearer = HTTPBearer(auto_error=False)


async def get_token_from_request(
    bearer: Optional[HTTPAuthorizationCredentials] = Depends(http_bearer),
    token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[str]:
    if bearer:
        return bearer.credentials
    if token:
        return token
    return None


async def get_current_user(token: Optional[str] = Depends(get_token_from_request)) -> Dict[str, Any]:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_firebase_or_jwt_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("user_id") or payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing user identification",
        )

    # Fetch fresh user details if stored
    user = await user_repository.get_by_id(user_id)
    if not user:
        # If user was decoded directly from JWT or Firebase without local record yet
        user = {
            "id": user_id,
            "user_id": user_id,
            "email": payload.get("email", ""),
            "role": payload.get("role", "STUDENT"),
            "name": payload.get("name", "Campus User"),
        }
    return user


async def get_optional_user(token: Optional[str] = Depends(get_token_from_request)) -> Optional[Dict[str, Any]]:
    if not token:
        return None
    try:
        return await get_current_user(token)
    except HTTPException:
        return None


async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    role = str(current_user.get("role", "")).upper()
    if role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Admin privileges required",
        )
    return current_user
