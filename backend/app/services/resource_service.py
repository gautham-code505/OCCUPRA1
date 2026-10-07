from typing import List, Optional, Dict, Any
from app.core.config import settings
from app.database.repositories.resource_repo import resource_repository
from app.database.repositories.occupancy_repo import occupancy_repository
from app.schemas.resource import ResourceCreate, ResourceUpdate, CrowdStatus, ResourceResponse


def compute_crowd_status(occupancy_pct: float) -> CrowdStatus:
    if occupancy_pct <= settings.LOW_CROWD_THRESHOLD:
        return CrowdStatus.LOW
    elif occupancy_pct <= settings.MEDIUM_CROWD_THRESHOLD:
        return CrowdStatus.MEDIUM
    return CrowdStatus.HIGH


class ResourceService:
    def __init__(self):
        self.repo = resource_repository
        self.occupancy_repo = occupancy_repository

    async def get_all_resources(
        self,
        resource_type: Optional[str] = None,
        building: Optional[str] = None,
        crowd_status: Optional[str] = None,
        min_available: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        resources = await self.repo.get_all()
        enriched = []

        for r in resources:
            res_id = r.get("resource_id") or r.get("id")
            # Overlay latest live occupancy if present
            live_occ = await self.occupancy_repo.get_current_for_resource(res_id)
            if live_occ:
                r["current_occupancy"] = live_occ.get("current_occupancy", r.get("current_occupancy", 0))
                r["occupancy_percentage"] = live_occ.get("occupancy_percentage", r.get("occupancy_percentage", 0.0))
                r["available_capacity"] = max(0, r.get("capacity", 0) - r["current_occupancy"])
            else:
                cap = r.get("capacity", 1)
                occ = r.get("current_occupancy", 0)
                r["occupancy_percentage"] = round((occ / cap) * 100, 1)
                r["available_capacity"] = max(0, cap - occ)

            r["crowd_status"] = compute_crowd_status(r["occupancy_percentage"])

            # Filter checks
            if resource_type and r.get("type", "").lower() != resource_type.lower():
                continue
            if building and r.get("building", "").lower() != building.lower():
                continue
            if crowd_status and r["crowd_status"] != crowd_status.upper():
                continue
            if min_available is not None and r["available_capacity"] < min_available:
                continue

            enriched.append(r)

        return enriched

    async def get_resource_by_id(self, resource_id: str) -> Optional[Dict[str, Any]]:
        res = await self.repo.get_by_resource_id(resource_id)
        if not res:
            return None
        
        live_occ = await self.occupancy_repo.get_current_for_resource(resource_id)
        if live_occ:
            res["current_occupancy"] = live_occ.get("current_occupancy", res.get("current_occupancy", 0))
            res["occupancy_percentage"] = live_occ.get("occupancy_percentage", res.get("occupancy_percentage", 0.0))
            res["available_capacity"] = max(0, res.get("capacity", 0) - res["current_occupancy"])
        else:
            cap = res.get("capacity", 1)
            occ = res.get("current_occupancy", 0)
            res["occupancy_percentage"] = round((occ / cap) * 100, 1)
            res["available_capacity"] = max(0, cap - occ)

        res["crowd_status"] = compute_crowd_status(res["occupancy_percentage"])
        return res

    async def create_resource(self, data: ResourceCreate) -> Dict[str, Any]:
        item_dict = data.model_dump()
        item_dict["current_occupancy"] = 0
        item_dict["occupancy_percentage"] = 0.0
        item_dict["available_capacity"] = item_dict["capacity"]
        item_dict["crowd_status"] = CrowdStatus.LOW
        saved = await self.repo.set(data.resource_id, item_dict)
        return saved

    async def update_resource(self, resource_id: str, data: ResourceUpdate) -> Optional[Dict[str, Any]]:
        existing = await self.repo.get_by_resource_id(resource_id)
        if not existing:
            return None
        
        update_data = {k: v for k, v in data.model_dump().items() if v is not None}
        if "capacity" in update_data:
            current_occ = existing.get("current_occupancy", 0)
            new_cap = update_data["capacity"]
            update_data["occupancy_percentage"] = round((current_occ / max(new_cap, 1)) * 100, 1)
            update_data["available_capacity"] = max(0, new_cap - current_occ)
            update_data["crowd_status"] = compute_crowd_status(update_data["occupancy_percentage"])

        return await self.repo.update(resource_id, update_data)

    async def delete_resource(self, resource_id: str) -> bool:
        return await self.repo.delete(resource_id)


resource_service = ResourceService()
