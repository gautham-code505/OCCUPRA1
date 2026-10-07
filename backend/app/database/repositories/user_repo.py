from typing import List, Optional, Dict, Any
from app.database.repositories.base_repo import BaseRepository


class UserRepository(BaseRepository):
    def __init__(self):
        super().__init__(collection_name="users")

    async def get_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        users = await self.get_all()
        for u in users:
            if u.get("email", "").lower() == email.lower():
                return u
        return None


user_repository = UserRepository()
