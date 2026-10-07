from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.notification import NotificationResponse
from app.services.notification_service import notification_service
from app.core.dependencies import get_optional_user

router = APIRouter(prefix="/notifications", tags=["Smart Alerts & Notifications"])


@router.get("", response_model=List[NotificationResponse], summary="Get campus alerts and notifications")
async def get_notifications(
    current_user: Optional[dict] = Depends(get_optional_user),
):
    """
    Returns live crowd alerts, predicted surge warnings, and booking updates
    relevant to the user or broadcast campus-wide.
    """
    user_id = current_user.get("id") or current_user.get("user_id") if current_user else None
    return await notification_service.get_notifications(user_id=user_id)


@router.post("/{notification_id}/read", response_model=NotificationResponse, summary="Mark notification as read")
async def mark_notification_read(
    notification_id: str,
):
    """
    Marks a notification as viewed/read.
    """
    updated = await notification_service.mark_as_read(notification_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification '{notification_id}' was not found.",
        )
    return updated
