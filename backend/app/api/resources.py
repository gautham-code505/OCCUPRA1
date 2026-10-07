from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.schemas.resource import ResourceCreate, ResourceUpdate, ResourceResponse, ResourceType
from app.services.resource_service import resource_service
from app.core.dependencies import require_admin, get_optional_user

router = APIRouter(prefix="/resources", tags=["Campus Resources"])


@router.get("", response_model=List[ResourceResponse], summary="List all campus resources")
async def list_resources(
    type: Optional[ResourceType] = Query(None, description="Filter by resource type"),
    building: Optional[str] = Query(None, description="Filter by building name"),
    crowd_status: Optional[str] = Query(None, description="Filter by crowd status (LOW, MEDIUM, HIGH)"),
    min_available: Optional[int] = Query(None, description="Minimum available seats required"),
):
    """
    Retrieve campus resources with their current live occupancy and crowd levels.
    Supports filtering by type, building, crowd level, and available seats.
    """
    type_str = type.value if type else None
    return await resource_service.get_all_resources(
        resource_type=type_str,
        building=building,
        crowd_status=crowd_status,
        min_available=min_available,
    )


@router.get("/{resource_id}", response_model=ResourceResponse, summary="Get resource by ID")
async def get_resource(resource_id: str):
    """
    Retrieve full details and current live occupancy metrics for a specific campus resource.
    """
    resource = await resource_service.get_resource_by_id(resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource '{resource_id}' was not found.",
        )
    return resource


@router.post("", response_model=ResourceResponse, status_code=status.HTTP_201_CREATED, summary="Create resource (Admin)")
async def create_resource(
    resource_in: ResourceCreate,
    current_admin: dict = Depends(require_admin),
):
    """
    Admin-only: Register a new campus facility or study resource.
    """
    existing = await resource_service.get_resource_by_id(resource_in.resource_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Resource with ID '{resource_in.resource_id}' already exists.",
        )
    created = await resource_service.create_resource(resource_in)
    return created


@router.put("/{resource_id}", response_model=ResourceResponse, summary="Update resource (Admin)")
async def update_resource(
    resource_id: str,
    resource_update: ResourceUpdate,
    current_admin: dict = Depends(require_admin),
):
    """
    Admin-only: Update resource specifications, facilities, or schedule.
    """
    updated = await resource_service.update_resource(resource_id, resource_update)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource '{resource_id}' was not found.",
        )
    return updated


@router.delete("/{resource_id}", status_code=status.HTTP_200_OK, summary="Delete resource (Admin)")
async def delete_resource(
    resource_id: str,
    current_admin: dict = Depends(require_admin),
):
    """
    Admin-only: Remove a campus resource.
    """
    existing = await resource_service.get_resource_by_id(resource_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource '{resource_id}' was not found.",
        )
    deleted = await resource_service.delete_resource(resource_id)
    return {"message": f"Resource '{resource_id}' successfully deleted.", "deleted": deleted}
