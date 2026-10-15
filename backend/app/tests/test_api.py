import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.core.security import get_password_hash
from app.models.models import (
    User, UserRole, BusinessProfile, NGOProfile,
    InventoryItem, SurplusListing, ListingStatus,
    DonationRequest, RequestStatus, PickupSchedule, PickupStatus
)

from sqlalchemy.pool import StaticPool

# Use in-memory SQLite with StaticPool so all connections share the same memory DB
TEST_DATABASE_URL = "sqlite:///:memory:"
engine_test = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine_test)
    db = TestingSessionLocal()

    # Pre-seed test entities
    # 1. Test Admin
    admin = User(
        email="admin_test@platform.org",
        hashed_password=get_password_hash("AdminPass123!"),
        full_name="Admin Test",
        role=UserRole.ADMIN
    )
    db.add(admin)

    # 2. Test Business
    b_user = User(
        email="business_test@market.org",
        hashed_password=get_password_hash("Password123!"),
        full_name="Business Owner",
        role=UserRole.BUSINESS
    )
    db.add(b_user)
    db.flush()

    b_profile = BusinessProfile(
        user_id=b_user.id,
        business_name="Green Grocery Test",
        business_type="Supermarket",
        address="100 Test St",
        city="San Francisco",
        state="CA",
        zip_code="94105",
        latitude=37.7749,
        longitude=-122.4194
    )
    db.add(b_profile)

    # 3. Test NGO
    ngo_user = User(
        email="ngo_test@charity.org",
        hashed_password=get_password_hash("Password123!"),
        full_name="Charity Director",
        role=UserRole.NGO
    )
    db.add(ngo_user)
    db.flush()

    ngo_profile = NGOProfile(
        user_id=ngo_user.id,
        organization_name="FeedTheHungry Test",
        organization_type="Food Bank",
        address="200 Charity Way",
        city="San Francisco",
        state="CA",
        zip_code="94103",
        latitude=37.7800,
        longitude=-122.4100,
        beneficiary_count=100,
        accepted_categories="Produce,Dairy,Bakery,Meat",
        storage_capabilities="Refrigerated,Freezer,Dry Storage"
    )
    db.add(ngo_profile)
    db.commit()
    db.close()

    yield

    Base.metadata.drop_all(bind=engine_test)

client = TestClient(app)

def test_login_success():
    res = client.post("/api/auth/login", json={
        "email": "business_test@market.org",
        "password": "Password123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "business"

def test_login_invalid_password():
    res = client.post("/api/auth/login", json={
        "email": "business_test@market.org",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401

def test_user_registration():
    res = client.post("/api/auth/register", json={
        "email": "new_bistro@food.org",
        "password": "SecurePassword123!",
        "full_name": "Chef Mario",
        "role": "business",
        "organization_name": "Mario's Bistro",
        "organization_type": "Restaurant",
        "city": "San Francisco",
        "state": "CA",
        "zip_code": "94102"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["user"]["email"] == "new_bistro@food.org"
    assert data["user"]["role"] == "business"

def get_auth_headers(email: str, password: str = "Password123!"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_inventory_crud_and_expiry_classification():
    headers = get_auth_headers("business_test@market.org")
    now = datetime.now(timezone.utc)
    expiry = now + timedelta(days=2) # Should be High Risk (<= 3 days)

    # 1. Create inventory
    create_res = client.post("/api/inventory", headers=headers, json={
        "food_name": "Organic Tomatoes",
        "food_category": "Produce",
        "quantity": 50.0,
        "unit": "kg",
        "purchase_date": now.isoformat(),
        "expiry_date": expiry.isoformat(),
        "storage_type": "Room Temp",
        "purchase_price": 2.50,
        "selling_price": 4.99,
        "supplier_name": "Valley Organics"
    })
    assert create_res.status_code == 201
    item = create_res.json()
    assert item["food_name"] == "Organic Tomatoes"
    assert item["expiry_status"] == "High Risk"
    assert item["waste_risk_score"] > 0
    item_id = item["id"]

    # 2. List inventory
    list_res = client.get("/api/inventory", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # 3. Update inventory
    update_res = client.put(f"/api/inventory/{item_id}", headers=headers, json={
        "quantity": 40.0
    })
    assert update_res.status_code == 200
    assert update_res.json()["quantity"] == 40.0

def test_unauthorized_role_access():
    # NGO trying to add business inventory should be forbidden
    ngo_headers = get_auth_headers("ngo_test@charity.org")
    res = client.post("/api/inventory", headers=ngo_headers, json={
        "food_name": "Should Fail",
        "food_category": "Produce",
        "quantity": 10.0,
        "purchase_date": datetime.now(timezone.utc).isoformat(),
        "expiry_date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
        "purchase_price": 1.0
    })
    assert res.status_code == 403

def test_waste_risk_engine_calculation():
    headers = get_auth_headers("business_test@market.org")
    res = client.post("/api/ai/waste-risk", headers=headers, json={
        "food_category": "Dairy",
        "current_stock": 100.0,
        "days_until_expiry": 1,
        "average_daily_sales": 10.0,
        "historical_waste_ratio": 0.20,
        "perishability": "High"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["risk_score"] >= 70.0
    assert data["risk_category"] in ["High Risk", "Critical Risk"]
    assert "explanation" in data
    assert "recommendation" in data

def test_demand_forecasting_engine():
    headers = get_auth_headers("business_test@market.org")
    res = client.post("/api/ai/demand-forecast", headers=headers, json={
        "category": "Produce",
        "forecast_days": 14,
        "lead_time_days": 2
    })
    assert res.status_code == 200
    data = res.json()
    assert "daily_forecast" in data
    assert "projected_surplus_quantity" in data
    assert "recommended_reorder_quantity" in data
    assert "model_used" in data

def test_surplus_listing_request_and_matching_flow():
    b_headers = get_auth_headers("business_test@market.org")
    ngo_headers = get_auth_headers("ngo_test@charity.org")
    now = datetime.now(timezone.utc)

    # 1. Business creates surplus listing
    listing_res = client.post("/api/listings", headers=b_headers, json={
        "food_name": "Surplus Gala Apples",
        "food_category": "Produce",
        "available_quantity": 30.0,
        "unit": "kg",
        "expiry_date": (now + timedelta(days=3)).isoformat(),
        "pickup_location": "100 Test St, SF",
        "available_from": now.isoformat(),
        "available_until": (now + timedelta(days=2)).isoformat(),
        "storage_requirements": "Room Temp",
        "description": "Apples in great condition."
    })
    assert listing_res.status_code == 201
    listing = listing_res.json()
    listing_id = listing["id"]

    # 2. Test Matching Engine for this listing
    match_res = client.get(f"/api/matching/recommendations?listing_id={listing_id}", headers=b_headers)
    assert match_res.status_code == 200
    matches = match_res.json()["recommendations"]
    assert len(matches) >= 1
    assert matches[0]["compatibility_score"] > 50.0
    assert "breakdown" in matches[0]
    assert "recommendation_reason" in matches[0]

    # 3. NGO requests donation
    req_res = client.post(f"/api/listings/{listing_id}/request", headers=ngo_headers, json={
        "listing_id": listing_id,
        "requested_quantity": 30.0,
        "notes": "Will feed 60 shelter guests."
    })
    assert req_res.status_code == 200
    req_data = req_res.json()
    req_id = req_data["id"]
    assert req_data["status"] == "Pending"

    # 4. Business approves donation
    appr_res = client.post(f"/api/donations/{req_id}/approve", headers=b_headers)
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "Approved"

    # 5. Schedule pickup
    pickup_res = client.post("/api/pickups", headers=ngo_headers, json={
        "request_id": req_id,
        "scheduled_time": (now + timedelta(hours=5)).isoformat(),
        "pickup_contact_name": "Jane Volunteer",
        "pickup_contact_phone": "555-0199",
        "vehicle_info": "Blue Van",
        "notes": "Arriving at rear bay."
    })
    assert pickup_res.status_code == 201
    pickup_id = pickup_res.json()["id"]

    # 6. Complete pickup & verify donation completion
    complete_res = client.put(f"/api/pickups/{pickup_id}", headers=b_headers, json={
        "status": "Completed"
    })
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "Completed"

def test_sustainability_impact_calculation():
    b_headers = get_auth_headers("business_test@market.org")
    res = client.get("/api/analytics/impact", headers=b_headers)
    assert res.status_code == 200
    impact = res.json()
    assert impact["total_redistributed_kg"] >= 30.0
    assert impact["estimated_meals_supported"] >= 60.0 # 30 kg * 2 meals/kg
    assert impact["estimated_co2e_savings_kg"] >= 75.0 # 30 kg * 2.5 kg CO2/kg
    assert impact["is_estimate"] is True
    assert "disclaimer" in impact
