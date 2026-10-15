from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.models import (
    SurplusListing, ListingStatus, DonationRequest, RequestStatus,
    InventoryItem, BusinessProfile, NGOProfile, User
)
from app.schemas.schemas import SurplusListingCreate, SurplusListingUpdate, DonationRequestCreate
from app.services.inventory_service import classify_expiry
from app.services.notification_service import create_notification

def get_surplus_listings(
    db: Session,
    donor_id: Optional[int] = None,
    category: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    only_available: bool = False
) -> List[Dict[str, Any]]:
    query = db.query(SurplusListing)

    if donor_id is not None:
        query = query.filter(SurplusListing.donor_business_id == donor_id)

    if only_available:
        query = query.filter(SurplusListing.status == ListingStatus.AVAILABLE)
    elif status_filter:
        query = query.filter(SurplusListing.status == status_filter)

    if category:
        query = query.filter(SurplusListing.food_category.ilike(f"%{category}%"))

    if search:
        query = query.filter(SurplusListing.food_name.ilike(f"%{search}%"))

    listings = query.order_by(SurplusListing.expiry_date.asc()).all()

    now = datetime.now(timezone.utc)
    results = []
    for l in listings:
        e_date = l.expiry_date.replace(tzinfo=timezone.utc) if l.expiry_date.tzinfo is None else l.expiry_date
        days = (e_date.date() - now.date()).days

        # Auto-expire if past expiry and still marked available
        if days < 0 and l.status == ListingStatus.AVAILABLE:
            l.status = ListingStatus.EXPIRED
            db.commit()

        donor = db.query(BusinessProfile).filter(BusinessProfile.id == l.donor_business_id).first()
        results.append({
            "id": l.id,
            "donor_business_id": l.donor_business_id,
            "donor_business_name": donor.business_name if donor else "Unknown Business",
            "donor_phone": donor.contact_phone if donor else None,
            "donor_address": f"{donor.address}, {donor.city}" if donor else None,
            "inventory_item_id": l.inventory_item_id,
            "food_name": l.food_name,
            "food_category": l.food_category,
            "available_quantity": l.available_quantity,
            "unit": l.unit,
            "expiry_date": l.expiry_date,
            "pickup_location": l.pickup_location,
            "available_from": l.available_from,
            "available_until": l.available_until,
            "storage_requirements": l.storage_requirements,
            "description": l.description,
            "status": l.status,
            "created_at": l.created_at,
            "updated_at": l.updated_at,
            "days_until_expiry": days
        })
    return results

def get_surplus_listing_by_id(db: Session, listing_id: int) -> Dict[str, Any]:
    l = db.query(SurplusListing).filter(SurplusListing.id == listing_id).first()
    if not l:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Surplus listing not found.")

    donor = db.query(BusinessProfile).filter(BusinessProfile.id == l.donor_business_id).first()
    now = datetime.now(timezone.utc)
    e_date = l.expiry_date.replace(tzinfo=timezone.utc) if l.expiry_date.tzinfo is None else l.expiry_date
    days = (e_date.date() - now.date()).days

    return {
        "id": l.id,
        "donor_business_id": l.donor_business_id,
        "donor_business_name": donor.business_name if donor else "Unknown Business",
        "donor_phone": donor.contact_phone if donor else None,
        "donor_address": f"{donor.address}, {donor.city}" if donor else None,
        "inventory_item_id": l.inventory_item_id,
        "food_name": l.food_name,
        "food_category": l.food_category,
        "available_quantity": l.available_quantity,
        "unit": l.unit,
        "expiry_date": l.expiry_date,
        "pickup_location": l.pickup_location,
        "available_from": l.available_from,
        "available_until": l.available_until,
        "storage_requirements": l.storage_requirements,
        "description": l.description,
        "status": l.status,
        "created_at": l.created_at,
        "updated_at": l.updated_at,
        "days_until_expiry": days
    }

def create_surplus_listing(db: Session, listing_in: SurplusListingCreate, business_id: int) -> Dict[str, Any]:
    # Validate expiry date: Must not be already expired
    now = datetime.now(timezone.utc)
    e_date = listing_in.expiry_date.replace(tzinfo=timezone.utc) if listing_in.expiry_date.tzinfo is None else listing_in.expiry_date
    if (e_date.date() - now.date()).days < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create surplus listing for already expired food."
        )

    # Validate inventory quantity if linked to an inventory item
    if listing_in.inventory_item_id:
        item = db.query(InventoryItem).filter(
            InventoryItem.id == listing_in.inventory_item_id,
            InventoryItem.business_id == business_id
        ).with_for_update().first()

        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Linked inventory item not found in your business records."
            )
        if item.quantity < listing_in.available_quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Requested listing quantity ({listing_in.available_quantity}) exceeds available inventory ({item.quantity})."
            )
        # Deduct or hold inventory quantity to avoid double allocation
        item.quantity -= listing_in.available_quantity

    new_listing = SurplusListing(
        donor_business_id=business_id,
        inventory_item_id=listing_in.inventory_item_id,
        food_name=listing_in.food_name,
        food_category=listing_in.food_category,
        available_quantity=listing_in.available_quantity,
        unit=listing_in.unit,
        expiry_date=listing_in.expiry_date,
        pickup_location=listing_in.pickup_location,
        available_from=listing_in.available_from,
        available_until=listing_in.available_until,
        storage_requirements=listing_in.storage_requirements,
        description=listing_in.description,
        status=ListingStatus.AVAILABLE
    )
    db.add(new_listing)
    db.commit()
    db.refresh(new_listing)
    return get_surplus_listing_by_id(db, new_listing.id)

def create_donation_request(db: Session, request_in: DonationRequestCreate, ngo_id: int) -> Dict[str, Any]:
    listing = db.query(SurplusListing).filter(SurplusListing.id == request_in.listing_id).with_for_update().first()
    if not listing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Listing not found.")

    if listing.status != ListingStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This listing is no longer available for donation (current status: {listing.status})."
        )

    if request_in.requested_quantity > listing.available_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Requested quantity ({request_in.requested_quantity}) exceeds available quantity ({listing.available_quantity})."
        )

    req = DonationRequest(
        listing_id=listing.id,
        ngo_id=ngo_id,
        requested_quantity=request_in.requested_quantity,
        notes=request_in.notes,
        status=RequestStatus.PENDING
    )
    db.add(req)
    
    # Mark listing as Requested to prevent concurrent duplicate claims
    listing.status = ListingStatus.REQUESTED
    db.commit()
    db.refresh(req)

    # Send notification to business donor
    donor = db.query(BusinessProfile).filter(BusinessProfile.id == listing.donor_business_id).first()
    ngo = db.query(NGOProfile).filter(NGOProfile.id == ngo_id).first()
    if donor and donor.user_id:
        create_notification(
            db=db,
            user_id=donor.user_id,
            title="New Food Donation Request",
            message=f"{ngo.organization_name if ngo else 'An NGO'} has requested {req.requested_quantity} {listing.unit} of '{listing.food_name}'.",
            notif_type="donation_request",
            related_entity_type="donation_request",
            related_entity_id=req.id
        )

    return get_donation_request_details(db, req.id)

def get_donation_request_details(db: Session, request_id: int) -> Dict[str, Any]:
    req = db.query(DonationRequest).filter(DonationRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donation request not found.")

    ngo = db.query(NGOProfile).filter(NGOProfile.id == req.ngo_id).first()
    listing_data = get_surplus_listing_by_id(db, req.listing_id)

    return {
        "id": req.id,
        "listing_id": req.listing_id,
        "ngo_id": req.ngo_id,
        "ngo_name": ngo.organization_name if ngo else "Unknown NGO",
        "ngo_phone": ngo.contact_phone if ngo else None,
        "ngo_address": f"{ngo.address}, {ngo.city}" if ngo else None,
        "requested_quantity": req.requested_quantity,
        "notes": req.notes,
        "status": req.status,
        "listing": listing_data,
        "created_at": req.created_at,
        "updated_at": req.updated_at
    }

def get_all_donation_requests(
    db: Session,
    business_id: Optional[int] = None,
    ngo_id: Optional[int] = None,
    status_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    query = db.query(DonationRequest).join(SurplusListing)

    if business_id is not None:
        query = query.filter(SurplusListing.donor_business_id == business_id)

    if ngo_id is not None:
        query = query.filter(DonationRequest.ngo_id == ngo_id)

    if status_filter:
        query = query.filter(DonationRequest.status == status_filter)

    requests = query.order_by(DonationRequest.created_at.desc()).all()
    return [get_donation_request_details(db, r.id) for r in requests]

def approve_donation_request(db: Session, request_id: int, business_id: int) -> Dict[str, Any]:
    req = db.query(DonationRequest).filter(DonationRequest.id == request_id).with_for_update().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donation request not found.")

    listing = db.query(SurplusListing).filter(SurplusListing.id == req.listing_id).with_for_update().first()
    if listing.donor_business_id != business_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to approve this donation.")

    if req.status != RequestStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot approve request in '{req.status}' state.")

    req.status = RequestStatus.APPROVED
    listing.status = ListingStatus.APPROVED
    db.commit()

    # Notify NGO
    ngo = db.query(NGOProfile).filter(NGOProfile.id == req.ngo_id).first()
    if ngo and ngo.user_id:
        create_notification(
            db=db,
            user_id=ngo.user_id,
            title="Donation Request Approved!",
            message=f"Your request for '{listing.food_name}' has been approved. Please proceed to schedule pickup.",
            notif_type="donation_status",
            related_entity_type="donation_request",
            related_entity_id=req.id
        )

    return get_donation_request_details(db, req.id)

def reject_donation_request(db: Session, request_id: int, business_id: int) -> Dict[str, Any]:
    req = db.query(DonationRequest).filter(DonationRequest.id == request_id).with_for_update().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donation request not found.")

    listing = db.query(SurplusListing).filter(SurplusListing.id == req.listing_id).with_for_update().first()
    if listing.donor_business_id != business_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to reject this donation.")

    req.status = RequestStatus.REJECTED
    # Restore listing to Available so others can claim it
    listing.status = ListingStatus.AVAILABLE
    db.commit()

    # Notify NGO
    ngo = db.query(NGOProfile).filter(NGOProfile.id == req.ngo_id).first()
    if ngo and ngo.user_id:
        create_notification(
            db=db,
            user_id=ngo.user_id,
            title="Donation Request Update",
            message=f"Your request for '{listing.food_name}' was declined by the donor.",
            notif_type="donation_status",
            related_entity_type="donation_request",
            related_entity_id=req.id
        )

    return get_donation_request_details(db, req.id)
