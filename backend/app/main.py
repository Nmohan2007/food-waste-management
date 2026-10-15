from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.database import engine, Base
import app.models.models # Ensure all models are registered

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-stack AI-Powered Food Waste Management Platform for Surplus Identification and Redistribution Optimization",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits all local dev origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import API Routers
from app.api.auth import router as auth_router
from app.api.inventory import router as inventory_router
from app.api.ai import router as ai_router
from app.api.listings import router as listings_router
from app.api.donations import router as donations_router
from app.api.matching import router as matching_router
from app.api.pickups import router as pickups_router
from app.api.notifications import router as notifications_router
from app.api.analytics import router as analytics_router
from app.api.admin import router as admin_router

app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(inventory_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)
app.include_router(listings_router, prefix=settings.API_V1_STR)
app.include_router(donations_router, prefix=settings.API_V1_STR)
app.include_router(matching_router, prefix=settings.API_V1_STR)
app.include_router(pickups_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(analytics_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "status": "online",
        "documentation": "/docs",
        "version": "1.0.0"
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "sustainability_metrics_active": True
    }
