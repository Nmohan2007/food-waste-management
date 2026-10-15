from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.models import (
    PickupSchedule, PickupStatus, DonationRequest, RequestStatus,
    SurplusListing, ListingStatus, BusinessProfile, NGOProfile, AuditLog
)
from app.schemas.schemas import PickupCreate, PickupUpdate
from app.services.notification_service import create_notification

def get_pickup_details(db: Session, pickup_id: int) -> Dict[str, Any]:
    p = db.query(PickupSchedule).filter(PickupSchedule.id == pickup_id).first()
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pickup schedule not found.")

    req = db.query(DonationRequest).filter(DonationRequest.id == p.request_id).first()
    listing = db.query(SurplusListing).filter(SurplusListing.id == req.listing_id).first() if req else None
    donor = db.query(BusinessProfile).filter(BusinessProfile.id == listing.donor_business_id).first() if listing else None
    ngo = db.query(NGOProfile).filter(NGOProfile.id == req.ngo_id).first() if req else None

    return {
        "id": p.id,
        "request_id": p.request_id,
        "scheduled_time": p.scheduled_time,
        "pickup_contact_name": p.pickup_contact_name,
        "pickup_contact_phone": p.pickup_contact_phone,
        "vehicle_info": p.vehicle_info,
        "status": p.status,
        "notes": p.notes,
        "completed_at": p.completed_at,
        "created_at": p.created_at,
        "food_name": listing.food_name if listing else "N/A",
        "quantity": req.requested_quantity if req else 0.0,
        "unit": listing.unit if listing else "kg",
        "donor_name": donor.business_name if donor else "N/A",
        "ngo_name": ngo.organization_name if ngo else "N/A",
        "pickup_location": listing.pickup_location if listing else "N/A"
    }

def schedule_pickup(db: Session, pickup_in: PickupCreate, user_id: int) -> Dict[str, Any]:
    req = db.query(DonationRequest).filter(DonationRequest.id == pickup_in.request_id).with_for_update().first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donation request not found.")

    if req.status != RequestStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Pickup can only be scheduled for Approved requests (current status: {req.status})."
        )

    # Validate scheduled time is not in the past
    now = datetime.now(timezone.utc)
    s_time = pickup_in.scheduled_time.replace(tzinfo=timezone.utc) if pickup_in.scheduled_time.tzinfo is None else pickup_in.scheduled_time
    if s_time < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pickup time cannot be in the past.")

    # Check listing expiry
    listing = db.query(SurplusListing).filter(SurplusListing.id == req.listing_id).first()
    if listing:
        l_exp = listing.expiry_date.replace(tzinfo=timezone.utc) if listing.expiry_date.tzinfo is None else listing.expiry_date
        if s_time > l_exp:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Pickup time cannot be after the food item's expiry date ({l_exp.strftime('%Y-%m-%d %H:%M')})."
            )

    # Check if existing schedule exists
    existing = db.query(PickupSchedule).filter(PickupSchedule.request_id == req.id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A pickup has already been scheduled for this request.")

    pickup = PickupSchedule(
        request_id=req.id,
        scheduled_time=pickup_in.scheduled_time,
        pickup_contact_name=pickup_in.pickup_contact_name,
        pickup_contact_phone=pickup_in.pickup_contact_phone,
        vehicle_info=pickup_in.vehicle_info,
        status=PickupStatus.SCHEDULED,
        notes=pickup_in.notes
    )
    db.add(pickup)

    if listing:
        listing.status = ListingStatus.SCHEDULED

    db.commit()
    db.refresh(pickup)

    # Notify donor and NGO
    donor = db.query(BusinessProfile).filter(BusinessProfile.id == listing.donor_business_id).first() if listing else None
    ngo = db.query(NGOProfile).filter(NGOProfile.id == req.ngo_id).first()

    if donor and donor.user_id:
        create_notification(
            db=db,
            user_id=donor.user_id,
            title="Pickup Scheduled",
            message=f"Pickup for '{listing.food_name}' scheduled on {pickup.scheduled_time.strftime('%Y-%m-%d %H:%M')} by {ngo.organization_name if ngo else 'NGO'}.",
            notif_type="pickup_update",
            related_entity_type="pickup",
            related_entity_id=pickup.id
        )

    return get_pickup_details(db, pickup.id)

def update_pickup_status(db: Session, pickup_id: int, pickup_in: PickupUpdate, user_id: int) -> Dict[str, Any]:
    pickup = db.query(PickupSchedule).filter(PickupSchedule.id == pickup_id).with_for_update().first()
    if not pickup:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pickup schedule not found.")

    req = db.query(DonationRequest).filter(DonationRequest.id == pickup.request_id).with_for_update().first()
    listing = db.query(SurplusListing).filter(SurplusListing.id == req.listing_id).with_for_update().first() if req else None

    update_data = pickup_in.model_dump(exclude_unset=True)

    if "scheduled_time" in update_data and update_data["scheduled_time"]:
        pickup.scheduled_time = update_data["scheduled_time"]
    if "pickup_contact_name" in update_data and update_data["pickup_contact_name"]:
        pickup.pickup_contact_name = update_data["pickup_contact_name"]
    if "pickup_contact_phone" in update_data and update_data["pickup_contact_phone"]:
        pickup.pickup_contact_phone = update_data["pickup_contact_phone"]
    if "vehicle_info" in update_data:
        pickup.vehicle_info = update_data["vehicle_info"]
    if "notes" in update_data:
        pickup.notes = update_data["notes"]

    new_status = update_data.get("status")
    if new_status:
        pickup.status = new_status
        if new_status == PickupStatus.COMPLETED:
            pickup.completed_at = datetime.now(timezone.utc)
            if req:
                req.status = RequestStatus.COMPLETED
            if listing:
                listing.status = ListingStatus.COMPLETED
        elif new_status == PickupStatus.PICKED_UP:
            if listing:
                listing.status = ListingStatus.PICKED_UP
        elif new_status == PickupStatus.CANCELLED:
            if req:
                req.status = RequestStatus.CANCELLED
            if listing:
                listing.status = ListingStatus.AVAILABLE

    db.commit()
    db.refresh(pickup)

    # Notify parties
    donor = db.query(BusinessProfile).filter(BusinessProfile.id == listing.donor_business_id).first() if listing else None
    ngo = db.query(NGOProfile).filter(NGOProfile.id == req.ngo_id).first() if req else None

    if donor and donor.user_id:
        create_notification(
            db=db,
            user_id=donor.user_id,
            title="Pickup Status Updated",
            message=f"Pickup for '{listing.food_name if listing else 'item'}' status updated to {pickup.status}.",
            notif_type="pickup_update",
            related_entity_type="pickup",
            related_entity_id=pickup.id
        )

    if ngo and ngo.user_id:
        create_notification(
            db=db,
            user_id=ngo.user_id,
            title="Pickup Status Updated",
            message=f"Pickup for '{listing.food_name if listing else 'item'}' status updated to {pickup.status}.",
            notif_type="pickup_update",
            related_entity_type="pickup",
            related_entity_id=pickup.id
        )

    return get_pickup_details(db, pickup.id)

def get_all_pickups(
    db: Session,
    business_id: Optional[int] = None,
    ngo_id: Optional[int] = None,
    status_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    query = db.query(PickupSchedule).join(DonationRequest).join(SurplusListing)

    if business_id is not None:
        query = query.filter(SurplusListing.donor_business_id == business_id)

    if ngo_id is not None:
        query = query.filter(DonationRequest.ngo_id == ngo_id)

    if status_filter:
        query = query.filter(PickupSchedule.status == status_filter)

    pickups = query.order_by(PickupSchedule.scheduled_time.asc()).all()
    return [get_pickup_details(db, p.id) for p in pickups]
