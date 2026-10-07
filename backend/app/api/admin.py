from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from app.services.admin_service import admin_service
from app.services.analytics_service import analytics_service
from app.core.dependencies import require_admin

router = APIRouter(prefix="/admin", tags=["Admin Analytics & Insights"])


@router.get("/analytics", summary="Get comprehensive admin campus overview (Admin)")
async def get_admin_analytics(admin: dict = Depends(require_admin)):
    """
    Admin-only: High-level dashboard overview showing capacity metrics,
    top crowded areas, and least crowded spaces.
    """
    return await admin_service.get_overview_analytics()


@router.get("/utilization", summary="Get detailed utilization breakdown per facility (Admin)")
async def get_admin_utilization(admin: dict = Depends(require_admin)):
    """
    Admin-only: Facility-by-facility occupancy breakdown with status categorization
    (overcrowded, optimal, underutilized).
    """
    return await admin_service.get_utilization_breakdown()


@router.get("/peak-hours", summary="Get campus peak hours breakdown (Admin)")
async def get_admin_peak_hours(admin: dict = Depends(require_admin)):
    """
    Admin-only: Pinpoints high-traffic temporal bottlenecks across buildings.
    """
    return await analytics_service.get_peak_hours()


@router.get("/insights", summary="Generate automated campus insights & recommendations (Admin)")
async def get_admin_insights(admin: dict = Depends(require_admin)):
    """
    Admin-only: Synthesizes intelligent insights derived from real-time occupancy,
    predictive trends, and historical distributions.
    """
    return await admin_service.generate_dynamic_insights()
