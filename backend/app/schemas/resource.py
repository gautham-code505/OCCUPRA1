from typing import List, Optional
from enum import Enum
from pydantic import BaseModel, Field


class ResourceType(str, Enum):
    LIBRARY = "library"
    COMPUTER_LAB = "computer_lab"
    CLASSROOM = "classroom"
    STUDY_ROOM = "study_room"
    CAFETERIA = "cafeteria"
    SEMINAR_HALL = "seminar_hall"
    LABORATORY = "laboratory"
    OTHER = "other"


class CrowdStatus(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ResourceBase(BaseModel):
    name: str = Field(..., description="Display name of campus resource")
    type: ResourceType = Field(..., description="Category of resource")
    building: str = Field(..., description="Campus building name/number")
    floor: int = Field(default=1, description="Floor number")
    latitude: float = Field(..., description="Campus latitude coordinate")
    longitude: float = Field(..., description="Campus longitude coordinate")
    capacity: int = Field(..., gt=0, description="Total seating/capacity count")
    facilities: List[str] = Field(default_factory=list, description="Available amenities (WiFi, Power sockets, etc.)")
    opening_time: str = Field(default="08:00", description="Opening time in HH:MM format")
    closing_time: str = Field(default="22:00", description="Closing time in HH:MM format")
    status: str = Field(default="open", description="Operating status (open, closed, maintenance)")


class ResourceCreate(ResourceBase):
    resource_id: str = Field(..., description="Unique alphanumeric identifier")


class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[ResourceType] = None
    building: Optional[str] = None
    floor: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    capacity: Optional[int] = None
    facilities: Optional[List[str]] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
    status: Optional[str] = None


class ResourceResponse(ResourceBase):
    resource_id: str
    current_occupancy: int = Field(default=0)
    occupancy_percentage: float = Field(default=0.0)
    available_capacity: int = Field(default=0)
    crowd_status: CrowdStatus = Field(default=CrowdStatus.LOW)
    updated_at: Optional[str] = None
