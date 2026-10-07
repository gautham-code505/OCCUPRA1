from fastapi import APIRouter
from app.services.firestore_service import firestore_service

router = APIRouter(prefix="/test", tags=["System & Firestore Verification"])


@router.get("/firebase", summary="Verify live communication with Firebase Firestore")
async def test_firebase_connection():
    """
    Verifies that the backend can successfully communicate with Firebase Firestore.
    """
    return firestore_service.check_connection()
