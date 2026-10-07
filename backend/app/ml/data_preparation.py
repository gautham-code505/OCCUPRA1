import math
import random
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple
from app.simulation.resource_patterns import get_base_occupancy_ratio
from app.ml.feature_engineering import RESOURCE_TYPE_MAP, FEATURE_COLUMNS, TARGET_COLUMNS

SAMPLE_RESOURCES = [
    {"type": "library", "capacity": 300},
    {"type": "computer_lab", "capacity": 60},
    {"type": "computer_lab", "capacity": 50},
    {"type": "study_room", "capacity": 25},
    {"type": "study_room", "capacity": 20},
    {"type": "classroom", "capacity": 120},
    {"type": "classroom", "capacity": 80},
    {"type": "cafeteria", "capacity": 250},
    {"type": "seminar_hall", "capacity": 400},
]


def generate_synthetic_training_dataset(num_samples: int = 15000) -> pd.DataFrame:
    """
    Generates realistic historical campus telemetry across varied hours,
    days of week, and horizons (30m, 1h, 2h, 4h) for robust ML training.
    """
    records = []

    for _ in range(num_samples):
        res_info = random.choice(SAMPLE_RESOURCES)
        res_type = res_info["type"]
        capacity = res_info["capacity"]
        type_code = RESOURCE_TYPE_MAP.get(res_type, 7)

        day_of_week = random.randint(0, 6)
        is_weekend = 1 if day_of_week in [5, 6] else 0
        hour = random.randint(0, 23)
        minute = random.choice([0, 15, 30, 45])

        # Current baseline
        weekend_mult = 0.4 if is_weekend else 1.0
        base_ratio = get_base_occupancy_ratio(res_type, hour, minute) * weekend_mult
        noise = random.gauss(0, 0.05)
        current_ratio = max(0.0, min(1.0, base_ratio + noise))
        current_occ = int(capacity * current_ratio)
        occupancy_pct = round((current_occ / capacity) * 100, 1)

        # Realistic entry / exit counts
        entry_cnt = max(0, int(capacity * random.uniform(0.01, 0.08)))
        exit_cnt = max(0, int(capacity * random.uniform(0.01, 0.08)))

        # Future targets calculation at +30m, +1h, +2h, +4h
        def future_occ(offset_hours: float) -> int:
            f_hour = int((hour + offset_hours) % 24)
            f_min = minute
            f_ratio = get_base_occupancy_ratio(res_type, f_hour, f_min) * weekend_mult
            f_noise = random.gauss(0, 0.04)
            f_ratio = max(0.0, min(1.0, f_ratio + f_noise))
            return int(capacity * f_ratio)

        t_30m = future_occ(0.5)
        t_1h = future_occ(1.0)
        t_2h = future_occ(2.0)
        t_4h = future_occ(4.0)

        records.append({
            "capacity": capacity,
            "current_occupancy": current_occ,
            "occupancy_percentage": occupancy_pct,
            "entry_count": entry_cnt,
            "exit_count": exit_cnt,
            "hour": hour,
            "minute": minute,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "resource_type_encoded": type_code,
            "target_30m": t_30m,
            "target_1h": t_1h,
            "target_2h": t_2h,
            "target_4h": t_4h,
        })

    df = pd.DataFrame(records)
    return df


def prepare_train_test_data(
    df: pd.DataFrame,
    test_size: float = 0.2
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    from sklearn.model_selection import train_test_split

    X = df[FEATURE_COLUMNS].values
    y = df[TARGET_COLUMNS].values

    return train_test_split(X, y, test_size=test_size, random_state=42)
