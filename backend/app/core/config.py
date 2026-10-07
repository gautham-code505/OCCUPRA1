import os
from typing import List, Union
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # General App Settings
    PROJECT_NAME: str = "CampusPulse AI"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    # JWT Authentication
    JWT_SECRET_KEY: str = "campuspulse_super_secret_jwt_key_change_in_production_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Firebase Firestore
    FIREBASE_CREDENTIALS_PATH: str = ""
    FIREBASE_PROJECT_ID: str = ""
    FIREBASE_CLIENT_EMAIL: str = ""
    FIREBASE_PRIVATE_KEY: str = ""
    USE_MOCK_DATABASE: bool = False

    # Machine Learning
    MODEL_PATH: str = "app/ml/model/xgboost_crowd_model.json"
    SCALER_PATH: str = "app/ml/model/preprocessor.joblib"

    # Virtual IoT Simulation
    SIMULATION_INTERVAL_SECONDS: float = 10.0
    SIMULATION_AUTO_START: bool = True
    DEFAULT_SCENARIO: str = "normal_day"

    # Crowd Categorization Thresholds (Percentages)
    LOW_CROWD_THRESHOLD: float = 40.0
    MEDIUM_CROWD_THRESHOLD: float = 70.0


settings = Settings()
