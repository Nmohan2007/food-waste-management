from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.models import (
    User, UserRole, BusinessProfile, NGOProfile,
    InventoryItem, SurplusListing, ListingStatus,
    DonationRequest, RequestStatus, PickupSchedule, PickupStatus,
    WasteRecord
)
from app.services.inventory_service import classify_expiry, enrich_inventory_item
from app.core.config import settings

def get_sustainability_impact(db: Session, business_id: Optional[int] = None, ngo_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Calculates verified sustainability impact strictly from completed donations.
    Does NOT count pending, requested, approved, or cancelled requests.
    """
    query = db.query(DonationRequest).join(SurplusListing).filter(DonationRequest.status == RequestStatus.COMPLETED)

    if business_id is not None:
        query = query.filter(SurplusListing.donor_business_id == business_id)

    if ngo_id is not None:
        query = query.filter(DonationRequest.ngo_id == ngo_id)

    completed_requests = query.all()
    total_kg = sum(r.requested_quantity for r in completed_requests)
    completed_count = len(completed_requests)

    meals = round(total_kg * settings.MEALS_PER_KG_FOOD, 1)
    co2e = round(total_kg * settings.CO2_KG_PER_KG_FOOD, 1)

    return {
        "total_redistributed_kg": round(total_kg, 2),
        "completed_donations_count": completed_count,
        "estimated_meals_supported": meals,
        "estimated_co2e_savings_kg": co2e,
        "co2_factor_used": settings.CO2_KG_PER_KG_FOOD,
        "meals_factor_used": settings.MEALS_PER_KG_FOOD,
        "is_estimate": True,
        "disclaimer": (
            "Sustainability metrics are mathematical estimations based on verified completed food transfers. "
            f"Calculations utilize {settings.CO2_KG_PER_KG_FOOD} kg CO2e emissions avoided per 1.0 kg of food rescued "
            f"and an average dietary serving of {1.0 / settings.MEALS_PER_KG_FOOD:.2f} kg per meal."
        )
    }

def get_business_analytics(db: Session, business_id: int) -> Dict[str, Any]:
    # Inventory metrics
    items = db.query(InventoryItem).filter(InventoryItem.business_id == business_id).all()
    enriched_items = [enrich_inventory_item(i) for i in items]

    total_items = len(enriched_items)
    total_qty = round(sum(i["quantity"] for i in enriched_items), 2)

    approaching_expiry = sum(1 for i in enriched_items if i["expiry_status"] in ["Critical", "High Risk"])
    high_risk_count = sum(1 for i in enriched_items if i["waste_risk_category"] == "High Risk")
    critical_risk_count = sum(1 for i in enriched_items if i["waste_risk_category"] == "Critical Risk")

    # Category distribution
    cat_map: Dict[str, float] = {}
    for i in enriched_items:
        cat = i["food_category"]
        cat_map[cat] = cat_map.get(cat, 0.0) + i["quantity"]
    category_distribution = [{"name": k, "value": round(v, 2)} for k, v in cat_map.items()]

    # Expiry distribution
    exp_map: Dict[str, int] = {"Safe": 0, "Medium Risk": 0, "High Risk": 0, "Critical": 0, "Expired": 0}
    for i in enriched_items:
        st = i["expiry_status"]
        exp_map[st] = exp_map.get(st, 0) + 1
    expiry_status_distribution = [{"name": k, "value": v} for k, v in exp_map.items()]

    # Waste risk distribution
    risk_map: Dict[str, int] = {"Low Risk": 0, "Medium Risk": 0, "High Risk": 0, "Critical Risk": 0}
    for i in enriched_items:
        rk = i["waste_risk_category"] or "Low Risk"
        risk_map[rk] = risk_map.get(rk, 0) + 1
    waste_risk_distribution = [{"name": k, "value": v} for k, v in risk_map.items()]

    # Surplus & Donations
    active_surplus = db.query(SurplusListing).filter(
        SurplusListing.donor_business_id == business_id,
        SurplusListing.status == ListingStatus.AVAILABLE
    ).count()

    impact = get_sustainability_impact(db, business_id=business_id)

    # Waste record baseline
    waste_records = db.query(WasteRecord).filter(WasteRecord.business_id == business_id).all()
    total_waste_kg = sum(w.quantity for w in waste_records)
    total_waste_loss = sum(w.financial_loss for w in waste_records)

    # Recent completed donations
    recent_reqs = db.query(DonationRequest).join(SurplusListing).filter(
        SurplusListing.donor_business_id == business_id,
        DonationRequest.status == RequestStatus.COMPLETED
    ).order_by(DonationRequest.updated_at.desc()).limit(5).all()

    recent_donations = []
    for r in recent_reqs:
        ngo = db.query(NGOProfile).filter(NGOProfile.id == r.ngo_id).first()
        listing = db.query(SurplusListing).filter(SurplusListing.id == r.listing_id).first()
        recent_donations.append({
            "id": r.id,
            "food_name": listing.food_name if listing else "Surplus Food",
            "quantity": r.requested_quantity,
            "unit": listing.unit if listing else "kg",
            "ngo_name": ngo.organization_name if ngo else "NGO",
            "date": r.updated_at.strftime("%Y-%m-%d")
        })

    return {
        "total_inventory_items": total_items,
        "total_inventory_quantity": total_qty,
        "items_approaching_expiry": approaching_expiry,
        "high_risk_items_count": high_risk_count,
        "critical_risk_items_count": critical_risk_count,
        "active_surplus_listings": active_surplus,
        "completed_donations_count": impact["completed_donations_count"],
        "total_food_redistributed_kg": impact["total_redistributed_kg"],
        "total_waste_prevented_kg": impact["total_redistributed_kg"],
        "financial_loss_prevented": round(impact["total_redistributed_kg"] * 4.5, 2), # estimated $4.5/kg food value
        "category_distribution": category_distribution,
        "expiry_status_distribution": expiry_status_distribution,
        "waste_risk_distribution": waste_risk_distribution,
        "recent_donations": recent_donations
    }

def get_ngo_analytics(db: Session, ngo_id: int) -> Dict[str, Any]:
    available_listings = db.query(SurplusListing).filter(SurplusListing.status == ListingStatus.AVAILABLE).count()
    pending = db.query(DonationRequest).filter(DonationRequest.ngo_id == ngo_id, DonationRequest.status == RequestStatus.PENDING).count()
    approved = db.query(DonationRequest).filter(DonationRequest.ngo_id == ngo_id, DonationRequest.status == RequestStatus.APPROVED).count()

    upcoming_pickups = db.query(PickupSchedule).join(DonationRequest).filter(
        DonationRequest.ngo_id == ngo_id,
        PickupSchedule.status == PickupStatus.SCHEDULED
    ).count()

    completed_pickups = db.query(PickupSchedule).join(DonationRequest).filter(
        DonationRequest.ngo_id == ngo_id,
        PickupSchedule.status == PickupStatus.COMPLETED
    ).count()

    impact = get_sustainability_impact(db, ngo_id=ngo_id)
    ngo = db.query(NGOProfile).filter(NGOProfile.id == ngo_id).first()
    beneficiaries = ngo.beneficiary_count if ngo else 50

    # Category breakdown of received food
    completed_reqs = db.query(DonationRequest).filter(
        DonationRequest.ngo_id == ngo_id,
        DonationRequest.status == RequestStatus.COMPLETED
    ).all()

    cat_map: Dict[str, float] = {}
    for r in completed_reqs:
        listing = db.query(SurplusListing).filter(SurplusListing.id == r.listing_id).first()
        if listing:
            cat = listing.food_category
            cat_map[cat] = cat_map.get(cat, 0.0) + r.requested_quantity

    category_breakdown = [{"name": k, "value": round(v, 2)} for k, v in cat_map.items()]

    # Monthly food received
    monthly_map: Dict[str, float] = {}
    for r in completed_reqs:
        m_str = r.updated_at.strftime("%b %Y")
        monthly_map[m_str] = monthly_map.get(m_str, 0.0) + r.requested_quantity
    
    monthly_data = [{"month": k, "quantity": round(v, 2)} for k, v in monthly_map.items()]
    if not monthly_data:
        monthly_data = [{"month": datetime.now().strftime("%b %Y"), "quantity": 0.0}]

    return {
        "available_listings_count": available_listings,
        "pending_requests_count": pending,
        "approved_donations_count": approved,
        "upcoming_pickups_count": upcoming_pickups,
        "completed_pickups_count": completed_pickups,
        "total_food_received_kg": impact["total_redistributed_kg"],
        "estimated_meals_served": impact["estimated_meals_supported"],
        "beneficiaries_impacted": beneficiaries,
        "monthly_food_received": monthly_data,
        "category_breakdown": category_breakdown
    }

def get_admin_analytics(db: Session) -> Dict[str, Any]:
    total_users = db.query(User).count()
    total_businesses = db.query(BusinessProfile).count()
    total_ngos = db.query(NGOProfile).count()
    total_inventory = db.query(InventoryItem).count()
    total_listings = db.query(SurplusListing).count()

    impact = get_sustainability_impact(db)

    # Activity log summary
    recent_listings = db.query(SurplusListing).order_by(SurplusListing.created_at.desc()).limit(5).all()
    activity = []
    for l in recent_listings:
        donor = db.query(BusinessProfile).filter(BusinessProfile.id == l.donor_business_id).first()
        activity.append({
            "type": "Surplus Listing",
            "title": f"New listing: {l.food_name} ({l.available_quantity} {l.unit})",
            "actor": donor.business_name if donor else "Business",
            "status": l.status,
            "timestamp": l.created_at.strftime("%Y-%m-%d %H:%M")
        })

    return {
        "total_users": total_users,
        "total_businesses": total_businesses,
        "total_ngos": total_ngos,
        "total_inventory_records": total_inventory,
        "total_surplus_listings": total_listings,
        "total_completed_donations": impact["completed_donations_count"],
        "total_food_redistributed_kg": impact["total_redistributed_kg"],
        "total_co2_savings_kg": impact["estimated_co2e_savings_kg"],
        "total_meals_supported": impact["estimated_meals_supported"],
        "platform_activity": activity
    }
