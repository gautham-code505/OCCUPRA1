from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


class SimulationScenario(str, Enum):
    NORMAL_DAY = "normal_day"
    BUSY_DAY = "busy_day"
    EXAM_DAY = "exam_day"
    WEEKEND = "weekend"
    LUNCH_PEAK = "lunch_peak"


class SimulationScenarioRequest(BaseModel):
    scenario: SimulationScenario


class SimulationSpeedRequest(BaseModel):
    interval_seconds: float = Field(..., gt=0.1, le=300.0, description="Seconds between simulation sensor ticks")


class SimulationStatusResponse(BaseModel):
    is_running: bool
    active_scenario: SimulationScenario
    interval_seconds: float
    total_ticks: int
    total_sensors_simulated: int
    last_tick_timestamp: Optional[str] = None
