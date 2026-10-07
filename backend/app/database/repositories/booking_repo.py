from typing import List, Optional, Dict, Any
from app.database.repositories.base_repo import BaseRepository


class BookingRepository(BaseRepository):
    def __init__(self):
        super().__init__(collection_name="bookings")

    async def get_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        bookings = await self.get_all()
        return [b for b in bookings if b.get("user_id") == user_id]

    async def get_by_resource(self, resource_id: str, active_only: bool = True) -> List[Dict[str, Any]]:
        bookings = await self.get_all()
        results = [b for b in bookings if b.get("resource_id") == resource_id]
        if active_only:
            results = [b for b in results if b.get("status") in ["confirmed", "active", "pending"]]
        return results


booking_repository = BookingRepository()
