import os
import random
from datetime import datetime, timedelta, timezone
from app.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import (
    User, UserRole, BusinessProfile, NGOProfile,
    InventoryItem, SalesRecord, WasteRecord,
    SurplusListing, ListingStatus, DonationRequest, RequestStatus,
    PickupSchedule, PickupStatus, Notification
)

def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already contains data. Skipping re-seed.")
            return

        print("Seeding realistic sample demonstration data...")
        now = datetime.now(timezone.utc)

        # 1. Create Users & Profiles
        # Admin
        admin_user = User(
            email="admin@foodwaste.org",
            hashed_password=get_password_hash("AdminPass123!"),
            full_name="Platform Administrator",
            role=UserRole.ADMIN,
            phone="+1-555-0100"
        )
        db.add(admin_user)

        # Business 1: FreshMart Supermarket
        b1_user = User(
            email="business@freshmart.com",
            hashed_password=get_password_hash("Password123!"),
            full_name="David Green (FreshMart)",
            role=UserRole.BUSINESS,
            phone="+1-555-0110"
        )
        db.add(b1_user)
        db.flush()

        b1_profile = BusinessProfile(
            user_id=b1_user.id,
            business_name="FreshMart Supermarket (Sample)",
            business_type="Supermarket",
            address="742 Evergreen Terrace",
            city="San Francisco",
            state="CA",
            zip_code="94107",
            latitude=37.7749,
            longitude=-122.4194,
            contact_person="David Green",
            contact_phone="+1-555-0110",
            description="Neighborhood supermarket offering fresh produce, dairy, bakery, and prepared meals."
        )
        db.add(b1_profile)

        # Business 2: Golden Wheat Bakery
        b2_user = User(
            email="bakery@goldenwheat.com",
            hashed_password=get_password_hash("Password123!"),
            full_name="Sarah Miller (Golden Wheat)",
            role=UserRole.BUSINESS,
            phone="+1-555-0120"
        )
        db.add(b2_user)
        db.flush()

        b2_profile = BusinessProfile(
            user_id=b2_user.id,
            business_name="Golden Wheat Artisan Bakery (Sample)",
            business_type="Bakery",
            address="108 Mission Boulevard",
            city="San Francisco",
            state="CA",
            zip_code="94110",
            latitude=37.7600,
            longitude=-122.4200,
            contact_person="Sarah Miller",
            contact_phone="+1-555-0120",
            description="Artisan sourdough bakery producing daily fresh bread, rolls, and pastries."
        )
        db.add(b2_profile)

        # NGO 1: City Community Food Bank
        ngo1_user = User(
            email="contact@communitypantry.org",
            hashed_password=get_password_hash("Password123!"),
            full_name="Elena Rostova (Community Pantry)",
            role=UserRole.NGO,
            phone="+1-555-0130"
        )
        db.add(ngo1_user)
        db.flush()

        ngo1_profile = NGOProfile(
            user_id=ngo1_user.id,
            organization_name="City Community Food Bank (Sample)",
            organization_type="Food Bank",
            address="500 Howard Street",
            city="San Francisco",
            state="CA",
            zip_code="94105",
            latitude=37.7890,
            longitude=-122.3980,
            contact_person="Elena Rostova",
            contact_phone="+1-555-0130",
            beneficiary_count=180,
            accepted_categories="Produce,Dairy,Bakery,Prepared Meals,Canned/Dry",
            storage_capabilities="Refrigerated,Freezer,Dry Storage",
            operating_hours="08:00 - 19:00",
            description="Serving over 180 low-income families and seniors with weekly nutritional rescue packages."
        )
        db.add(ngo1_profile)

        # NGO 2: Hope Homeless Shelter Kitchen
        ngo2_user = User(
            email="hope@sheltermeals.org",
            hashed_password=get_password_hash("Password123!"),
            full_name="Marcus Vance (Hope Shelter)",
            role=UserRole.NGO,
            phone="+1-555-0140"
        )
        db.add(ngo2_user)
        db.flush()

        ngo2_profile = NGOProfile(
            user_id=ngo2_user.id,
            organization_name="Hope Community Kitchen (Sample)",
            organization_type="Soup Kitchen",
            address="330 6th Street",
            city="San Francisco",
            state="CA",
            zip_code="94103",
            latitude=37.7780,
            longitude=-122.4080,
            contact_person="Marcus Vance",
            contact_phone="+1-555-0140",
            beneficiary_count=90,
            accepted_categories="Produce,Bakery,Meat,Prepared Meals,Dairy",
            storage_capabilities="Refrigerated,Dry Storage",
            operating_hours="10:00 - 20:00",
            description="Daily hot meal service preparing 200+ warm dinners nightly for homeless community members."
        )
        db.add(ngo2_profile)
        db.flush()

        # 2. Inventory Items for FreshMart (b1_profile)
        # Creating a diverse mix with all 5 expiry categories:
        # Expired (<= 0d), Critical (1d), High Risk (2-3d), Medium Risk (4-7d), Safe (> 7d)
        sample_inventory = [
            # Critical / High Risk
            ("Organic Spinach & Salad Greens", "Produce", 28.0, "kg", now - timedelta(days=5), now + timedelta(hours=18), "Refrigerated", 2.20, 4.99, "Valley Organic Farms"),
            ("Whole Pasteurized Milk 2L", "Dairy", 35.0, "liters", now - timedelta(days=6), now + timedelta(days=1), "Refrigerated", 1.80, 3.49, "Clover Dairy Co."),
            ("Greek Yogurt Tubs 500g", "Dairy", 24.0, "items", now - timedelta(days=8), now + timedelta(days=2), "Refrigerated", 2.00, 4.29, "Sun Valley Dairy"),
            ("Ripe Hass Avocados", "Produce", 45.0, "kg", now - timedelta(days=4), now + timedelta(days=2), "Room Temp", 3.00, 5.99, "Cal-Avocado Importers"),
            ("Artisan Baguettes & Batards", "Bakery", 40.0, "items", now - timedelta(days=1), now + timedelta(hours=22), "Room Temp", 0.90, 2.80, "Golden Wheat"),
            
            # Medium Risk
            ("Cheddar Cheese Blocks 400g", "Dairy", 30.0, "items", now - timedelta(days=14), now + timedelta(days=5), "Refrigerated", 2.50, 5.20, "Pacific Creamery"),
            ("Fresh Sliced Turkey Breast", "Meat", 18.0, "kg", now - timedelta(days=3), now + timedelta(days=4), "Refrigerated", 6.50, 11.99, "Golden Gate Meats"),
            ("Organic Strawberries Clamshells", "Produce", 32.0, "boxes", now - timedelta(days=2), now + timedelta(days=4), "Refrigerated", 2.10, 4.50, "Watsonville Berries"),
            ("Ready-to-Eat Caesar Chicken Salads", "Prepared Meals", 22.0, "meals", now - timedelta(days=2), now + timedelta(days=3), "Refrigerated", 3.80, 7.99, "Fresh Kitchen Deli"),
            
            # Safe (Healthy shelf-life)
            ("Dry Rolled Oats 1kg", "Canned/Dry", 75.0, "boxes", now - timedelta(days=10), now + timedelta(days=90), "Room Temp", 1.40, 3.29, "Grain Fields"),
            ("Organic Brown Rice 2kg", "Canned/Dry", 60.0, "boxes", now - timedelta(days=20), now + timedelta(days=180), "Room Temp", 2.20, 4.99, "Lundberg Farms"),
            ("Canned Diced Tomatoes 400g", "Canned/Dry", 120.0, "items", now - timedelta(days=30), now + timedelta(days=365), "Room Temp", 0.85, 1.89, "Napoli Canning"),
            ("Cold Pressed Orange Juice 1L", "Beverages", 40.0, "liters", now - timedelta(days=3), now + timedelta(days=12), "Refrigerated", 2.40, 4.99, "Orchard Fresh"),
            ("Frozen Mixed Vegetables 1kg", "Produce", 50.0, "boxes", now - timedelta(days=15), now + timedelta(days=120), "Frozen", 1.50, 3.19, "Green Valley Frozen"),
            
            # Expired item for demonstration of expiry alert & protection
            ("Day-Old Sourdough Boules", "Bakery", 15.0, "items", now - timedelta(days=4), now - timedelta(days=1), "Room Temp", 0.80, 2.50, "Golden Wheat"),
        ]

        inv_objs = []
        for name, cat, qty, unit, p_date, e_date, storage, p_price, s_price, supp in sample_inventory:
            inv = InventoryItem(
                business_id=b1_profile.id,
                food_name=name,
                food_category=cat,
                quantity=qty,
                unit=unit,
                purchase_date=p_date,
                expiry_date=e_date,
                storage_type=storage,
                purchase_price=p_price,
                selling_price=s_price,
                supplier_name=supp
            )
            db.add(inv)
            inv_objs.append(inv)

        db.flush()

        # 3. Historical Sales Records for AI Forecasting (60 days of daily sales)
        categories_for_forecast = ["Produce", "Dairy", "Bakery", "Meat", "Prepared Meals", "Canned/Dry"]
        for day_offset in range(60, 0, -1):
            s_date = now - timedelta(days=day_offset)
            dow = s_date.weekday()
            # Weekend bump
            multiplier = 1.35 if dow in [4, 5, 6] else 1.0

            for cat in categories_for_forecast:
                base_qty = {
                    "Produce": 22.0,
                    "Dairy": 18.0,
                    "Bakery": 25.0,
                    "Meat": 12.0,
                    "Prepared Meals": 15.0,
                    "Canned/Dry": 10.0
                }.get(cat, 15.0)

                qty = round(base_qty * multiplier * random.uniform(0.85, 1.25), 1)
                revenue = round(qty * random.uniform(3.5, 6.0), 2)

                s_rec = SalesRecord(
                    business_id=b1_profile.id,
                    item_name=f"{cat} Daily Aggregate",
                    category=cat,
                    quantity=qty,
                    unit="kg" if cat in ["Produce", "Meat"] else "items",
                    sale_date=s_date,
                    total_revenue=revenue
                )
                db.add(s_rec)

        # 4. Historical Waste Records
        for week_offset in range(8, 0, -1):
            w_date = now - timedelta(days=week_offset * 7)
            db.add(WasteRecord(
                business_id=b1_profile.id,
                item_name="Unsold Leafy Greens",
                category="Produce",
                quantity=random.uniform(5.0, 12.0),
                unit="kg",
                waste_date=w_date,
                reason="Expired / Wilting",
                financial_loss=round(random.uniform(15.0, 35.0), 2)
            ))
            db.add(WasteRecord(
                business_id=b1_profile.id,
                item_name="Unsold Pastries",
                category="Bakery",
                quantity=random.uniform(8.0, 16.0),
                unit="items",
                waste_date=w_date + timedelta(days=2),
                reason="Stale",
                financial_loss=round(random.uniform(12.0, 28.0), 2)
            ))

        # 5. Surplus Marketplace Listings
        # Listing 1: Available Produce Surplus
        l1 = SurplusListing(
            donor_business_id=b1_profile.id,
            inventory_item_id=inv_objs[0].id,
            food_name="Fresh Organic Spinach & Salad Greens (Surplus Batch)",
            food_category="Produce",
            available_quantity=20.0,
            unit="kg",
            expiry_date=now + timedelta(days=1, hours=6),
            pickup_location="FreshMart Back Loading Bay, 742 Evergreen Terrace",
            available_from=now - timedelta(hours=2),
            available_until=now + timedelta(days=1),
            storage_requirements="Refrigerated",
            description="Crisp organic greens needing redistribution today. Ideal for family food boxes.",
            status=ListingStatus.AVAILABLE
        )
        db.add(l1)

        # Listing 2: Available Bakery Surplus from Golden Wheat
        l2 = SurplusListing(
            donor_business_id=b2_profile.id,
            inventory_item_id=None,
            food_name="Artisan Sourdough Loaves & Dinner Rolls",
            food_category="Bakery",
            available_quantity=35.0,
            unit="items",
            expiry_date=now + timedelta(days=2),
            pickup_location="Golden Wheat Bakery Kitchen, 108 Mission Blvd",
            available_from=now,
            available_until=now + timedelta(days=2),
            storage_requirements="Room Temp",
            description="Daily freshly baked organic sourdough loaves and baguettes. Baked this morning.",
            status=ListingStatus.AVAILABLE
        )
        db.add(l2)

        # Listing 3: Scheduled Donation
        l3 = SurplusListing(
            donor_business_id=b1_profile.id,
            inventory_item_id=inv_objs[1].id,
            food_name="Grade-A Whole Pasteurized Milk (Cold Chilled)",
            food_category="Dairy",
            available_quantity=25.0,
            unit="liters",
            expiry_date=now + timedelta(days=1),
            pickup_location="FreshMart Cold Storage Dock, 742 Evergreen Terrace",
            available_from=now - timedelta(days=1),
            available_until=now + timedelta(days=1),
            storage_requirements="Refrigerated",
            description="High quality refrigerated milk, perfect for shelter breakfast service.",
            status=ListingStatus.SCHEDULED
        )
        db.add(l3)

        # Listing 4: Completed Donation (for verified sustainability analytics demonstration)
        l4 = SurplusListing(
            donor_business_id=b1_profile.id,
            inventory_item_id=None,
            food_name="Assorted Seasonal Apples, Oranges & Pears",
            food_category="Produce",
            available_quantity=60.0,
            unit="kg",
            expiry_date=now - timedelta(days=3),
            pickup_location="FreshMart Loading Dock, 742 Evergreen Terrace",
            available_from=now - timedelta(days=5),
            available_until=now - timedelta(days=3),
            storage_requirements="Room Temp",
            description="Delicious mixed fruits distributed to local shelters.",
            status=ListingStatus.COMPLETED
        )
        db.add(l4)

        db.flush()

        # 6. Donation Requests & Pickup Schedules
        # Request for l3 (Scheduled)
        req_scheduled = DonationRequest(
            listing_id=l3.id,
            ngo_id=ngo1_profile.id,
            requested_quantity=25.0,
            notes="We will distribute this to 50 families tomorrow morning during our pantry hours.",
            status=RequestStatus.APPROVED
        )
        db.add(req_scheduled)
        db.flush()

        p_sched = PickupSchedule(
            request_id=req_scheduled.id,
            scheduled_time=now + timedelta(hours=14),
            pickup_contact_name="Elena Rostova",
            pickup_contact_phone="+1-555-0130",
            vehicle_info="Refrigerated Van (Plate: 7XYZ89)",
            status=PickupStatus.SCHEDULED,
            notes="Dock entry code is #4042."
        )
        db.add(p_sched)

        # Request for l4 (Completed donation)
        req_completed = DonationRequest(
            listing_id=l4.id,
            ngo_id=ngo2_profile.id,
            requested_quantity=60.0,
            notes="Served hot fruit desserts and fresh snacks for 120 homeless community members.",
            status=RequestStatus.COMPLETED
        )
        db.add(req_completed)
        db.flush()

        p_completed = PickupSchedule(
            request_id=req_completed.id,
            scheduled_time=now - timedelta(days=4),
            pickup_contact_name="Marcus Vance",
            pickup_contact_phone="+1-555-0140",
            vehicle_info="Transit Cargo Van",
            status=PickupStatus.COMPLETED,
            notes="Pickup executed on schedule.",
            completed_at=now - timedelta(days=4)
        )
        db.add(p_completed)

        # 7. In-App Notifications
        db.add(Notification(
            user_id=b1_user.id,
            title="Expiry Alert: Critical Window",
            message="28 kg of 'Organic Spinach & Salad Greens' expires in under 24 hours. Consider creating a surplus listing.",
            type="expiry_alert",
            is_read=False,
            related_entity_type="inventory",
            related_entity_id=inv_objs[0].id
        ))

        db.add(Notification(
            user_id=ngo1_user.id,
            title="New Surplus Available Near You",
            message="FreshMart listed 20 kg of Organic Produce within 1.2 km of your facility.",
            type="donation_request",
            is_read=False,
            related_entity_type="listing",
            related_entity_id=l1.id
        ))

        db.commit()
        print("Database successfully seeded with realistic sample records!")

    except Exception as e:
        db.rollback()
        print(f"Error during database seed: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
