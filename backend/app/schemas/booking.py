from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


class BookingStatus(str, Enum):
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class BookingCreate(BaseModel):
    resource_id: str = Field(..., description="Target campus resource ID")
    start_time: str = Field(..., description="ISO 8601 start datetime string (e.g. 2026-10-07T14:00:00)")
    end_time: str = Field(..., description="ISO 8601 end datetime string (e.g. 2026-10-07T16:00:00)")
    number_of_seats: int = Field(default=1, gt=0, description="Number of seats reserved")


class BookingResponse(BaseModel):
    booking_id: str
    user_id: str
    user_name: Optional[str] = None
    resource_id: str
    resource_name: Optional[str] = None
    start_time: str
    end_time: str
    number_of_seats: int
    status: BookingStatus
    created_at: str
    updated_at: Optional[str] = None
