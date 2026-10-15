from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Any

from app.database import get_db
from app.models.models import User, UserRole, BusinessProfile, NGOProfile, DonationRequest, RequestStatus, SurplusListing, ListingStatus
from app.schemas.schemas import DonationRequestOut
from app.api.deps import get_current_user, get_current_business, get_current_ngo
from app.services.marketplace_service import (
    get_all_donation_requests,
    get_donation_request_details,
    approve_donation_request,
    reject_donation_request
)

router = APIRouter(prefix="/donations", tags=["Donations Management"])

@router.get("", response_model=List[DonationRequestOut])
def list_donations(
    status_filter: Optional[str] = Query(None, description="Filter by request status"),
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

    return get_all_donation_requests(db=db, business_id=biz_id, ngo_id=ngo_id, status_filter=status_filter)

@router.get("/{donation_id}", response_model=DonationRequestOut)
def read_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return get_donation_request_details(db=db, request_id=donation_id)

@router.post("/{donation_id}/approve", response_model=DonationRequestOut)
def approve_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    business: BusinessProfile = Depends(get_current_business)
) -> Any:
    return approve_donation_request(db=db, request_id=donation_id, business_id=business.id)

@router.post("/{donation_id}/reject", response_model=DonationRequestOut)
def reject_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    business: BusinessProfile = Depends(get_current_business)
) -> Any:
    return reject_donation_request(db=db, request_id=donation_id, business_id=business.id)

@router.post("/{donation_id}/cancel", response_model=DonationRequestOut)
def cancel_donation(
    donation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    req = db.query(DonationRequest).filter(DonationRequest.id == donation_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donation request not found.")

    listing = db.query(SurplusListing).filter(SurplusListing.id == req.listing_id).first()

    # Can only cancel if pending
    if req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot cancel request in status '{req.status}'.")

    req.status = RequestStatus.CANCELLED
    if listing:
        listing.status = ListingStatus.AVAILABLE

    db.commit()
    return get_donation_request_details(db=db, request_id=donation_id)
