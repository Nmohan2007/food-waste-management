from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.models import User, UserRole, BusinessProfile, NGOProfile
from app.schemas.schemas import UserCreate, UserLogin, UserOut, Token
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)) -> Any:
    # Check if user already exists
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    # Create User
    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=user_in.role,
        phone=user_in.phone
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create associated profile based on role
    if user_in.role == UserRole.BUSINESS:
        business_profile = BusinessProfile(
            user_id=new_user.id,
            business_name=user_in.organization_name or user_in.full_name,
            business_type=user_in.organization_type or "Supermarket",
            address=user_in.address or "123 Market Street",
            city=user_in.city or "San Francisco",
            state=user_in.state or "CA",
            zip_code=user_in.zip_code or "94105",
            latitude=user_in.latitude or 37.7749,
            longitude=user_in.longitude or -122.4194,
            contact_person=user_in.full_name,
            contact_phone=user_in.phone or "555-0199"
        )
        db.add(business_profile)
        db.commit()

    elif user_in.role == UserRole.NGO:
        ngo_profile = NGOProfile(
            user_id=new_user.id,
            organization_name=user_in.organization_name or f"{user_in.full_name} Charity",
            organization_type=user_in.organization_type or "Food Bank",
            address=user_in.address or "456 Hope Blvd",
            city=user_in.city or "San Francisco",
            state=user_in.state or "CA",
            zip_code=user_in.zip_code or "94103",
            latitude=user_in.latitude or 37.7790,
            longitude=user_in.longitude or -122.4120,
            contact_person=user_in.full_name,
            contact_phone=user_in.phone or "555-0144",
            beneficiary_count=user_in.beneficiary_count or 60,
            accepted_categories=user_in.accepted_categories or "Produce,Dairy,Bakery,Meat,Prepared Meals,Canned/Dry",
            storage_capabilities=user_in.storage_capabilities or "Refrigerated,Freezer,Dry Storage"
        )
        db.add(ngo_profile)
        db.commit()

    db.refresh(new_user)
    access_token = create_access_token({"sub": new_user.email, "role": new_user.role.value, "user_id": new_user.id})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=Token)
def login(login_in: UserLogin, db: Session = Depends(get_db)) -> Any:
    user = db.query(User).filter(User.email == login_in.email).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is deactivated.")

    access_token = create_access_token({"sub": user.email, "role": user.role.value, "user_id": user.id})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def read_current_user(current_user: User = Depends(get_current_user)) -> Any:
    return current_user
