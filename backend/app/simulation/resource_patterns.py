import math
from typing import Dict, Any


def get_base_occupancy_ratio(resource_type: str, hour: int, minute: int) -> float:
    """
    Computes a realistic baseline occupancy ratio (0.0 to 1.0) based on
    the diurnal pattern of the resource type.
    """
    fractional_hour = hour + (minute / 60.0)

    if resource_type == "library":
        # Library: Opens 8am, peaks late afternoon & evening (15:00 - 20:00), tapers at night
        if fractional_hour < 7.5 or fractional_hour > 23.0:
            return 0.03
        elif 7.5 <= fractional_hour < 11.0:
            # Morning rise (20% -> 50%)
            progress = (fractional_hour - 7.5) / 3.5
            return 0.20 + 0.30 * progress
        elif 11.0 <= fractional_hour < 15.0:
            # Afternoon plateau (50% -> 70%)
            progress = (fractional_hour - 11.0) / 4.0
            return 0.50 + 0.20 * progress
        elif 15.0 <= fractional_hour < 20.0:
            # Evening high peak (70% -> 85%)
            progress = (fractional_hour - 15.0) / 5.0
            return 0.70 + 0.15 * math.sin(progress * math.pi)
        else:
            # Night descent (20:00 -> 23:00)
            progress = (fractional_hour - 20.0) / 3.0
            return max(0.05, 0.70 - 0.60 * progress)

    elif resource_type == "cafeteria":
        # Cafeteria: Breakfast (8-9:30), Lunch Peak (11:30-14:00), Dinner (18:00-20:00)
        if fractional_hour < 7.0 or fractional_hour > 21.5:
            return 0.02
        elif 7.5 <= fractional_hour < 9.5:
            # Breakfast rush
            return 0.55 + 0.15 * math.sin((fractional_hour - 7.5) / 2.0 * math.pi)
        elif 9.5 <= fractional_hour < 11.5:
            # Coffee/snack lull
            return 0.25
        elif 11.5 <= fractional_hour < 14.0:
            # Very high lunch peak
            progress = (fractional_hour - 11.5) / 2.5
            return 0.75 + 0.20 * math.sin(progress * math.pi)
        elif 14.0 <= fractional_hour < 17.5:
            # Afternoon lull
            return 0.22
        elif 17.5 <= fractional_hour < 20.0:
            # Evening dinner
            progress = (fractional_hour - 17.5) / 2.5
            return 0.55 + 0.20 * math.sin(progress * math.pi)
        else:
            return 0.10

    elif resource_type == "study_room":
        # Study rooms: Low in morning, moderate afternoon, peak in evening
        if fractional_hour < 8.0 or fractional_hour > 22.0:
            return 0.05
        elif 8.0 <= fractional_hour < 12.0:
            progress = (fractional_hour - 8.0) / 4.0
            return 0.15 + 0.25 * progress
        elif 12.0 <= fractional_hour < 17.0:
            progress = (fractional_hour - 12.0) / 5.0
            return 0.40 + 0.25 * progress
        elif 17.0 <= fractional_hour < 21.0:
            # High evening
            progress = (fractional_hour - 17.0) / 4.0
            return 0.65 + 0.22 * math.sin(progress * math.pi)
        else:
            return 0.20

    elif resource_type == "computer_lab":
        # Computer labs: Practical classes 9am-5pm, evening project rush 5pm-8pm
        if fractional_hour < 8.0 or fractional_hour > 21.0:
            return 0.02
        elif 8.0 <= fractional_hour < 13.0:
            progress = (fractional_hour - 8.0) / 5.0
            return 0.35 + 0.35 * progress
        elif 13.0 <= fractional_hour < 17.0:
            return 0.65 + 0.15 * math.sin((fractional_hour - 13.0) / 4.0 * math.pi)
        elif 17.0 <= fractional_hour < 20.0:
            progress = (fractional_hour - 17.0) / 3.0
            return 0.60 + 0.20 * math.sin(progress * math.pi)
        else:
            return 0.15

    elif resource_type == "classroom":
        # Classroom: Active during lecture blocks (8am - 6pm), minimal afterwards
        if 8.0 <= fractional_hour < 18.0:
            # Oscillating lecture cycles
            return 0.55 + 0.25 * math.sin((fractional_hour - 8.0) * 1.5)
        return 0.05

    elif resource_type == "seminar_hall":
        # Seminar hall: Periodic scheduled events around midday/afternoon
        if 10.0 <= fractional_hour < 13.0 or 14.0 <= fractional_hour < 17.0:
            return 0.45 + 0.25 * math.sin((fractional_hour - 10.0) * 1.2)
        return 0.08

    # Default fallback
    return 0.40
