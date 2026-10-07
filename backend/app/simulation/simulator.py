import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from app.core.config import settings
from app.simulation.generator import VirtualSensorGenerator
from app.simulation.scenarios import SCENARIO_PROFILES
from app.database.repositories.resource_repo import resource_repository
from app.database.repositories.occupancy_repo import occupancy_repository
from app.services.notification_service import notification_service
from app.websocket.manager import ws_manager

logger = logging.getLogger(__name__)


class VirtualSensorSimulator:
    """
    Continuous virtual sensor engine simulating real-time campus IoT data flow.
    Runs asynchronously and streams updates to Firestore/In-Memory repository
    and connected WebSockets.
    """
    def __init__(self):
        self.is_running: bool = False
        self.scenario: str = settings.DEFAULT_SCENARIO
        self.interval_seconds: float = settings.SIMULATION_INTERVAL_SECONDS
        self.total_ticks: int = 0
        self.last_tick_timestamp: Optional[str] = None
        self._current_readings: Dict[str, Dict[str, Any]] = {}
        self._task: Optional[asyncio.Task] = None

    def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._run_loop())
            logger.info(f"Virtual IoT Simulator STARTED (Scenario: {self.scenario}, Interval: {self.interval_seconds}s)")

    def stop(self):
        if self.is_running:
            self.is_running = False
            if self._task and not self._task.done():
                self._task.cancel()
            logger.info("Virtual IoT Simulator STOPPED")

    def set_scenario(self, scenario_name: str) -> bool:
        if scenario_name not in SCENARIO_PROFILES:
            return False
        self.scenario = scenario_name
        logger.info(f"Simulator scenario updated to: {scenario_name}")
        return True

    def set_interval(self, seconds: float):
        self.interval_seconds = max(0.2, seconds)
        logger.info(f"Simulator interval updated to: {self.interval_seconds}s")

    async def reset(self):
        """Clears live readings cache and triggers an immediate fresh tick."""
        self._current_readings.clear()
        self.total_ticks = 0
        await self.tick_once()

    async def tick_once(self) -> List[Dict[str, Any]]:
        """Executes a single simulation cycle across all campus resources."""
        now = datetime.now(timezone.utc)
        resources = await resource_repository.get_all()
        if not resources:
            return []

        updated_readings = []

        for res in resources:
            res_id = res.get("resource_id") or res.get("id")
            prev_reading = self._current_readings.get(res_id)
            
            # Generate next sensor telemetry
            reading = VirtualSensorGenerator.generate_next_reading(
                resource=res,
                current_reading=prev_reading,
                scenario=self.scenario,
                now=now
            )
            self._current_readings[res_id] = reading
            updated_readings.append(reading)

            # Persist live occupancy in repository
            await occupancy_repository.set(res_id, reading)

            # Record historical snapshot
            historical_entry = {
                "resource_id": res_id,
                "timestamp": reading["timestamp"],
                "occupancy": reading["current_occupancy"],
                "occupancy_percentage": reading["occupancy_percentage"],
                "entry_count": reading["entry_count"],
                "exit_count": reading["exit_count"],
            }
            await occupancy_repository.record_historical_reading(historical_entry)

            # Check threshold notification triggers
            await notification_service.check_and_trigger_crowd_alert(
                resource_id=res_id,
                resource_name=res.get("name", res_id),
                occupancy_pct=reading["occupancy_percentage"]
            )

        self.total_ticks += 1
        self.last_tick_timestamp = now.isoformat()

        # Real-time WebSocket broadcast
        broadcast_payload = {
            "type": "OCCUPANCY_UPDATE",
            "scenario": self.scenario,
            "timestamp": self.last_tick_timestamp,
            "tick": self.total_ticks,
            "readings": updated_readings,
        }
        await ws_manager.broadcast_json(broadcast_payload)
        return updated_readings

    async def _run_loop(self):
        try:
            while self.is_running:
                await self.tick_once()
                await asyncio.sleep(self.interval_seconds)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Error in simulator loop: {e}", exc_info=True)
            self.is_running = False

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "active_scenario": self.scenario,
            "interval_seconds": self.interval_seconds,
            "total_ticks": self.total_ticks,
            "total_sensors_simulated": len(self._current_readings),
            "last_tick_timestamp": self.last_tick_timestamp,
        }


simulator = VirtualSensorSimulator()
