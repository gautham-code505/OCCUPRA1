import math
from typing import List, Dict, Any, Optional
from app.database.repositories.resource_repo import resource_repository
from app.services.occupancy_service import occupancy_service
from app.ml.predict import predict_resource_crowd
from app.schemas.recommendation import RecommendationItem, RecommendationResponse
from app.services.resource_service import compute_crowd_status


def calculate_haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """Calculates geographical distance between two coordinate pairs in meters."""
    R = 6371000  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return int(R * c)


class RecommendationService:
    def __init__(self):
        self.resource_repo = resource_repository
        self.occupancy_service = occupancy_service

    async def get_recommendations(
        self,
        resource_type: Optional[str] = None,
        max_crowd_pct: Optional[float] = 75.0,
        min_available_seats: Optional[int] = 1,
        max_distance_meters: Optional[int] = 1500,
        required_facilities: Optional[List[str]] = None,
        user_lat: Optional[float] = 37.7749,
        user_lon: Optional[float] = -122.4194
    ) -> Dict[str, Any]:
        resources = await self.resource_repo.get_all()
        scored_candidates = []

        ref_lat = user_lat if user_lat is not None else 37.7749
        ref_lon = user_lon if user_lon is not None else -122.4194
        req_facs = [f.lower().strip() for f in (required_facilities or [])]

        for res in resources:
            res_id = res.get("resource_id") or res.get("id")
            # Check operating status
            if res.get("status") != "open":
                continue

            # Filter by resource type if specified
            if resource_type and res.get("type", "").lower() != resource_type.lower():
                continue

            # Live telemetry
            live_occ = await self.occupancy_service.get_live_occupancy_by_resource(res_id)
            capacity = int(res.get("capacity", 100))
            current_occ = live_occ["current_occupancy"] if live_occ else res.get("current_occupancy", 0)
            current_pct = live_occ["occupancy_percentage"] if live_occ else round((current_occ / capacity) * 100, 1)
            available_seats = max(0, capacity - current_occ)

            # Check min seats threshold
            if min_available_seats and available_seats < min_available_seats:
                continue

            # Distance calculation
            res_lat = float(res.get("latitude", ref_lat))
            res_lon = float(res.get("longitude", ref_lon))
            distance = calculate_haversine_distance_meters(ref_lat, ref_lon, res_lat, res_lon)

            if max_distance_meters and distance > max_distance_meters:
                continue

            # ML prediction for 1 hour ahead
            pred = predict_resource_crowd(res, live_occ or {"current_occupancy": current_occ, "occupancy_percentage": current_pct})
            pred_1h_occ = pred["predictions"]["1_hour"]
            pred_1h_pct = pred["predicted_percentages"]["1_hour"]

            # Filter out places that violate max crowd preference
            if max_crowd_pct is not None and current_pct > max_crowd_pct:
                continue

            # Compute Match Score (0 - 100)
            score = 100.0
            match_reasons = []

            # 1. Crowd score (lower crowd is better, up to 30 pts weight)
            crowd_penalty = (current_pct / 100.0) * 30.0
            score -= crowd_penalty
            if current_pct <= 40.0:
                match_reasons.append("Currently quiet with plentiful seating")

            # 2. Predicted stability (up to 20 pts weight)
            pred_penalty = (pred_1h_pct / 100.0) * 20.0
            score -= pred_penalty
            if pred_1h_pct <= 50.0:
                match_reasons.append("Predicted to stay uncrowded over the next hour")

            # 3. Distance penalty (closer is better, up to 25 pts weight)
            dist_fraction = min(1.0, distance / float(max_distance_meters or 1500))
            score -= (dist_fraction * 25.0)
            if distance <= 250:
                match_reasons.append(f"Very close ({distance}m away)")

            # 4. Facilities bonus/penalty (up to 25 pts weight)
            res_facs = [str(f).lower() for f in res.get("facilities", [])]
            if req_facs:
                matched_facs = sum(1 for req in req_facs if any(req in rf for rf in res_facs))
                fac_ratio = matched_facs / len(req_facs)
                score -= (1.0 - fac_ratio) * 25.0
                if fac_ratio == 1.0:
                    match_reasons.append("Matches all requested facilities")
            else:
                score += 5.0  # slight baseline bonus if no constraint

            final_score = int(max(10, min(99, round(score))))

            scored_candidates.append({
                "resource_id": res_id,
                "name": res.get("name", res_id),
                "type": res.get("type", "other"),
                "building": res.get("building", "Main Quad"),
                "floor": res.get("floor", 1),
                "match_score": final_score,
                "current_occupancy": current_occ,
                "capacity": capacity,
                "available_seats": available_seats,
                "distance_meters": distance,
                "current_occupancy_percentage": current_pct,
                "crowd_status": compute_crowd_status(current_pct),
                "predicted_occupancy_1hr": pred_1h_occ,
                "predicted_percentage_1hr": pred_1h_pct,
                "facilities": res.get("facilities", []),
                "match_reasons": match_reasons,
            })

        # Rank by match score descending
        scored_candidates.sort(key=lambda x: x["match_score"], reverse=True)

        return {
            "total_matches": len(scored_candidates),
            "query_criteria": {
                "resource_type": resource_type,
                "max_crowd_pct": max_crowd_pct,
                "min_available_seats": min_available_seats,
                "max_distance_meters": max_distance_meters,
                "required_facilities": required_facilities or [],
            },
            "recommendations": scored_candidates
        }


recommendation_service = RecommendationService()
