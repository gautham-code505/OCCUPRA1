from typing import List, Optional
from fastapi import APIRouter, Query
from app.schemas.recommendation import RecommendationResponse
from app.schemas.resource import ResourceType
from app.services.recommendation_service import recommendation_service

router = APIRouter(prefix="/recommendations", tags=["Smart Recommendations"])


@router.get("", response_model=RecommendationResponse, summary="Get ranked smart resource recommendations")
async def get_recommendations(
    resource_type: Optional[ResourceType] = Query(None, description="Preferred category of campus facility"),
    max_crowd: Optional[float] = Query(80.0, ge=0.0, le=100.0, description="Max acceptable occupancy %"),
    min_available_seats: Optional[int] = Query(1, ge=1, description="Minimum open seats required"),
    max_distance_meters: Optional[int] = Query(1500, ge=10, le=10000, description="Maximum walking distance"),
    facility: Optional[List[str]] = Query(None, description="Required facilities (e.g. WiFi, Power Outlets)"),
    user_lat: Optional[float] = Query(37.7749, description="Student current latitude"),
    user_lon: Optional[float] = Query(-122.4194, description="Student current longitude"),
):
    """
    Intelligently ranks campus facilities by scoring live occupancy, XGBoost future crowd forecasts,
    walking distance, operating hours, and required student amenities.
    """
    type_str = resource_type.value if resource_type else None
    return await recommendation_service.get_recommendations(
        resource_type=type_str,
        max_crowd_pct=max_crowd,
        min_available_seats=min_available_seats,
        max_distance_meters=max_distance_meters,
        required_facilities=facility,
        user_lat=user_lat,
        user_lon=user_lon,
    )
