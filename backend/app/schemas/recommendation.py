from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.resource import ResourceType, CrowdStatus


class RecommendationItem(BaseModel):
    resource_id: str
    name: str
    type: ResourceType
    building: str
    floor: int
    match_score: int = Field(..., description="Calculated recommendation score from 0 to 100")
    current_occupancy: int
    capacity: int
    available_seats: int
    distance_meters: int
    current_occupancy_percentage: float
    crowd_status: CrowdStatus
    predicted_occupancy_1hr: int
    predicted_percentage_1hr: float
    facilities: List[str]
    match_reasons: List[str] = Field(default_factory=list)


class RecommendationResponse(BaseModel):
    total_matches: int
    query_criteria: dict
    recommendations: List[RecommendationItem]
