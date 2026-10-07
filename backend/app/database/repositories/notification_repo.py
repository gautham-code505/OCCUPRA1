from typing import List, Optional, Dict, Any
from app.database.repositories.base_repo import BaseRepository


class NotificationRepository(BaseRepository):
    def __init__(self):
        super().__init__(collection_name="notifications")

    async def get_for_user_or_broadcast(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        all_notifs = await self.get_all()
        # Sort newest first
        all_notifs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        if not user_id:
            return all_notifs
        return [
            n for n in all_notifs
            if n.get("user_id") is None or n.get("user_id") == "all" or n.get("user_id") == user_id
        ]


notification_repository = NotificationRepository()
