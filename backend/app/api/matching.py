from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Any

from app.database import get_db
from app.models.models import User, SurplusListing
from app.schemas.schemas import MatchingRecommendationResponse
from app.api.deps import get_current_user
from app.services.matching_service import get_donation_matches_for_listing

router = APIRouter(prefix="/matching", tags=["AI Donation Matching Engine"])

@router.get("/recommendations", response_model=MatchingRecommendationResponse)
def get_recommendations(
    listing_id: int = Query(..., description="ID of surplus listing to match"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    result = get_donation_matches_for_listing(db=db, listing_id=listing_id)
    if "error" in result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result["error"])
    return result
