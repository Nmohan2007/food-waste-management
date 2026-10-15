from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.models.models import User, UserRole, BusinessProfile, NGOProfile
from app.schemas.schemas import BusinessAnalyticsOut, NGOAnalyticsOut, AdminAnalyticsOut, SustainabilityImpactOut
from app.api.deps import get_current_user, require_roles, get_current_business, get_current_ngo
from app.services.analytics_service import (
    get_business_analytics,
    get_ngo_analytics,
    get_admin_analytics,
    get_sustainability_impact
)

router = APIRouter(prefix="/analytics", tags=["Analytics & Impact"])

@router.get("/business", response_model=BusinessAnalyticsOut)
def business_dashboard_analytics(
    db: Session = Depends(get_db),
    business: BusinessProfile = Depends(get_current_business)
) -> Any:
    return get_business_analytics(db=db, business_id=business.id)

@router.get("/ngo", response_model=NGOAnalyticsOut)
def ngo_dashboard_analytics(
    db: Session = Depends(get_db),
    ngo: NGOProfile = Depends(get_current_ngo)
) -> Any:
    return get_ngo_analytics(db=db, ngo_id=ngo.id)

@router.get("/admin", response_model=AdminAnalyticsOut)
def admin_dashboard_analytics(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles([UserRole.ADMIN]))
) -> Any:
    return get_admin_analytics(db=db)

@router.get("/impact", response_model=SustainabilityImpactOut)
def sustainability_impact_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    biz_id = None
    ngo_id = None
    if current_user.role == UserRole.BUSINESS:
        biz = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
        if biz:
            biz_id = biz.id
    elif current_user.role == UserRole.NGO:
        ngo = db.query(NGOProfile).filter(NGOProfile.user_id == current_user.id).first()
        if ngo:
            ngo_id = ngo.id

    return get_sustainability_impact(db=db, business_id=biz_id, ngo_id=ngo_id)
