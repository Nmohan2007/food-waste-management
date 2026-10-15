from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Powered Food Waste Management Platform"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "food-waste-management-super-secure-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    DATABASE_URL: str = f"sqlite:///{BASE_DIR.parent / 'data' / 'food_waste.db'}"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Sustainability Impact Factors
    CO2_KG_PER_KG_FOOD: float = 2.5
    MEALS_PER_KG_FOOD: float = 2.0

    # Waste Risk Scoring Weights
    RISK_EXPIRY_WEIGHT: float = 0.40
    RISK_STOCK_WEIGHT: float = 0.35
    RISK_WASTE_WEIGHT: float = 0.25

    # NGO Donation Matching Weights
    MATCH_CATEGORY_WEIGHT: float = 0.30
    MATCH_QUANTITY_WEIGHT: float = 0.25
    MATCH_LOCATION_WEIGHT: float = 0.20
    MATCH_EXPIRY_WEIGHT: float = 0.15
    MATCH_STORAGE_WEIGHT: float = 0.10

    # Expiry Risk Thresholds (in days)
    CRITICAL_RISK_DAYS: int = 1
    HIGH_RISK_DAYS: int = 3
    MEDIUM_RISK_DAYS: int = 7

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
