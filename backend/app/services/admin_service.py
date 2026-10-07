from datetime import datetime, timezone
from typing import List, Dict, Any
from app.database.repositories.resource_repo import resource_repository
from app.database.repositories.occupancy_repo import occupancy_repository
from app.services.occupancy_service import occupancy_service
from app.ml.predict import predict_resource_crowd
from app.core.config import settings


class AdminService:
    def __init__(self):
        self.resource_repo = resource_repository
        self.occupancy_repo = occupancy_repository
        self.occupancy_service = occupancy_service

    async def get_overview_analytics(self) -> Dict[str, Any]:
        campus_summary = await self.occupancy_service.get_campus_summary()
        resources = await self.resource_repo.get_all()
        
        # Categorize resources by utilization
        utilizations = []
        for r in resources:
            res_id = r.get("resource_id") or r.get("id")
            live = await self.occupancy_service.get_live_occupancy_by_resource(res_id)
            pct = live["occupancy_percentage"] if live else 0.0
            utilizations.append({
                "resource_id": res_id,
                "name": r.get("name", res_id),
                "type": r.get("type", "other"),
                "capacity": r.get("capacity", 100),
                "current_occupancy": live["current_occupancy"] if live else 0,
                "utilization_rate": pct,
            })

        utilizations.sort(key=lambda x: x["utilization_rate"], reverse=True)

        return {
            "summary": campus_summary,
            "most_crowded": utilizations[:3],
            "least_crowded": utilizations[-3:] if len(utilizations) >= 3 else utilizations,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    async def get_utilization_breakdown(self) -> List[Dict[str, Any]]:
        resources = await self.resource_repo.get_all()
        breakdown = []

        for r in resources:
            res_id = r.get("resource_id") or r.get("id")
            live = await self.occupancy_service.get_live_occupancy_by_resource(res_id)
            cap = int(r.get("capacity", 100))
            curr = live["current_occupancy"] if live else 0
            pct = live["occupancy_percentage"] if live else round((curr / cap) * 100, 1)

            breakdown.append({
                "resource_id": res_id,
                "name": r.get("name", res_id),
                "building": r.get("building", ""),
                "type": r.get("type", "other"),
                "capacity": cap,
                "current_occupancy": curr,
                "utilization_percentage": pct,
                "available_seats": max(0, cap - curr),
                "status": "overcrowded" if pct >= 75 else ("underutilized" if pct <= 30 else "optimal"),
            })

        return breakdown

    async def generate_dynamic_insights(self) -> List[Dict[str, Any]]:
        """
        Dynamically synthesizes actionable campus insights based on live data,
        historical trends, and XGBoost future crowd forecasts.
        """
        resources = await self.resource_repo.get_all()
        insights = []

        now = datetime.now(timezone.utc)

        for r in resources:
            res_id = r.get("resource_id") or r.get("id")
            res_name = r.get("name", res_id)
            live = await self.occupancy_service.get_live_occupancy_by_resource(res_id)
            if not live:
                continue

            current_pct = live.get("occupancy_percentage", 0.0)
            pred = predict_resource_crowd(r, live)
            pred_1h_pct = pred["predicted_percentages"]["1_hour"]
            pred_4h_pct = pred["predicted_percentages"]["4_hours"]

            # 1. Overcrowding alert / insight
            if current_pct >= 75.0:
                insights.append({
                    "id": f"insight-high-{res_id}",
                    "level": "warning",
                    "resource_id": res_id,
                    "insight": f"{res_name} is operating at near capacity ({current_pct:.1f}%). Suggest directing students to nearby alternative study spaces.",
                    "category": "congestion",
                })

            # 2. Predicted surge insight
            if pred_1h_pct >= 80.0 and current_pct < 75.0:
                insights.append({
                    "id": f"insight-surge-{res_id}",
                    "level": "info",
                    "resource_id": res_id,
                    "insight": f"{res_name} is projected by XGBoost to surge to {pred_1h_pct:.1f}% occupancy within 1 hour.",
                    "category": "prediction",
                })

            # 3. Underutilized resource insight
            if current_pct <= 25.0 and r.get("capacity", 0) >= 40:
                insights.append({
                    "id": f"insight-low-{res_id}",
                    "level": "positive",
                    "resource_id": res_id,
                    "insight": f"{res_name} is currently quiet and underutilized ({current_pct:.1f}% full, {live['available_capacity']} open seats available).",
                    "category": "availability",
                })

            # 4. Entry/exit flux trend
            entry = live.get("entry_count", 0)
            exit_cnt = live.get("exit_count", 0)
            if entry > exit_cnt * 2 and entry > 10:
                insights.append({
                    "id": f"insight-flow-{res_id}",
                    "level": "info",
                    "resource_id": res_id,
                    "insight": f"High inbound student influx observed at {res_name} (+{entry} entries vs -{exit_cnt} exits this cycle).",
                    "category": "traffic_flow",
                })

        return insights


admin_service = AdminService()
