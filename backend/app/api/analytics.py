from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException, status
from app.services.analytics_service import analytics_service

router = APIRouter(tags=["Historical Analytics"])


@router.get("/history/{resource_id}", summary="Get historical occupancy readings for a resource")
async def get_history(
    resource_id: str,
    start_time: Optional[str] = Query(None, description="ISO format start datetime filter"),
    end_time: Optional[str] = Query(None, description="ISO format end datetime filter"),
    limit: int = Query(100, ge=1, le=1000, description="Max readings to return"),
):
    """
    Returns time-series historical sensor records (timestamp, occupancy, entry/exit rates)
    stored in the database for the selected campus facility.
    """
    return await analytics_service.get_resource_history(
        resource_id=resource_id,
        start_time=start_time,
        end_time=end_time,
        limit=limit,
    )


@router.get("/analytics/daily", summary="Get hourly occupancy breakdown for a 24-hour cycle")
async def get_daily_analytics(
    resource_id: Optional[str] = Query(None, description="Filter for specific resource or campus-wide"),
    date: Optional[str] = Query(None, description="Target date in YYYY-MM-DD format"),
):
    """
    Aggregates historical and current sensor data into 24-hour buckets for daily trends.
    """
    return await analytics_service.get_daily_analytics(resource_id=resource_id, target_date=date)


@router.get("/analytics/weekly", summary="Get daily occupancy trends across the 7-day week")
async def get_weekly_analytics(
    resource_id: Optional[str] = Query(None, description="Filter for specific resource or campus-wide"),
):
    """
    Returns aggregate day-by-day utilization patterns (Monday through Sunday)
    showing weekday versus weekend dynamics.
    """
    return await analytics_service.get_weekly_analytics(resource_id=resource_id)


@router.get("/analytics/peak-hours", summary="Discover top peak congestion hours")
async def get_peak_hours(
    resource_id: Optional[str] = Query(None, description="Filter for specific resource or campus-wide"),
):
    """
    Identifies the highest traffic hours of the day to help students avoid peak rushes.
    """
    return await analytics_service.get_peak_hours(resource_id=resource_id)
