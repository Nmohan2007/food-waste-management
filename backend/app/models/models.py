import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class UserRole(str, enum.Enum):
    BUSINESS = "business"
    NGO = "ngo"
    ADMIN = "admin"

class ListingStatus(str, enum.Enum):
    AVAILABLE = "Available"
    REQUESTED = "Requested"
    APPROVED = "Approved"
    SCHEDULED = "Scheduled"
    PICKED_UP = "Picked Up"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"
    EXPIRED = "Expired"

class RequestStatus(str, enum.Enum):
    PENDING = "Pending"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    CANCELLED = "Cancelled"
    COMPLETED = "Completed"

class PickupStatus(str, enum.Enum):
    SCHEDULED = "Scheduled"
    PICKED_UP = "Picked Up"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.BUSINESS, nullable=False)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    business_profile = relationship("BusinessProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    ngo_profile = relationship("NGOProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")


class BusinessProfile(Base):
    __tablename__ = "business_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    business_name = Column(String(255), nullable=False)
    business_type = Column(String(100), default="Supermarket")  # Restaurant, Supermarket, Bakery, Hotel, Distributor
    address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    zip_code = Column(String(20), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    contact_person = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="business_profile")
    inventory_items = relationship("InventoryItem", back_populates="business", cascade="all, delete-orphan")
    sales_records = relationship("SalesRecord", back_populates="business", cascade="all, delete-orphan")
    waste_records = relationship("WasteRecord", back_populates="business", cascade="all, delete-orphan")
    surplus_listings = relationship("SurplusListing", back_populates="donor_business", cascade="all, delete-orphan")


class NGOProfile(Base):
    __tablename__ = "ngo_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    organization_name = Column(String(255), nullable=False)
    organization_type = Column(String(100), default="Food Bank")  # Food Bank, Shelter, Soup Kitchen, Community Fridge
    address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    zip_code = Column(String(20), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    contact_person = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    beneficiary_count = Column(Integer, default=50)
    accepted_categories = Column(String(500), default="Produce,Bakery,Dairy,Canned/Dry,Prepared Meals")  # Comma separated
    storage_capabilities = Column(String(255), default="Refrigerated,Dry Storage")  # Refrigeration, Freezer, Dry Storage
    operating_hours = Column(String(255), default="09:00 - 18:00")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    user = relationship("User", back_populates="ngo_profile")
    donation_requests = relationship("DonationRequest", back_populates="ngo", cascade="all, delete-orphan")


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    food_name = Column(String(255), nullable=False)
    food_category = Column(String(100), nullable=False, index=True)  # Produce, Dairy, Bakery, Meat, Prepared Meals, Canned/Dry, Beverages
    quantity = Column(Float, nullable=False, default=0.0)
    unit = Column(String(50), nullable=False, default="kg")  # kg, items, boxes, liters, loaves, meals
    purchase_date = Column(DateTime, nullable=False, default=utc_now)
    expiry_date = Column(DateTime, nullable=False, index=True)
    storage_type = Column(String(100), nullable=False, default="Room Temp")  # Room Temp, Refrigerated, Frozen
    purchase_price = Column(Float, nullable=False, default=0.0)
    selling_price = Column(Float, nullable=True)
    supplier_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    business = relationship("BusinessProfile", back_populates="inventory_items")
    listings = relationship("SurplusListing", back_populates="inventory_item")


class SalesRecord(Base):
    __tablename__ = "sales_records"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    item_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False, default="kg")
    sale_date = Column(DateTime, nullable=False, default=utc_now, index=True)
    total_revenue = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=utc_now)

    business = relationship("BusinessProfile", back_populates="sales_records")


class WasteRecord(Base):
    __tablename__ = "waste_records"

    id = Column(Integer, primary_key=True, index=True)
    business_id = Column(Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    item_name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False, default="kg")
    waste_date = Column(DateTime, nullable=False, default=utc_now, index=True)
    reason = Column(String(255), default="Expired")  # Expired, Damaged, Spoilage, Overproduction
    financial_loss = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=utc_now)

    business = relationship("BusinessProfile", back_populates="waste_records")


class SurplusListing(Base):
    __tablename__ = "surplus_listings"

    id = Column(Integer, primary_key=True, index=True)
    donor_business_id = Column(Integer, ForeignKey("business_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id", ondelete="SET NULL"), nullable=True)
    food_name = Column(String(255), nullable=False)
    food_category = Column(String(100), nullable=False, index=True)
    available_quantity = Column(Float, nullable=False)
    unit = Column(String(50), nullable=False, default="kg")
    expiry_date = Column(DateTime, nullable=False, index=True)
    pickup_location = Column(String(255), nullable=False)
    available_from = Column(DateTime, nullable=False, default=utc_now)
    available_until = Column(DateTime, nullable=False)
    storage_requirements = Column(String(100), default="Room Temp")
    description = Column(Text, nullable=True)
    status = Column(Enum(ListingStatus), default=ListingStatus.AVAILABLE, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    donor_business = relationship("BusinessProfile", back_populates="surplus_listings")
    inventory_item = relationship("InventoryItem", back_populates="listings")
    requests = relationship("DonationRequest", back_populates="listing", cascade="all, delete-orphan")


class DonationRequest(Base):
    __tablename__ = "donation_requests"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("surplus_listings.id", ondelete="CASCADE"), nullable=False, index=True)
    ngo_id = Column(Integer, ForeignKey("ngo_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    requested_quantity = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(Enum(RequestStatus), default=RequestStatus.PENDING, nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    listing = relationship("SurplusListing", back_populates="requests")
    ngo = relationship("NGOProfile", back_populates="donation_requests")
    pickup_schedule = relationship("PickupSchedule", back_populates="request", uselist=False, cascade="all, delete-orphan")


class PickupSchedule(Base):
    __tablename__ = "pickup_schedules"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("donation_requests.id", ondelete="CASCADE"), unique=True, nullable=False)
    scheduled_time = Column(DateTime, nullable=False)
    pickup_contact_name = Column(String(255), nullable=False)
    pickup_contact_phone = Column(String(50), nullable=False)
    vehicle_info = Column(String(255), nullable=True)
    status = Column(Enum(PickupStatus), default=PickupStatus.SCHEDULED, nullable=False, index=True)
    notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    request = relationship("DonationRequest", back_populates="pickup_schedule")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="system")  # expiry_alert, donation_request, donation_status, pickup_update, listing_expiry, system
    is_read = Column(Boolean, default=False, index=True)
    related_entity_type = Column(String(50), nullable=True)
    related_entity_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)  # e.g., CREATE_INVENTORY, APPROVE_DONATION
    entity_name = Column(String(100), nullable=False)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="audit_logs")
