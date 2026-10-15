from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Any

from app.database import get_db
from app.models.models import User, UserRole, BusinessProfile, NGOProfile, SurplusListing
from app.schemas.schemas import SurplusListingCreate, SurplusListingUpdate, SurplusListingOut, DonationRequestCreate, DonationRequestOut
from app.api.deps import get_current_user, get_current_business, get_current_ngo, require_roles
from app.services.marketplace_service import (
    get_surplus_listings,
    get_surplus_listing_by_id,
    create_surplus_listing,
    create_donation_request
)

router = APIRouter(prefix="/listings", tags=["Surplus Marketplace"])

@router.get("", response_model=List[SurplusListingOut])
def list_listings(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search by food name"),
    status_filter: Optional[str] = Query(None, description="Filter by listing status"),
    only_available: bool = Query(False, description="Show only available listings"),
    donor_id: Optional[int] = Query(None, description="Filter by donor business ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # If user is a business and asks for their listings, or general browse
    return get_surplus_listings(
        db=db,
        donor_id=donor_id,
        category=category,
        status_filter=status_filter,
        search=search,
        only_available=only_available
    )

@router.post("", response_model=SurplusListingOut, status_code=status.HTTP_201_CREATED)
def create_listing(
    listing_in: SurplusListingCreate,
    db: Session = Depends(get_db),
    business: BusinessProfile = Depends(get_current_business)
) -> Any:
    return create_surplus_listing(db=db, listing_in=listing_in, business_id=business.id)

@router.get("/{listing_id}", response_model=SurplusListingOut)
def read_listing(
    listing_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    return get_surplus_listing_by_id(db=db, listing_id=listing_id)

@router.put("/{listing_id}", response_model=SurplusListingOut)
def update_listing(
    listing_id: int,
    listing_in: SurplusListingUpdate,
    db: Session = Depends(get_db),
    business: BusinessProfile = Depends(get_current_business)
) -> Any:
    listing = db.query(SurplusListing).filter(
        SurplusListing.id == listing_id,
        SurplusListing.donor_business_id == business.id
    ).first()

    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Surplus listing not found or not owned by your business."
        )

    update_data = listing_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(listing, field, value)

    db.commit()
    return get_surplus_listing_by_id(db=db, listing_id=listing_id)

@router.post("/{listing_id}/request", response_model=DonationRequestOut)
def request_donation(
    listing_id: int,
    request_in: DonationRequestCreate,
    db: Session = Depends(get_db),
    ngo: NGOProfile = Depends(get_current_ngo)
) -> Any:
    request_in.listing_id = listing_id
    return create_donation_request(db=db, request_in=request_in, ngo_id=ngo.id)
