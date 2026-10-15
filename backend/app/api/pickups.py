from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Any

from app.database import get_db
from app.models.models import User, UserRole, BusinessProfile, NGOProfile, PickupSchedule
from app.schemas.schemas import PickupCreate, PickupUpdate, PickupOut
from app.api.deps import get_current_user
from app.services.pickup_service import (
    get_all_pickups,
    get_pickup_details,
    schedule_pickup,
    update_pickup_status
)

router = APIRouter(prefix="/pickups", tags=["Pickup Scheduling"])

@router.get("", response_model=List[PickupOut])
def list_pickups(
    status_filter: Optional[str] = Query(None, description="Filter by status: Scheduled, Picked Up, Completed, Cancelled"),
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

    return get_all_pickups(db=db, business_id=biz_id, ngo_id=ngo_id, status_filter=status_filter)

@router.post("", response_model=PickupOut, status_code=status.HTTP_201_CREATED)
def create_pickup(
    pickup_in: PickupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return schedule_pickup(db=db, pickup_in=pickup_in, user_id=current_user.id)

@router.get("/{pickup_id}", response_model=PickupOut)
def read_pickup(
    pickup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return get_pickup_details(db=db, pickup_id=pickup_id)

@router.put("/{pickup_id}", response_model=PickupOut)
def update_pickup(
    pickup_id: int,
    pickup_in: PickupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return update_pickup_status(db=db, pickup_id=pickup_id, pickup_in=pickup_in, user_id=current_user.id)
