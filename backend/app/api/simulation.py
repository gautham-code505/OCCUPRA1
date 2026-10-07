from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.simulation import (
    SimulationStatusResponse,
    SimulationScenarioRequest,
    SimulationSpeedRequest,
    SimulationScenario,
)
from app.simulation.simulator import simulator
from app.core.dependencies import require_admin

router = APIRouter(prefix="/simulation", tags=["Virtual IoT Simulation Controls"])


@router.get("/status", response_model=SimulationStatusResponse, summary="Get virtual IoT simulator status")
async def get_simulation_status():
    """
    Returns running state, current scenario, tick interval, and simulated sensor count.
    """
    return simulator.get_status()


@router.post("/start", summary="Start virtual sensor engine (Admin)")
async def start_simulation(admin: dict = Depends(require_admin)):
    """
    Admin-only: Starts background generation of virtual campus turnstile sensor data.
    """
    simulator.start()
    return {"message": "Simulation started successfully.", "status": simulator.get_status()}


@router.post("/stop", summary="Stop virtual sensor engine (Admin)")
async def stop_simulation(admin: dict = Depends(require_admin)):
    """
    Admin-only: Pauses virtual sensor telemetry loop.
    """
    simulator.stop()
    return {"message": "Simulation stopped successfully.", "status": simulator.get_status()}


@router.post("/reset", summary="Reset virtual sensor values (Admin)")
async def reset_simulation(admin: dict = Depends(require_admin)):
    """
    Admin-only: Clears simulator cache and forces an immediate fresh cycle.
    """
    await simulator.reset()
    return {"message": "Simulation state reset successfully.", "status": simulator.get_status()}


@router.post("/scenario", summary="Switch simulation scenario (Admin)")
async def set_scenario(req: SimulationScenarioRequest, admin: dict = Depends(require_admin)):
    """
    Admin-only: Switches the active campus activity scenario:
    - normal_day
    - busy_day
    - exam_day
    - weekend
    - lunch_peak
    """
    success = simulator.set_scenario(req.scenario.value)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown scenario '{req.scenario.value}'.",
        )
    # Trigger an immediate tick so changes reflect instantly
    await simulator.tick_once()
    return {
        "message": f"Scenario changed to '{req.scenario.value}'.",
        "status": simulator.get_status(),
    }


@router.post("/speed", summary="Adjust simulation tick speed/interval (Admin)")
async def set_speed(req: SimulationSpeedRequest, admin: dict = Depends(require_admin)):
    """
    Admin-only: Adjusts the interval in seconds between virtual sensor cycles
    (e.g., 2.0s for high-speed live demo, 10.0s for normal).
    """
    simulator.set_interval(req.interval_seconds)
    return {
        "message": f"Simulation interval updated to {req.interval_seconds}s.",
        "status": simulator.get_status(),
    }
