from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import decode_access_token
from app.models.models import User, UserRole, BusinessProfile, NGOProfile

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    email: str = payload.get("sub")
    if email is None:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user account.")

    return user

def require_roles(allowed_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: User role '{current_user.role.value}' does not have sufficient permissions for this operation."
            )
        return current_user
    return role_checker

def get_current_business(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.BUSINESS, UserRole.ADMIN]))
) -> BusinessProfile:
    # If admin is acting, retrieve first business or admin's business profile
    profile = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
    if not profile and current_user.role == UserRole.ADMIN:
        profile = db.query(BusinessProfile).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business profile not found for this user account. Please complete your business registration."
        )
    return profile

def get_current_ngo(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.NGO, UserRole.ADMIN]))
) -> NGOProfile:
    profile = db.query(NGOProfile).filter(NGOProfile.user_id == current_user.id).first()
    if not profile and current_user.role == UserRole.ADMIN:
        profile = db.query(NGOProfile).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="NGO profile not found for this user account. Please complete your NGO registration."
        )
    return profile
