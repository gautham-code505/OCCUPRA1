from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd

RESOURCE_TYPE_MAP = {
    "library": 0,
    "computer_lab": 1,
    "classroom": 2,
    "study_room": 3,
    "cafeteria": 4,
    "seminar_hall": 5,
    "laboratory": 6,
    "other": 7
}

FEATURE_COLUMNS = [
    "capacity",
    "current_occupancy",
    "occupancy_percentage",
    "entry_count",
    "exit_count",
    "hour",
    "minute",
    "day_of_week",
    "is_weekend",
    "resource_type_encoded"
]

TARGET_COLUMNS = [
    "target_30m",
    "target_1h",
    "target_2h",
    "target_4h"
]


def extract_features_from_dict(
    resource: Dict[str, Any],
    sensor_reading: Dict[str, Any],
    hour: int,
    minute: int,
    day_of_week: int
) -> np.ndarray:
    """
    Transforms a single live resource state into an ML feature vector for XGBoost inference.
    """
    res_type = resource.get("type", "other").lower()
    type_code = RESOURCE_TYPE_MAP.get(res_type, RESOURCE_TYPE_MAP["other"])
    capacity = float(resource.get("capacity", 100))
    current_occ = float(sensor_reading.get("current_occupancy", 0))
    pct = float(sensor_reading.get("occupancy_percentage", 0.0))
    entry = float(sensor_reading.get("entry_count", 0))
    exit_cnt = float(sensor_reading.get("exit_count", 0))
    is_weekend = 1 if day_of_week in [5, 6] else 0

    features = [
        capacity,
        current_occ,
        pct,
        entry,
        exit_cnt,
        float(hour),
        float(minute),
        float(day_of_week),
        float(is_weekend),
        float(type_code)
    ]
    return np.array([features], dtype=np.float32)
