from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional, Any

from app.database import get_db
from app.models.models import User, UserRole, BusinessProfile
from app.schemas.schemas import InventoryCreate, InventoryUpdate, InventoryOut
from app.api.deps import get_current_user, require_roles, get_current_business
from app.services.inventory_service import (
    get_inventory_items,
    get_inventory_item,
    create_inventory_item,
    update_inventory_item,
    delete_inventory_item,
    export_inventory_csv,
    import_inventory_csv,
    enrich_inventory_item
)

router = APIRouter(prefix="/inventory", tags=["Inventory Management"])

@router.get("", response_model=List[InventoryOut])
def list_inventory(
    category: Optional[str] = Query(None, description="Filter by food category"),
    expiry_status: Optional[str] = Query(None, description="Filter by status: Expired, Critical, High Risk, Medium Risk, Safe"),
    search: Optional[str] = Query(None, description="Search by food name"),
    sort_by: str = Query("expiry_date", description="Field to sort by"),
    order: str = Query("asc", description="asc or desc"),
    business_id: Optional[int] = Query(None, description="Filter by business (admin only)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # Role-based restriction: Businesses can ONLY view their own inventory
    target_business_id = None
    if current_user.role == UserRole.BUSINESS:
        business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
        if not business:
            return []
        target_business_id = business.id
    elif current_user.role == UserRole.ADMIN:
        target_business_id = business_id
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="NGO accounts cannot directly access business inventory records. Please browse the Surplus Marketplace."
        )

    return get_inventory_items(
        db=db,
        business_id=target_business_id,
        category=category,
        expiry_status=expiry_status,
        search=search,
        sort_by=sort_by,
        order=order
    )

@router.post("", response_model=InventoryOut, status_code=status.HTTP_201_CREATED)
def add_inventory_item(
    item_in: InventoryCreate,
    db: Session = Depends(get_db),
    business: BusinessProfile = Depends(get_current_business)
) -> Any:
    return create_inventory_item(db=db, item_in=item_in, business_id=business.id)

@router.get("/export")
def export_csv(
    db: Session = Depends(get_db),
    business: BusinessProfile = Depends(get_current_business)
) -> Any:
    csv_data = export_inventory_csv(db, business_id=business.id)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=inventory_export_{business.id}.csv"}
    )

@router.post("/import")
async def import_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    business: BusinessProfile = Depends(get_current_business)
) -> Any:
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV files are accepted.")

    content = await file.read()
    csv_str = content.decode("utf-8", errors="replace")
    result = import_inventory_csv(db=db, business_id=business.id, csv_content=csv_str)
    return result

@router.get("/{item_id}", response_model=InventoryOut)
def read_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    biz_id = None
    if current_user.role == UserRole.BUSINESS:
        business = db.query(BusinessProfile).filter(BusinessProfile.user_id == current_user.id).first()
        if not business:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business profile not found.")
        biz_id = business.id
    elif current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    item = get_inventory_item(db=db, item_id=item_id, business_id=biz_id)
    return enrich_inventory_item(item)

@router.put("/{item_id}", response_model=InventoryOut)
def modify_inventory_item(
    item_id: int,
    item_in: InventoryUpdate,
    db: Session = Depends(get_db),
    business: BusinessProfile = Depends(get_current_business)
) -> Any:
    # Business can only modify its own item
    return update_inventory_item(db=db, item_id=item_id, item_in=item_in, business_id=business.id)

@router.delete("/{item_id}")
def remove_inventory_item(
    item_id: int,
    db: Session = Depends(get_db),
    business: BusinessProfile = Depends(get_current_business)
) -> Any:
    delete_inventory_item(db=db, item_id=item_id, business_id=business.id)
    return {"message": "Inventory item deleted successfully."}
