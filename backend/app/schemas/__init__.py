from app.schemas.resource import (
    ResourceType,
    CrowdStatus,
    ResourceBase,
    ResourceCreate,
    ResourceUpdate,
    ResourceResponse,
)
from app.schemas.occupancy import (
    VirtualSensorReading,
    CampusSummaryResponse,
    HeatmapPoint,
    HistoricalReading,
    PeakHourStat,
)
from app.schemas.prediction import ResourcePredictionResponse
from app.schemas.recommendation import RecommendationItem, RecommendationResponse
from app.schemas.booking import BookingCreate, BookingResponse, BookingStatus
from app.schemas.notification import NotificationCreate, NotificationResponse, NotificationType
from app.schemas.simulation import (
    SimulationScenario,
    SimulationScenarioRequest,
    SimulationSpeedRequest,
    SimulationStatusResponse,
)
from app.schemas.auth import (
    UserRole,
    UserRegister,
    UserLogin,
    TokenResponse,
    UserResponse,
)

__all__ = [
    "ResourceType",
    "CrowdStatus",
    "ResourceBase",
    "ResourceCreate",
    "ResourceUpdate",
    "ResourceResponse",
    "VirtualSensorReading",
    "CampusSummaryResponse",
    "HeatmapPoint",
    "HistoricalReading",
    "PeakHourStat",
    "ResourcePredictionResponse",
    "RecommendationItem",
    "RecommendationResponse",
    "BookingCreate",
    "BookingResponse",
    "BookingStatus",
    "NotificationCreate",
    "NotificationResponse",
    "NotificationType",
    "SimulationScenario",
    "SimulationScenarioRequest",
    "SimulationSpeedRequest",
    "SimulationStatusResponse",
    "UserRole",
    "UserRegister",
    "UserLogin",
    "TokenResponse",
    "UserResponse",
]
