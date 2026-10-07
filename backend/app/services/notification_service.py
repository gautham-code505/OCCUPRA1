import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.database.repositories.notification_repo import notification_repository
from app.schemas.notification import NotificationCreate, NotificationType


class NotificationService:
    def __init__(self):
        self.repo = notification_repository

    async def create_notification(
        self,
        title: str,
        message: str,
        notif_type: NotificationType = NotificationType.CROWD_ALERT,
        user_id: Optional[str] = None,
        resource_id: Optional[str] = None
    ) -> Dict[str, Any]:
        notif_id = str(uuid.uuid4())
        data = {
            "id": notif_id,
            "notification_id": notif_id,
            "user_id": user_id or "all",
            "title": title,
            "message": message,
            "type": notif_type.value if hasattr(notif_type, "value") else notif_type,
            "resource_id": resource_id,
            "is_read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await self.repo.set(notif_id, data)
        return data

    async def get_notifications(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        return await self.repo.get_for_user_or_broadcast(user_id)

    async def mark_as_read(self, notification_id: str) -> Optional[Dict[str, Any]]:
        existing = await self.repo.get_by_id(notification_id)
        if not existing:
            # Check by notification_id attribute
            all_notifs = await self.repo.get_all()
            for n in all_notifs:
                if n.get("notification_id") == notification_id:
                    existing = n
                    break
        if not existing:
            return None
        doc_id = existing.get("id") or notification_id
        return await self.repo.update(doc_id, {"is_read": True})

    async def check_and_trigger_crowd_alert(
        self,
        resource_id: str,
        resource_name: str,
        occupancy_pct: float
    ):
        """Triggers a notification if a resource crosses high threshold (80%)."""
        if occupancy_pct >= 80.0:
            # Avoid flooding: check if there's a recent notification in last 10 minutes
            recent = await self.repo.get_all()
            for n in recent[:5]:
                if n.get("resource_id") == resource_id and n.get("type") == NotificationType.CROWD_ALERT.value:
                    return

            await self.create_notification(
                title=f"Crowd Alert: {resource_name}",
                message=f"{resource_name} has reached high crowd levels ({occupancy_pct:.1f}% capacity).",
                notif_type=NotificationType.CROWD_ALERT,
                resource_id=resource_id
            )


notification_service = NotificationService()
