from app.api.resources import router as resources_router
from app.api.occupancy import router as occupancy_router
from app.api.predictions import router as predictions_router
from app.api.recommendations import router as recommendations_router
from app.api.bookings import router as bookings_router
from app.api.notifications import router as notifications_router
from app.api.analytics import router as analytics_router
from app.api.admin import router as admin_router
from app.api.simulation import router as simulation_router
from app.api.auth import router as auth_router
from app.api.test import router as test_router

__all__ = [
    "resources_router",
    "occupancy_router",
    "predictions_router",
    "recommendations_router",
    "bookings_router",
    "notifications_router",
    "analytics_router",
    "admin_router",
    "simulation_router",
    "auth_router",
    "test_router",
]
