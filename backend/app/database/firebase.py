import os
import json
import logging
from typing import Optional, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

_firestore_client = None
_is_firebase_initialized = False
_has_attempted_init = False


def initialize_firebase() -> bool:
    """
    Initializes Firebase Admin SDK using user-provided credentials if available.
    Supports:
    1. FIREBASE_CREDENTIALS_PATH pointing to serviceAccountKey.json
    2. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env
    3. Google Application Default Credentials
    Returns True if initialized successfully, False otherwise (falling back to mock storage).
    """
    global _firestore_client, _is_firebase_initialized, _has_attempted_init
    
    if _has_attempted_init:
        return _is_firebase_initialized

    _has_attempted_init = True

    if settings.USE_MOCK_DATABASE:
        logger.info("USE_MOCK_DATABASE is True. Firebase initialization skipped; using in-memory storage.")
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        if firebase_admin._apps:
            _firestore_client = firestore.client()
            _is_firebase_initialized = True
            return True

        cred = None

        # 1. Check for service account JSON path
        cred_path = settings.FIREBASE_CREDENTIALS_PATH
        if cred_path:
            if not os.path.isabs(cred_path):
                # Try relative to backend directory
                backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
                candidate = os.path.join(backend_dir, cred_path)
                if os.path.exists(candidate):
                    cred_path = candidate
            if os.path.exists(cred_path):
                logger.info(f"Loading Firebase credentials from file: {cred_path}")
                cred = credentials.Certificate(cred_path)

        # 2. Check for environment variable keys
        elif settings.FIREBASE_PROJECT_ID and settings.FIREBASE_CLIENT_EMAIL and settings.FIREBASE_PRIVATE_KEY:
            logger.info("Loading Firebase credentials from environment variables.")
            private_key = settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n")
            cert_dict = {
                "type": "service_account",
                "project_id": settings.FIREBASE_PROJECT_ID,
                "private_key": private_key,
                "client_email": settings.FIREBASE_CLIENT_EMAIL,
                "token_uri": "https://oauth2.googleapis.com/token",
            }
            cred = credentials.Certificate(cert_dict)

        if cred:
            firebase_admin.initialize_app(cred, {
                'projectId': settings.FIREBASE_PROJECT_ID or cred.project_id
            })
            _firestore_client = firestore.client()
            _is_firebase_initialized = True
            logger.info("Successfully connected to user's Firebase Firestore!")
            return True
        else:
            logger.info(
                "No Firebase credentials detected yet. Running in In-Memory Repository mode. "
                "Provide your Firebase credentials in .env or FIREBASE_CREDENTIALS_PATH when ready."
            )
            return False

    except Exception as e:
        logger.warning(f"Could not connect to Firebase ({e}). Falling back to In-Memory storage.")
        _is_firebase_initialized = False
        _firestore_client = None
        return False


def get_firestore_client() -> Optional[Any]:
    """Returns the Firestore client if Firebase is initialized, else None."""
    global _firestore_client, _has_attempted_init
    if not _has_attempted_init:
        initialize_firebase()
    return _firestore_client


def is_firebase_active() -> bool:
    """Returns True if connected to real Firebase Firestore."""
    return _is_firebase_initialized and _firestore_client is not None
