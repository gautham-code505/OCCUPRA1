from typing import Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class PredictionHorizonValues(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    m30: int = Field(..., alias="30_minutes", description="Predicted occupancy in 30 minutes")
    h1: int = Field(..., alias="1_hour", description="Predicted occupancy in 1 hour")
    h2: int = Field(..., alias="2_hours", description="Predicted occupancy in 2 hours")
    h4: int = Field(..., alias="4_hours", description="Predicted occupancy in 4 hours")


class ResourcePredictionResponse(BaseModel):
    resource_id: str
    resource_name: Optional[str] = None
    capacity: int
    current_occupancy: int
    current_occupancy_percentage: float
    predictions: Dict[str, int]
    predicted_percentages: Dict[str, float]
    predicted_crowd_levels: Dict[str, str]
    model_version: str = "XGBoost-v1.0"
    timestamp: str
