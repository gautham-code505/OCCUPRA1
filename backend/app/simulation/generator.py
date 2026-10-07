import random
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.simulation.resource_patterns import get_base_occupancy_ratio
from app.simulation.scenarios import SCENARIO_PROFILES
from app.services.resource_service import compute_crowd_status


class VirtualSensorGenerator:
    """
    Simulates physical virtual door sensors (infrared / optical turnstiles)
    that count entries, exits, and compute accurate campus utilization.
    """

    @staticmethod
    def generate_next_reading(
        resource: Dict[str, Any],
        current_reading: Optional[Dict[str, Any]] = None,
        scenario: str = "normal_day",
        now: Optional[datetime] = None
    ) -> Dict[str, Any]:
        if now is None:
            now = datetime.now(timezone.utc)

        resource_id = resource.get("resource_id") or resource.get("id")
        resource_type = resource.get("type", "other").lower()
        capacity = int(resource.get("capacity", 100))

        scenario_cfg = SCENARIO_PROFILES.get(scenario, SCENARIO_PROFILES["normal_day"])
        occ_mult = scenario_cfg.get("occupancy_multiplier", 1.0)
        type_mult = scenario_cfg.get("type_multipliers", {}).get(resource_type, 1.0)
        volatility = scenario_cfg.get("traffic_volatility", 1.0)

        # Baseline diurnal pattern
        base_ratio = get_base_occupancy_ratio(resource_type, now.hour, now.minute)
        target_ratio = min(0.98, max(0.02, base_ratio * occ_mult * type_mult))
        target_occupancy = int(capacity * target_ratio)

        # Determine current state
        if current_reading:
            prev_occ = int(current_reading.get("current_occupancy", target_occupancy))
        else:
            prev_occ = int(resource.get("current_occupancy", target_occupancy))

        # Dynamic entry/exit calculation toward target with realistic student flow
        diff = target_occupancy - prev_occ
        base_flux = max(1, int((capacity * 0.05) * volatility))

        if diff > 0:
            # People flowing in
            entries = max(1, int(diff * random.uniform(0.3, 0.6)) + random.randint(0, base_flux))
            exits = max(0, random.randint(0, max(1, int(base_flux * 0.4))))
        elif diff < 0:
            # People leaving
            exits = max(1, int(abs(diff) * random.uniform(0.3, 0.6)) + random.randint(0, base_flux))
            entries = max(0, random.randint(0, max(1, int(base_flux * 0.4))))
        else:
            # Steady state with minor background movement
            flux = random.randint(0, max(1, int(base_flux * 0.3)))
            entries = flux
            exits = flux

        # Boundary checks
        exits = min(prev_occ, exits)
        entries = min(max(0, capacity - prev_occ + exits), entries)

        new_occupancy = max(0, min(capacity, prev_occ + entries - exits))
        occupancy_pct = round((new_occupancy / max(capacity, 1)) * 100, 1)
        available_cap = max(0, capacity - new_occupancy)

        crowd_cat = compute_crowd_status(occupancy_pct)

        reading = {
            "resource_id": resource_id,
            "timestamp": now.isoformat(),
            "capacity": capacity,
            "current_occupancy": new_occupancy,
            "occupancy_percentage": occupancy_pct,
            "entry_count": entries,
            "exit_count": exits,
            "available_capacity": available_cap,
            "utilization_rate": occupancy_pct,
            "sensor_status": "online",
            "crowd_status": crowd_cat.value,
        }
        return reading
