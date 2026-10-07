import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse, UserRole
from app.database.repositories.user_repo import user_repository
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication & Access Control"])


async def ensure_default_accounts():
    """Seeds default admin and student accounts if none exist."""
    admin = await user_repository.get_by_email("admin@campuspulse.ai")
    if not admin:
        admin_id = "admin_default"
        await user_repository.set(admin_id, {
            "id": admin_id,
            "user_id": admin_id,
            "email": "admin@campuspulse.ai",
            "name": "Campus Administrator",
            "role": UserRole.ADMIN.value,
            "hashed_password": hash_password("AdminPass123!"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    student = await user_repository.get_by_email("student@campuspulse.ai")
    if not student:
        student_id = "student_default"
        await user_repository.set(student_id, {
            "id": student_id,
            "user_id": student_id,
            "email": "student@campuspulse.ai",
            "name": "Jane Student",
            "role": UserRole.STUDENT.value,
            "hashed_password": hash_password("StudentPass123!"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED, summary="Register user (Student or Admin)")
async def register(user_in: UserRegister):
    """
    Registers a new student or admin. Stores credentials securely with bcrypt.
    """
    existing = await user_repository.get_by_email(user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{user_in.email}' already exists.",
        )

    user_id = str(uuid.uuid4())
    user_data = {
        "id": user_id,
        "user_id": user_id,
        "email": user_in.email,
        "name": user_in.name,
        "role": user_in.role.value,
        "hashed_password": hash_password(user_in.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    saved = await user_repository.set(user_id, user_data)
    return saved


@router.post("/login", response_model=TokenResponse, summary="Log in with email & password")
async def login(credentials: UserLogin):
    """
    Authenticates email & password, returning a signed JWT access token with role claims.
    """
    await ensure_default_accounts()
    user = await user_repository.get_by_email(credentials.email)
    if not user or not verify_password(credentials.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = {
        "sub": user["id"],
        "user_id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "name": user.get("name", "User"),
    }
    access_token = create_access_token(token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "user_id": user["id"],
        "name": user.get("name", "User"),
        "email": user["email"],
    }


@router.post("/token", response_model=TokenResponse, summary="OAuth2 standard token endpoint (Swagger login)")
async def oauth2_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Standard OAuth2 password flow endpoint enabling direct login via Swagger UI Authorize button.
    """
    await ensure_default_accounts()
    user = await user_repository.get_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = {
        "sub": user["id"],
        "user_id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "name": user.get("name", "User"),
    }
    access_token = create_access_token(token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "user_id": user["id"],
        "name": user.get("name", "User"),
        "email": user["email"],
    }


@router.get("/me", response_model=UserResponse, summary="Get current authenticated user profile")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Returns identity and role permissions for the currently authenticated user.
    """
    return current_user
