from typing import Dict, Any

SCENARIO_PROFILES: Dict[str, Dict[str, Any]] = {
    "normal_day": {
        "description": "Standard weekday campus routine with moderate classes and study cycles.",
        "occupancy_multiplier": 1.0,
        "traffic_volatility": 1.0,
        "type_multipliers": {
            "library": 1.0,
            "computer_lab": 1.0,
            "classroom": 1.0,
            "study_room": 1.0,
            "cafeteria": 1.0,
            "seminar_hall": 1.0,
        }
    },
    "busy_day": {
        "description": "High campus influx with project submission deadlines and campus-wide events.",
        "occupancy_multiplier": 1.25,
        "traffic_volatility": 1.3,
        "type_multipliers": {
            "library": 1.3,
            "computer_lab": 1.35,
            "classroom": 1.15,
            "study_room": 1.4,
            "cafeteria": 1.2,
            "seminar_hall": 1.2,
        }
    },
    "exam_day": {
        "description": "Finals examination period: Extreme library and study room occupancy, low cafeteria linger.",
        "occupancy_multiplier": 1.4,
        "traffic_volatility": 1.1,
        "type_multipliers": {
            "library": 1.6,
            "study_room": 1.7,
            "computer_lab": 1.3,
            "classroom": 0.8,
            "cafeteria": 0.9,
            "seminar_hall": 0.5,
        }
    },
    "weekend": {
        "description": "Saturday/Sunday schedule: Academic buildings closed/low, leisure and library open.",
        "occupancy_multiplier": 0.4,
        "traffic_volatility": 0.6,
        "type_multipliers": {
            "library": 0.7,
            "study_room": 0.6,
            "computer_lab": 0.3,
            "classroom": 0.1,
            "cafeteria": 0.5,
            "seminar_hall": 0.2,
        }
    },
    "lunch_peak": {
        "description": "Simulated mid-day rush: Cafeteria reaches maximum capacity, classrooms empty.",
        "occupancy_multiplier": 1.1,
        "traffic_volatility": 1.5,
        "type_multipliers": {
            "cafeteria": 1.9,
            "classroom": 0.3,
            "library": 0.7,
            "computer_lab": 0.6,
            "study_room": 0.8,
            "seminar_hall": 0.4,
        }
    }
}
