import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.database.firebase import initialize_firebase
from app.database.repositories.resource_repo import resource_repository
from app.database.seed_data import seed_initial_resources
from app.api.auth import ensure_default_accounts
from app.simulation.simulator import simulator
from app.ml.predict import get_or_load_model
from app.websocket.manager import ws_manager
from app.services.occupancy_service import occupancy_service

# Routers
from app.api import (
    resources_router,
    occupancy_router,
    predictions_router,
    recommendations_router,
    bookings_router,
    notifications_router,
    analytics_router,
    admin_router,
    simulation_router,
    auth_router,
    test_router,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("campuspulse")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle management.
    """
    logger.info("==================================================")
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION}")
    logger.info("==================================================")

    # 1. Initialize Firebase if user credentials provided
    initialize_firebase()

    # 2. Seed initial campus resources
    await seed_initial_resources(resource_repository)

    # 3. Seed default accounts (admin / student)
    await ensure_default_accounts()

    # 4. Initialize ML Crowd Prediction Model
    get_or_load_model()

    # 5. Start Virtual IoT Simulator
    if settings.SIMULATION_AUTO_START:
        await simulator.tick_once()
        simulator.start()

    yield

    # Shutdown logic
    logger.info("Shutting down CampusPulse AI...")
    simulator.stop()


app = FastAPI(
    title="CampusPulse AI API",
    description=(
        "Smart Campus Resource Finder & Crowd Prediction Platform API. "
        "Powered by Virtual IoT Simulation, XGBoost predictive analytics, "
        "and intelligent student resource recommendation algorithms."
    ),
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root Health & Information Endpoint
@app.get("/", tags=["Health & Status"])
async def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "simulator_status": simulator.get_status(),
        "documentation": "/docs",
        "redoc": "/redoc",
    }


# Health Check Endpoint
@app.get("/health", tags=["Health & Status"])
async def health():
    return {
        "status": "ok",
        "service": "CampusAI Backend"
    }


# WebSocket for Live Real-Time Occupancy Feeds
@app.websocket("/ws/occupancy")
async def websocket_occupancy_endpoint(websocket: WebSocket):
    """
    Real-time streaming WebSocket endpoint. Emits live campus occupancy readings
    whenever the virtual sensor engine ticks.
    """
    await ws_manager.connect(websocket)
    try:
        # Send immediate initial state upon connect
        initial_readings = await occupancy_service.get_all_live_occupancies()
        await websocket.send_json({
            "type": "INITIAL_STATE",
            "scenario": simulator.scenario,
            "readings": initial_readings,
            "status": simulator.get_status(),
        })

        # Keep connection open for incoming pings/messages
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.debug(f"WebSocket client error: {e}")
        ws_manager.disconnect(websocket)


# Register REST API Routers
app.include_router(test_router, prefix=settings.API_V1_PREFIX)
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(resources_router, prefix=settings.API_V1_PREFIX)
app.include_router(occupancy_router, prefix=settings.API_V1_PREFIX)
app.include_router(predictions_router, prefix=settings.API_V1_PREFIX)
app.include_router(recommendations_router, prefix=settings.API_V1_PREFIX)
app.include_router(bookings_router, prefix=settings.API_V1_PREFIX)
app.include_router(notifications_router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics_router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_router, prefix=settings.API_V1_PREFIX)
app.include_router(simulation_router, prefix=settings.API_V1_PREFIX)
