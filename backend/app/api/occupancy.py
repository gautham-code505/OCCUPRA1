from typing import List
from fastapi import APIRouter, HTTPException, status
from app.schemas.occupancy import VirtualSensorReading, CampusSummaryResponse, HeatmapPoint
from app.services.occupancy_service import occupancy_service

router = APIRouter(tags=["Live Occupancy & Heatmap"])


@router.get("/occupancy", response_model=List[VirtualSensorReading], summary="Get live occupancy for all campus resources")
async def get_all_occupancies():
    """
    Returns the real-time virtual sensor telemetry (occupancy, percentage, entry/exit flow)
    for every campus facility.
    """
    return await occupancy_service.get_all_live_occupancies()


@router.get("/occupancy/{resource_id}", response_model=VirtualSensorReading, summary="Get live occupancy for a specific resource")
async def get_resource_occupancy(resource_id: str):
    """
    Returns the latest virtual sensor reading for a specific resource ID.
    """
    reading = await occupancy_service.get_live_occupancy_by_resource(resource_id)
    if not reading:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource '{resource_id}' was not found.",
        )
    return reading


@router.get("/campus/summary", response_model=CampusSummaryResponse, summary="Campus-wide aggregate occupancy summary")
async def get_campus_summary():
    """
    Aggregates campus-wide metrics: total capacity, active occupancy, and breakdown
    into Quiet (0-40%), Moderate (41-70%), and Crowded (71-100%) resources.
    """
    return await occupancy_service.get_campus_summary()


@router.get("/heatmap", response_model=List[HeatmapPoint], summary="Geographical crowd heatmap dataset")
async def get_campus_heatmap():
    """
    Returns geographical coordinates and crowd intensities suitable for
    rendering live interactive Leaflet.js or Mapbox campus heatmaps.
    """
    return await occupancy_service.get_heatmap_data()
