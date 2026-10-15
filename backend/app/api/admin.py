from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Any, Dict

from app.database import get_db
from app.models.models import User, UserRole, BusinessProfile, NGOProfile, SurplusListing, AuditLog
from app.schemas.schemas import UserOut, SurplusListingOut
from app.api.deps import require_roles
from app.services.marketplace_service import get_surplus_listings

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

@router.get("/users", response_model=List[UserOut])
def list_all_users(
    role: Optional[str] = Query(None, description="Filter by role"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles([UserRole.ADMIN]))
) -> Any:
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.created_at.desc()).all()

@router.put("/users/{user_id}/toggle-status")
def toggle_user_active_status(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles([UserRole.ADMIN]))
) -> Any:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    
    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own administrator account.")

    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return {"message": f"User account has been {'activated' if user.is_active else 'deactivated'}.", "is_active": user.is_active}

@router.get("/listings", response_model=List[SurplusListingOut])
def admin_list_all_listings(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles([UserRole.ADMIN]))
) -> Any:
    return get_surplus_listings(db=db)

@router.delete("/listings/{listing_id}")
def admin_delete_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles([UserRole.ADMIN]))
) -> Any:
    listing = db.query(SurplusListing).filter(SurplusListing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")
    db.delete(listing)
    db.commit()
    return {"message": "Listing deleted by administrator."}

@router.get("/audit-logs")
def view_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles([UserRole.ADMIN]))
) -> Any:
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": l.id,
            "user_id": l.user_id,
            "action": l.action,
            "entity_name": l.entity_name,
            "entity_id": l.entity_id,
            "details": l.details,
            "timestamp": l.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        for l in logs
    ]
