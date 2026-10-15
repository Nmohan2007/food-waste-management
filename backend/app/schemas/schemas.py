from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.models import UserRole, ListingStatus, RequestStatus, PickupStatus

# --- User & Auth Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    # Optional profile fields during registration
    organization_name: Optional[str] = None
    organization_type: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    beneficiary_count: Optional[int] = 50
    accepted_categories: Optional[str] = None
    storage_capabilities: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class BusinessProfileOut(BaseModel):
    id: int
    user_id: int
    business_name: str
    business_type: str
    address: str
    city: str
    state: str
    zip_code: str
    latitude: Optional[float]
    longitude: Optional[float]
    contact_person: Optional[str]
    contact_phone: Optional[str]
    description: Optional[str]

    class Config:
        from_attributes = True

class NGOProfileOut(BaseModel):
    id: int
    user_id: int
    organization_name: str
    organization_type: str
    address: str
    city: str
    state: str
    zip_code: str
    latitude: Optional[float]
    longitude: Optional[float]
    contact_person: Optional[str]
    contact_phone: Optional[str]
    beneficiary_count: int
    accepted_categories: str
    storage_capabilities: str
    operating_hours: str
    description: Optional[str]

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    phone: Optional[str]
    is_active: bool
    created_at: datetime
    business_profile: Optional[BusinessProfileOut] = None
    ngo_profile: Optional[NGOProfileOut] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None

# --- Inventory Schemas ---
class InventoryBase(BaseModel):
    food_name: str
    food_category: str
    quantity: float = Field(..., gt=0)
    unit: str = "kg"
    purchase_date: datetime
    expiry_date: datetime
    storage_type: str = "Room Temp"
    purchase_price: float = Field(..., ge=0)
    selling_price: Optional[float] = Field(None, ge=0)
    supplier_name: Optional[str] = None

class InventoryCreate(InventoryBase):
    pass

class InventoryUpdate(BaseModel):
    food_name: Optional[str] = None
    food_category: Optional[str] = None
    quantity: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = None
    purchase_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    storage_type: Optional[str] = None
    purchase_price: Optional[float] = Field(None, ge=0)
    selling_price: Optional[float] = Field(None, ge=0)
    supplier_name: Optional[str] = None

class InventoryOut(InventoryBase):
    id: int
    business_id: int
    created_at: datetime
    updated_at: datetime
    days_until_expiry: int
    expiry_status: str  # Expired, Critical, High Risk, Medium Risk, Safe
    waste_risk_score: Optional[float] = None
    waste_risk_category: Optional[str] = None

    class Config:
        from_attributes = True

# --- AI & Prediction Schemas ---
class WasteRiskInput(BaseModel):
    inventory_item_id: Optional[int] = None
    food_category: str
    current_stock: float
    days_until_expiry: int
    average_daily_sales: float = 5.0
    historical_waste_ratio: float = 0.15
    perishability: str = "Medium"

class WasteRiskScoreOut(BaseModel):
    risk_score: float
    risk_category: str  # Low Risk, Medium Risk, High Risk, Critical Risk
    expiry_risk: float
    stock_risk: float
    waste_history_risk: float
    explanation: str
    recommendation: str

class DemandForecastItem(BaseModel):
    date: str
    predicted_demand: float
    lower_bound: float
    upper_bound: float

class DemandForecastOut(BaseModel):
    category: str
    historical_days_evaluated: int
    model_used: str
    test_metrics: Dict[str, float]
    daily_forecast: List[DemandForecastItem]
    weekly_forecast: List[DemandForecastItem]
    current_stock: float
    projected_surplus_quantity: float
    recommended_reorder_quantity: float
    insight: str

class ReorderRecommendation(BaseModel):
    inventory_item_id: int
    food_name: str
    food_category: str
    current_stock: float
    unit: str
    days_until_expiry: int
    predicted_daily_demand: float
    recommended_reorder: float
    urgency: str
    reason: str

# --- Surplus Marketplace Schemas ---
class SurplusListingBase(BaseModel):
    food_name: str
    food_category: str
    available_quantity: float = Field(..., gt=0)
    unit: str = "kg"
    expiry_date: datetime
    pickup_location: str
    available_from: datetime
    available_until: datetime
    storage_requirements: str = "Room Temp"
    description: Optional[str] = None

class SurplusListingCreate(SurplusListingBase):
    inventory_item_id: Optional[int] = None

class SurplusListingUpdate(BaseModel):
    food_name: Optional[str] = None
    available_quantity: Optional[float] = None
    expiry_date: Optional[datetime] = None
    pickup_location: Optional[str] = None
    available_until: Optional[datetime] = None
    storage_requirements: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ListingStatus] = None

class SurplusListingOut(SurplusListingBase):
    id: int
    donor_business_id: int
    donor_business_name: Optional[str] = None
    donor_phone: Optional[str] = None
    donor_address: Optional[str] = None
    inventory_item_id: Optional[int]
    status: ListingStatus
    created_at: datetime
    updated_at: datetime
    days_until_expiry: int

    class Config:
        from_attributes = True

# --- Donation Request Schemas ---
class DonationRequestCreate(BaseModel):
    listing_id: int
    requested_quantity: float = Field(..., gt=0)
    notes: Optional[str] = None

class DonationRequestOut(BaseModel):
    id: int
    listing_id: int
    ngo_id: int
    ngo_name: Optional[str] = None
    ngo_phone: Optional[str] = None
    ngo_address: Optional[str] = None
    requested_quantity: float
    notes: Optional[str]
    status: RequestStatus
    listing: Optional[SurplusListingOut] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# --- Pickup Schemas ---
class PickupCreate(BaseModel):
    request_id: int
    scheduled_time: datetime
    pickup_contact_name: str
    pickup_contact_phone: str
    vehicle_info: Optional[str] = None
    notes: Optional[str] = None

class PickupUpdate(BaseModel):
    scheduled_time: Optional[datetime] = None
    pickup_contact_name: Optional[str] = None
    pickup_contact_phone: Optional[str] = None
    vehicle_info: Optional[str] = None
    status: Optional[PickupStatus] = None
    notes: Optional[str] = None

class PickupOut(BaseModel):
    id: int
    request_id: int
    scheduled_time: datetime
    pickup_contact_name: str
    pickup_contact_phone: str
    vehicle_info: Optional[str]
    status: PickupStatus
    notes: Optional[str]
    completed_at: Optional[datetime]
    created_at: datetime
    food_name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    donor_name: Optional[str] = None
    ngo_name: Optional[str] = None
    pickup_location: Optional[str] = None

    class Config:
        from_attributes = True

# --- Matching Engine Schemas ---
class MatchingScoreBreakdown(BaseModel):
    category_match: float
    quantity_match: float
    location_proximity: float
    expiry_feasibility: float
    storage_compatibility: float
    total_score: float

class MatchRecommendation(BaseModel):
    ngo_id: int
    ngo_name: str
    organization_type: str
    city: str
    distance_km: Optional[float]
    beneficiary_count: int
    compatibility_score: float
    breakdown: MatchingScoreBreakdown
    recommendation_reason: str

class MatchingRecommendationResponse(BaseModel):
    listing_id: int
    food_name: str
    quantity: float
    unit: str
    expiry_date: datetime
    recommendations: List[MatchRecommendation]

# --- Notification Schemas ---
class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    related_entity_type: Optional[str]
    related_entity_id: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True

# --- Analytics Schemas ---
class BusinessAnalyticsOut(BaseModel):
    total_inventory_items: int
    total_inventory_quantity: float
    items_approaching_expiry: int
    high_risk_items_count: int
    critical_risk_items_count: int
    active_surplus_listings: int
    completed_donations_count: int
    total_food_redistributed_kg: float
    total_waste_prevented_kg: float
    financial_loss_prevented: float
    category_distribution: List[Dict[str, Any]]
    expiry_status_distribution: List[Dict[str, Any]]
    waste_risk_distribution: List[Dict[str, Any]]
    recent_donations: List[Dict[str, Any]]

class NGOAnalyticsOut(BaseModel):
    available_listings_count: int
    pending_requests_count: int
    approved_donations_count: int
    upcoming_pickups_count: int
    completed_pickups_count: int
    total_food_received_kg: float
    estimated_meals_served: float
    beneficiaries_impacted: int
    monthly_food_received: List[Dict[str, Any]]
    category_breakdown: List[Dict[str, Any]]

class AdminAnalyticsOut(BaseModel):
    total_users: int
    total_businesses: int
    total_ngos: int
    total_inventory_records: int
    total_surplus_listings: int
    total_completed_donations: int
    total_food_redistributed_kg: float
    total_co2_savings_kg: float
    total_meals_supported: float
    platform_activity: List[Dict[str, Any]]

class SustainabilityImpactOut(BaseModel):
    total_redistributed_kg: float
    completed_donations_count: int
    estimated_meals_supported: float
    estimated_co2e_savings_kg: float
    co2_factor_used: float
    meals_factor_used: float
    is_estimate: bool = True
    disclaimer: str
