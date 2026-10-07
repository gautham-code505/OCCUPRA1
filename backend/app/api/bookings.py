from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.booking import BookingCreate, BookingResponse
from app.services.booking_service import booking_service
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/bookings", tags=["Resource Bookings"])


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED, summary="Create a new resource reservation")
async def create_booking(
    booking_in: BookingCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Reserves study rooms, lab computers, or meeting halls with automatic capacity,
    opening hour, and time-conflict validation.
    """
    return await booking_service.create_booking(current_user, booking_in)


@router.get("", response_model=List[BookingResponse], summary="List user reservations (or all for admin)")
async def list_bookings(
    current_user: dict = Depends(get_current_user),
):
    """
    Retrieves bookings associated with the authenticated student or all bookings if admin.
    """
    return await booking_service.list_bookings(current_user)


@router.get("/{booking_id}", response_model=BookingResponse, summary="Get reservation details")
async def get_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Fetches details for a specific reservation by ID.
    """
    booking = await booking_service.get_booking_by_id(booking_id, current_user)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking '{booking_id}' was not found.",
        )
    return booking


@router.delete("/{booking_id}", summary="Cancel a reservation")
async def cancel_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Cancels an active reservation.
    """
    cancelled = await booking_service.cancel_booking(booking_id, current_user)
    return {"message": f"Booking '{booking_id}' successfully cancelled.", "success": cancelled}
