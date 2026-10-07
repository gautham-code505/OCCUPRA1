from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from app.schemas.resource import CrowdStatus, ResourceType


class VirtualSensorReading(BaseModel):
    resource_id: str
    timestamp: str
    capacity: int
    current_occupancy: int
    occupancy_percentage: float
    entry_count: int
    exit_count: int
    available_capacity: int
    utilization_rate: float
    sensor_status: str = "online"
    crowd_status: CrowdStatus = CrowdStatus.LOW


class CampusSummaryResponse(BaseModel):
    total_resources: int
    total_campus_capacity: int
    total_current_occupancy: int
    overall_occupancy_percentage: float
    quiet_resources_count: int
    moderate_resources_count: int
    crowded_resources_count: int
    thresholds: Dict[str, float]
    timestamp: str


class HeatmapPoint(BaseModel):
    resource_id: str
    name: str
    latitude: float
    longitude: float
    occupancy_percentage: float
    crowd_status: CrowdStatus
    resource_type: ResourceType
    current_occupancy: int
    capacity: int


class HistoricalReading(BaseModel):
    resource_id: str
    timestamp: str
    occupancy: int
    occupancy_percentage: float
    entry_count: int
    exit_count: int


class PeakHourStat(BaseModel):
    hour: int
    hour_label: str
    average_occupancy_percentage: float
    peak_resource_id: Optional[str] = None
    peak_resource_name: Optional[str] = None
