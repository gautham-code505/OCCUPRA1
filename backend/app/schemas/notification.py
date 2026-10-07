from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


class NotificationType(str, Enum):
    CROWD_ALERT = "crowd_alert"
    PREDICTION_SURGE = "prediction_surge"
    AVAILABILITY = "availability"
    BOOKING_REMINDER = "booking_reminder"
    SYSTEM = "system"


class NotificationCreate(BaseModel):
    user_id: Optional[str] = Field(default=None, description="Specific user ID or None/'all' for campus-wide broadcast")
    title: str
    message: str
    type: NotificationType = NotificationType.CROWD_ALERT
    resource_id: Optional[str] = None


class NotificationResponse(BaseModel):
    id: str
    notification_id: str
    user_id: Optional[str] = None
    title: str
    message: str
    type: NotificationType
    resource_id: Optional[str] = None
    is_read: bool = False
    created_at: str
