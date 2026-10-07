from typing import List, Optional, Dict, Any
from app.database.repositories.base_repo import BaseRepository


class ResourceRepository(BaseRepository):
    def __init__(self):
        super().__init__(collection_name="campus_resources")

    async def get_by_resource_id(self, resource_id: str) -> Optional[Dict[str, Any]]:
        # Check both resource_id and id
        doc = await self.get_by_id(resource_id)
        if doc:
            return doc
        all_res = await self.get_all()
        for r in all_res:
            if r.get("resource_id") == resource_id:
                return r
        return None

    async def filter_resources(
        self,
        resource_type: Optional[str] = None,
        building: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        resources = await self.get_all()
        filtered = []
        for r in resources:
            if resource_type and r.get("type", "").lower() != resource_type.lower():
                continue
            if building and r.get("building", "").lower() != building.lower():
                continue
            if status and r.get("status", "").lower() != status.lower():
                continue
            filtered.append(r)
        return filtered


resource_repository = ResourceRepository()
