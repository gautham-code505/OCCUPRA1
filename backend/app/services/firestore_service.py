import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
from app.database.firebase import get_firestore_client, is_firebase_active

logger = logging.getLogger(__name__)


class FirestoreService:
    """
    Dedicated Firestore service managing references to future collections:
    - users
    - resources
    - occupancy
    - sensor_readings
    - predictions
    - bookings
    - notifications
    """
    COLLECTION_USERS = "users"
    COLLECTION_RESOURCES = "resources"
    COLLECTION_OCCUPANCY = "occupancy"
    COLLECTION_SENSOR_READINGS = "sensor_readings"
    COLLECTION_PREDICTIONS = "predictions"
    COLLECTION_BOOKINGS = "bookings"
    COLLECTION_NOTIFICATIONS = "notifications"

    def __init__(self):
        pass

    @property
    def client(self):
        return get_firestore_client()

    def get_collection(self, collection_name: str):
        c = self.client
        if c:
            return c.collection(collection_name)
        return None

    def check_connection(self) -> Dict[str, Any]:
        """
        Tests whether the backend can communicate with Firebase Firestore.
        Writes a lightweight ping timestamp to '_health_check' collection.
        """
        c = self.client
        if not is_firebase_active() or not c:
            return {
                "connected": False,
                "message": "Firebase Admin SDK is not initialized or credentials missing.",
                "database": "in_memory_fallback"
            }

        try:
            # Write a lightweight health check ping doc
            test_doc = c.collection("_health_check").document("connection_status")
            timestamp = datetime.now(timezone.utc).isoformat()
            test_doc.set({"last_ping": timestamp, "service": "CampusAI Backend"})
            
            # Read it back to verify full read/write communication
            snapshot = test_doc.get()
            return {
                "connected": True,
                "project_id": c.project_id if hasattr(c, "project_id") else "campulseai",
                "message": "Successfully communicated with Firebase Firestore!",
                "verified_at": timestamp,
                "collections_configured": [
                    self.COLLECTION_USERS,
                    self.COLLECTION_RESOURCES,
                    self.COLLECTION_OCCUPANCY,
                    self.COLLECTION_SENSOR_READINGS,
                    self.COLLECTION_PREDICTIONS,
                    self.COLLECTION_BOOKINGS,
                    self.COLLECTION_NOTIFICATIONS,
                ]
            }
        except Exception as e:
            logger.error(f"Firestore connection test failed: {e}")
            return {
                "connected": False,
                "error": str(e),
                "message": "Failed to communicate with Firebase Firestore."
            }


firestore_service = FirestoreService()
