import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
import bcrypt
from app.core.config import settings

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """Hashes a plain text password using bcrypt."""
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against a bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except jwt.PyJWTError as e:
        logger.debug(f"JWT decode error: {e}")
        return None


def verify_firebase_or_jwt_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a token against Firebase Authentication if active.
    If not Firebase or if Firebase verification fails, attempts local JWT verification.
    """
    from app.database.firebase import is_firebase_active

    # 1. Try Firebase Auth if Firebase is active
    if is_firebase_active():
        try:
            from firebase_admin import auth
            decoded_firebase = auth.verify_id_token(token)
            # Map Firebase token to standard user dict
            return {
                "user_id": decoded_firebase.get("uid"),
                "email": decoded_firebase.get("email"),
                "role": decoded_firebase.get("role", "STUDENT"),
                "firebase": True,
            }
        except Exception:
            pass

    # 2. Fall back to local JWT
    return decode_token(token)
