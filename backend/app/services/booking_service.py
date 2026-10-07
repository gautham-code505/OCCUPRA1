import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from app.database.repositories.booking_repo import booking_repository
from app.database.repositories.resource_repo import resource_repository
from app.schemas.booking import BookingCreate, BookingStatus


class BookingService:
    def __init__(self):
        self.booking_repo = booking_repository
        self.resource_repo = resource_repository

    async def create_booking(self, user: Dict[str, Any], data: BookingCreate) -> Dict[str, Any]:
        user_id = user.get("id") or user.get("user_id", "guest_student")

        # 1. Verify resource exists
        resource = await self.resource_repo.get_by_resource_id(data.resource_id)
        if not resource:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resource '{data.resource_id}' does not exist.",
            )

        # 2. Validate time format and bounds
        try:
            start_dt = datetime.fromisoformat(data.start_time.replace("Z", "+00:00"))
            end_dt = datetime.fromisoformat(data.end_time.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ISO 8601 datetime format for start_time or end_time (e.g. '2026-10-07T14:00:00').",
            )

        if start_dt >= end_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Booking start_time must be strictly earlier than end_time.",
            )

        # 3. Check opening and closing hours
        open_time = resource.get("opening_time", "08:00")
        close_time = resource.get("closing_time", "22:00")
        try:
            open_h, open_m = map(int, open_time.split(":"))
            close_h, close_m = map(int, close_time.split(":"))
            
            # Convert to minutes of day
            start_mins = start_dt.hour * 60 + start_dt.minute
            end_mins = end_dt.hour * 60 + end_dt.minute
            open_mins = open_h * 60 + open_m
            close_mins = close_h * 60 + close_m

            if start_mins < open_mins or end_mins > close_mins:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Resource operating hours are {open_time} - {close_time}. Requested slot falls outside opening hours.",
                )
        except HTTPException:
            raise
        except Exception:
            pass

        # 4. Check capacity & conflicting active bookings in overlapping window
        capacity = int(resource.get("capacity", 50))
        if data.number_of_seats > capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requested {data.number_of_seats} seats, but total capacity is only {capacity}.",
            )

        active_bookings = await self.booking_repo.get_by_resource(data.resource_id, active_only=True)
        overlapping_seats = 0
        for b in active_bookings:
            try:
                b_start = datetime.fromisoformat(b["start_time"].replace("Z", "+00:00"))
                b_end = datetime.fromisoformat(b["end_time"].replace("Z", "+00:00"))
                # Overlap condition: start < b_end and end > b_start
                if start_dt < b_end and end_dt > b_start:
                    overlapping_seats += int(b.get("number_of_seats", 1))
            except Exception:
                continue

        if (overlapping_seats + data.number_of_seats) > capacity:
            remaining_seats = max(0, capacity - overlapping_seats)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Resource capacity conflict: Only {remaining_seats} seats remaining for the selected time window.",
            )

        # 5. Create booking record
        booking_id = str(uuid.uuid4())
        record = {
            "id": booking_id,
            "booking_id": booking_id,
            "user_id": user_id,
            "user_name": user.get("name", "Student"),
            "resource_id": data.resource_id,
            "resource_name": resource.get("name", data.resource_id),
            "start_time": data.start_time,
            "end_time": data.end_time,
            "number_of_seats": data.number_of_seats,
            "status": BookingStatus.CONFIRMED.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        saved = await self.booking_repo.set(booking_id, record)
        return saved

    async def list_bookings(self, user: Dict[str, Any]) -> List[Dict[str, Any]]:
        is_admin = str(user.get("role", "")).upper() == "ADMIN"
        if is_admin:
            return await self.booking_repo.get_all()
        user_id = user.get("id") or user.get("user_id")
        return await self.booking_repo.get_by_user(user_id)

    async def get_booking_by_id(self, booking_id: str, user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            return None
        
        is_admin = str(user.get("role", "")).upper() == "ADMIN"
        user_id = user.get("id") or user.get("user_id")
        if not is_admin and booking.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to view this booking.",
            )
        return booking

    async def cancel_booking(self, booking_id: str, user: Dict[str, Any]) -> bool:
        booking = await self.booking_repo.get_by_id(booking_id)
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking '{booking_id}' not found.",
            )

        is_admin = str(user.get("role", "")).upper() == "ADMIN"
        user_id = user.get("id") or user.get("user_id")
        if not is_admin and booking.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to cancel this booking.",
            )

        await self.booking_repo.update(booking_id, {"status": BookingStatus.CANCELLED.value})
        return True


booking_service = BookingService()
