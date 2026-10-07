"""
CampusPulse AI - Historical Campus Occupancy Data Generator
Generates realistic multi-week occupancy patterns for 15 campus facilities
accounting for diurnal cycles, peak class/study hours, and resource characteristics.
"""

import os
import json
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

RESOURCES = [
    {"id": "res-lib-01", "name": "Central Library", "type": "LIBRARY", "capacity": 200, "peak_start": 14, "peak_end": 18, "base_load": 0.25},
    {"id": "res-lib-02", "name": "Digital Reading Hall", "type": "LIBRARY", "capacity": 120, "peak_start": 11, "peak_end": 16, "base_load": 0.20},
    {"id": "res-lab-01", "name": "Computer Lab 1", "type": "COMPUTER_LAB", "capacity": 80, "peak_start": 10, "peak_end": 17, "base_load": 0.35},
    {"id": "res-lab-02", "name": "Computer Lab 2", "type": "COMPUTER_LAB", "capacity": 75, "peak_start": 11, "peak_end": 16, "base_load": 0.25},
    {"id": "res-lab-03", "name": "Computer Lab 3", "type": "COMPUTER_LAB", "capacity": 60, "peak_start": 13, "peak_end": 17, "base_load": 0.15},
    {"id": "res-lab-ai", "name": "AI & Data Science Lab", "type": "RESEARCH_LAB", "capacity": 50, "peak_start": 12, "peak_end": 18, "base_load": 0.30},
    {"id": "res-lab-res", "name": "Advanced Research Lab", "type": "RESEARCH_LAB", "capacity": 40, "peak_start": 14, "peak_end": 20, "base_load": 0.20},
    {"id": "res-sr-01", "name": "Study Room A", "type": "STUDY_ROOM", "capacity": 24, "peak_start": 14, "peak_end": 19, "base_load": 0.20},
    {"id": "res-sr-02", "name": "Study Room B", "type": "STUDY_ROOM", "capacity": 20, "peak_start": 15, "peak_end": 20, "base_load": 0.15},
    {"id": "res-sr-03", "name": "Study Room C", "type": "STUDY_ROOM", "capacity": 20, "peak_start": 13, "peak_end": 18, "base_load": 0.15},
    {"id": "res-can-01", "name": "Main Canteen", "type": "CANTEEN", "capacity": 250, "peak_start": 12, "peak_end": 14, "base_load": 0.10},
    {"id": "res-sem-01", "name": "Dr. Kalam Seminar Hall", "type": "SEMINAR_HALL", "capacity": 180, "peak_start": 11, "peak_end": 15, "base_load": 0.05},
    {"id": "res-cls-01", "name": "Block A Classrooms (301-305)", "type": "CLASSROOM", "capacity": 150, "peak_start": 9, "peak_end": 13, "base_load": 0.10},
    {"id": "res-cls-02", "name": "Block B Classrooms (201-204)", "type": "CLASSROOM", "capacity": 120, "peak_start": 10, "peak_end": 15, "base_load": 0.10},
    {"id": "res-sac-01", "name": "Student Activity Center", "type": "ACTIVITY_CENTER", "capacity": 160, "peak_start": 16, "peak_end": 20, "base_load": 0.15},
]

def generate_historical_dataset(days=30):
    np.random.seed(42)
    random.seed(42)
    rows = []
    
    start_date = datetime.now() - timedelta(days=days)
    
    for day_offset in range(days):
        current_day = start_date + timedelta(days=day_offset)
        day_of_week = current_day.weekday() # 0 = Monday, 6 = Sunday
        is_weekend = day_of_week >= 5
        
        for hour in range(8, 22): # 8 AM to 10 PM
            for res in RESOURCES:
                cap = res["capacity"]
                base = res["base_load"]
                
                # Diurnal bell curve around peak hours
                peak_center = (res["peak_start"] + res["peak_end"]) / 2.0
                dist_from_peak = abs(hour - peak_center)
                peak_factor = max(0.0, 1.0 - (dist_from_peak / 4.0) ** 1.5)
                
                # Weekend reduction (except Canteen / Activity Center)
                weekend_mult = 0.4 if (is_weekend and res["type"] not in ["CANTEEN", "ACTIVITY_CENTER"]) else 1.0
                
                # Calculate occupancy percentage (0.0 to 1.0)
                mean_occ = base + (0.65 * peak_factor * weekend_mult)
                mean_occ = min(0.95, max(0.05, mean_occ + np.random.normal(0, 0.04)))
                
                occupancy = int(round(mean_occ * cap))
                entry_rate = int(max(0, np.random.normal(mean_occ * 12, 3)))
                exit_rate = int(max(0, np.random.normal(mean_occ * 10, 3)))
                
                timestamp = current_day.replace(hour=hour, minute=0, second=0).isoformat()
                
                # Targets for future horizons
                target_30m = min(100.0, max(0.0, mean_occ * 100 + np.random.normal(2 if hour < 14 else -2, 4)))
                target_1h = min(100.0, max(0.0, mean_occ * 100 + np.random.normal(5 if hour < 14 else -5, 6)))
                target_2h = min(100.0, max(0.0, mean_occ * 100 + np.random.normal(8 if hour < 13 else -8, 9)))
                target_4h = min(100.0, max(0.0, mean_occ * 100 + np.random.normal(10 if hour < 12 else -12, 12)))
                
                rows.append({
                    "resource_id": res["id"],
                    "resource_name": res["name"],
                    "resource_type": res["type"],
                    "capacity": cap,
                    "hour": hour,
                    "day_of_week": day_of_week,
                    "is_weekend": int(is_weekend),
                    "current_occupancy": occupancy,
                    "current_occupancy_percent": round(mean_occ * 100, 1),
                    "entry_rate": entry_rate,
                    "exit_rate": exit_rate,
                    "timestamp": timestamp,
                    "future_30m_percent": round(target_30m, 1),
                    "future_1h_percent": round(target_1h, 1),
                    "future_2h_percent": round(target_2h, 1),
                    "future_4h_percent": round(target_4h, 1),
                })
                
    df = pd.DataFrame(rows)
    data_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(data_dir, "campus_occupancy_historical.csv")
    df.to_csv(output_path, index=False)
    print(f"[OK] Generated {len(df)} historical occupancy records at: {output_path}")
    return df

if __name__ == "__main__":
    generate_historical_dataset()
