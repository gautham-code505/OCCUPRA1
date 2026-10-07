from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.database.repositories.resource_repo import resource_repository
from app.database.repositories.occupancy_repo import occupancy_repository
from app.services.resource_service import compute_crowd_status
from app.schemas.resource import CrowdStatus


class OccupancyService:
    def __init__(self):
        self.resource_repo = resource_repository
        self.occupancy_repo = occupancy_repository

    async def get_all_live_occupancies(self) -> List[Dict[str, Any]]:
        resources = await self.resource_repo.get_all()
        live_list = []

        for r in resources:
            res_id = r.get("resource_id") or r.get("id")
            occ = await self.occupancy_repo.get_current_for_resource(res_id)
            if not occ:
                # Default reading
                cap = r.get("capacity", 100)
                curr = r.get("current_occupancy", 0)
                pct = round((curr / max(cap, 1)) * 100, 1)
                occ = {
                    "resource_id": res_id,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "capacity": cap,
                    "current_occupancy": curr,
                    "occupancy_percentage": pct,
                    "entry_count": 0,
                    "exit_count": 0,
                    "available_capacity": max(0, cap - curr),
                    "utilization_rate": pct,
                    "sensor_status": "online",
                    "crowd_status": compute_crowd_status(pct).value
                }
            live_list.append(occ)

        return live_list

    async def get_live_occupancy_by_resource(self, resource_id: str) -> Optional[Dict[str, Any]]:
        res = await self.resource_repo.get_by_resource_id(resource_id)
        if not res:
            return None

        occ = await self.occupancy_repo.get_current_for_resource(resource_id)
        if not occ:
            cap = res.get("capacity", 100)
            curr = res.get("current_occupancy", 0)
            pct = round((curr / max(cap, 1)) * 100, 1)
            occ = {
                "resource_id": resource_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "capacity": cap,
                "current_occupancy": curr,
                "occupancy_percentage": pct,
                "entry_count": 0,
                "exit_count": 0,
                "available_capacity": max(0, cap - curr),
                "utilization_rate": pct,
                "sensor_status": "online",
                "crowd_status": compute_crowd_status(pct).value
            }
        return occ

    async def get_campus_summary(self) -> Dict[str, Any]:
        resources = await self.resource_repo.get_all()
        total_resources = len(resources)
        total_capacity = sum(int(r.get("capacity", 0)) for r in resources)
        total_occupancy = 0
        quiet_count = 0
        moderate_count = 0
        crowded_count = 0

        for r in resources:
            res_id = r.get("resource_id") or r.get("id")
            occ = await self.occupancy_repo.get_current_for_resource(res_id)
            current_occ = occ.get("current_occupancy") if occ else r.get("current_occupancy", 0)
            total_occupancy += current_occ

            cap = int(r.get("capacity", 1))
            pct = occ.get("occupancy_percentage") if occ else round((current_occ / cap) * 100, 1)
            crowd = compute_crowd_status(pct)

            if crowd == CrowdStatus.LOW:
                quiet_count += 1
            elif crowd == CrowdStatus.MEDIUM:
                moderate_count += 1
            else:
                crowded_count += 1

        overall_pct = round((total_occupancy / max(total_capacity, 1)) * 100, 1)

        return {
            "total_resources": total_resources,
            "total_campus_capacity": total_capacity,
            "total_current_occupancy": total_occupancy,
            "overall_occupancy_percentage": overall_pct,
            "quiet_resources_count": quiet_count,
            "moderate_resources_count": moderate_count,
            "crowded_resources_count": crowded_count,
            "thresholds": {
                "low": settings.LOW_CROWD_THRESHOLD,
                "medium": settings.MEDIUM_CROWD_THRESHOLD,
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def get_heatmap_data(self) -> List[Dict[str, Any]]:
        resources = await self.resource_repo.get_all()
        heatmap_points = []

        for r in resources:
            res_id = r.get("resource_id") or r.get("id")
            occ = await self.occupancy_repo.get_current_for_resource(res_id)
            cap = int(r.get("capacity", 1))
            current_occ = occ.get("current_occupancy") if occ else r.get("current_occupancy", 0)
            pct = occ.get("occupancy_percentage") if occ else round((current_occ / cap) * 100, 1)

            heatmap_points.append({
                "resource_id": res_id,
                "name": r.get("name", res_id),
                "latitude": float(r.get("latitude", 0.0)),
                "longitude": float(r.get("longitude", 0.0)),
                "occupancy_percentage": pct,
                "crowd_status": compute_crowd_status(pct).value,
                "resource_type": r.get("type", "other"),
                "current_occupancy": current_occ,
                "capacity": cap,
            })

        return heatmap_points


occupancy_service = OccupancyService()
