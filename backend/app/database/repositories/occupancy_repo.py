from typing import List, Optional, Dict, Any
from datetime import datetime
from app.database.repositories.base_repo import BaseRepository
from app.database.firebase import get_firestore_client, is_firebase_active


class OccupancyRepository(BaseRepository):
    def __init__(self):
        super().__init__(collection_name="current_occupancy")
        self._history_memory: List[Dict[str, Any]] = []

    async def get_current_for_resource(self, resource_id: str) -> Optional[Dict[str, Any]]:
        return await self.get_by_id(resource_id)

    async def record_historical_reading(self, reading: Dict[str, Any]) -> Dict[str, Any]:
        """Stores historical sensor/occupancy snapshot."""
        data = dict(reading)
        if "timestamp" not in data:
            data["timestamp"] = datetime.utcnow().isoformat()
            
        client = get_firestore_client()
        if is_firebase_active() and client:
            client.collection("historical_occupancy").add(data)
        else:
            self._history_memory.append(data)
            # Keep history manageable in memory (e.g. last 10,000 readings)
            if len(self._history_memory) > 10000:
                self._history_memory = self._history_memory[-10000:]
        return data

    async def get_history(
        self,
        resource_id: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        client = get_firestore_client()
        if is_firebase_active() and client:
            query = client.collection("historical_occupancy")
            if resource_id:
                query = query.where("resource_id", "==", resource_id)
            # Fetch up to limit * 2 then filter/sort
            docs = query.limit(limit * 2).stream()
            results = [doc.to_dict() for doc in docs]
        else:
            results = list(self._history_memory)

        filtered = []
        for r in results:
            if resource_id and r.get("resource_id") != resource_id:
                continue
            ts = r.get("timestamp", "")
            if start_time and ts < start_time:
                continue
            if end_time and ts > end_time:
                continue
            filtered.append(r)

        # Sort descending by timestamp
        filtered.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return filtered[:limit]


occupancy_repository = OccupancyRepository()
