import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.models import SurplusListing, NGOProfile, BusinessProfile, ListingStatus
from app.core.config import settings

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great-circle distance between two points in kilometers."""
    R = 6371.0  # Earth's radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

def calculate_ngo_compatibility(
    listing: SurplusListing,
    business: BusinessProfile,
    ngo: NGOProfile
) -> Dict[str, Any]:
    # 1. Food Category Compatibility (Weight: 30%)
    accepted_cats = [c.strip().lower() for c in (ngo.accepted_categories or "").split(",") if c.strip()]
    listing_cat = listing.food_category.strip().lower()
    
    if not accepted_cats or listing_cat in accepted_cats:
        category_score = 100.0
    else:
        # Check partial match
        partial = any(c in listing_cat or listing_cat in c for c in accepted_cats)
        category_score = 50.0 if partial else 0.0

    # 2. Quantity Compatibility (Weight: 25%)
    # How well does the available quantity fit the NGO's beneficiary capacity?
    # e.g., ~0.5 kg per meal. If beneficiary_count is 100, ideal donation is 30-70 kg.
    beneficiaries = max(10, ngo.beneficiary_count)
    ideal_capacity_kg = beneficiaries * 0.5
    qty = listing.available_quantity

    if ideal_capacity_kg <= 0:
        quantity_score = 70.0
    else:
        ratio = qty / ideal_capacity_kg
        if 0.2 <= ratio <= 1.5:
            quantity_score = 100.0
        elif ratio < 0.2:
            quantity_score = max(40.0, (ratio / 0.2) * 90.0)
        else: # ratio > 1.5
            quantity_score = max(50.0, 100.0 - (ratio - 1.5) * 30.0)

    # 3. Location Proximity (Weight: 20%)
    dist_km: Optional[float] = None
    if (business.latitude is not None and business.longitude is not None and
        ngo.latitude is not None and ngo.longitude is not None):
        dist_km = haversine_distance(business.latitude, business.longitude, ngo.latitude, ngo.longitude)
        if dist_km <= 5.0:
            location_score = 100.0
        elif dist_km <= 15.0:
            location_score = 80.0
        elif dist_km <= 30.0:
            location_score = 60.0
        elif dist_km <= 60.0:
            location_score = 40.0
        else:
            location_score = max(10.0, 100.0 - dist_km)
    else:
        # Fallback to municipal / zip matching without fabricating coordinates
        if business.zip_code and ngo.zip_code and business.zip_code == ngo.zip_code:
            location_score = 90.0
        elif business.city and ngo.city and business.city.lower() == ngo.city.lower():
            location_score = 85.0
        elif business.state and ngo.state and business.state.lower() == ngo.state.lower():
            location_score = 60.0
        else:
            location_score = 30.0

    # 4. Expiry and Pickup Feasibility (Weight: 15%)
    now = datetime.now(timezone.utc)
    avail_until = listing.available_until.replace(tzinfo=timezone.utc) if listing.available_until.tzinfo is None else listing.available_until
    hours_remaining = (avail_until - now).total_seconds() / 3600.0

    if hours_remaining <= 0:
        expiry_score = 0.0
    elif hours_remaining <= 4:
        expiry_score = 50.0 # tight window
    elif hours_remaining <= 24:
        expiry_score = 85.0
    else:
        expiry_score = 100.0

    # 5. Storage Compatibility (Weight: 10%)
    req_storage = (listing.storage_requirements or "Room Temp").lower()
    ngo_caps = (ngo.storage_capabilities or "").lower()

    if "frozen" in req_storage:
        storage_score = 100.0 if "freezer" in ngo_caps or "frozen" in ngo_caps else 20.0
    elif "refrigerat" in req_storage or "cold" in req_storage:
        storage_score = 100.0 if ("refrigerat" in ngo_caps or "cold" in ngo_caps or "chilled" in ngo_caps) else 30.0
    else:
        # Dry / room temp storage is generally supported by all
        storage_score = 100.0

    # Composite weighted total
    total = (
        (settings.MATCH_CATEGORY_WEIGHT * category_score) +
        (settings.MATCH_QUANTITY_WEIGHT * quantity_score) +
        (settings.MATCH_LOCATION_WEIGHT * location_score) +
        (settings.MATCH_EXPIRY_WEIGHT * expiry_score) +
        (settings.MATCH_STORAGE_WEIGHT * storage_score)
    )
    total_score = round(max(0.0, min(100.0, total)), 1)

    # Explanation text
    reasons = []
    if category_score == 100.0:
        reasons.append(f"Accepts {listing.food_category}.")
    if quantity_score >= 80.0:
        reasons.append(f"Quantity ({listing.available_quantity} {listing.unit}) aligns with {ngo.beneficiary_count} beneficiaries.")
    if dist_km is not None:
        reasons.append(f"Located {dist_km:.1f} km away.")
    elif location_score >= 80.0:
        reasons.append(f"Co-located in {ngo.city}.")
    if storage_score == 100.0:
        reasons.append("Equipped for required storage conditions.")

    return {
        "ngo_id": ngo.id,
        "ngo_name": ngo.organization_name,
        "organization_type": ngo.organization_type,
        "city": ngo.city,
        "distance_km": dist_km,
        "beneficiary_count": ngo.beneficiary_count,
        "compatibility_score": total_score,
        "breakdown": {
            "category_match": round(category_score, 1),
            "quantity_match": round(quantity_score, 1),
            "location_proximity": round(location_score, 1),
            "expiry_feasibility": round(expiry_score, 1),
            "storage_compatibility": round(storage_score, 1),
            "total_score": total_score
        },
        "recommendation_reason": " ".join(reasons)
    }

def get_donation_matches_for_listing(db: Session, listing_id: int) -> Dict[str, Any]:
    listing = db.query(SurplusListing).filter(SurplusListing.id == listing_id).first()
    if not listing:
        return {"error": "Listing not found"}

    business = db.query(BusinessProfile).filter(BusinessProfile.id == listing.donor_business_id).first()
    ngos = db.query(NGOProfile).all()

    scored_ngos = []
    for ngo in ngos:
        score_data = calculate_ngo_compatibility(listing, business, ngo)
        scored_ngos.append(score_data)

    # Rank by compatibility score descending
    scored_ngos.sort(key=lambda x: x["compatibility_score"], reverse=True)

    return {
        "listing_id": listing.id,
        "food_name": listing.food_name,
        "quantity": listing.available_quantity,
        "unit": listing.unit,
        "expiry_date": listing.expiry_date,
        "recommendations": scored_ngos
    }
