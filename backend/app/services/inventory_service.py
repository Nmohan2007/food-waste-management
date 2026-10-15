import csv
import io
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from fastapi import HTTPException, status

from app.models.models import InventoryItem, BusinessProfile
from app.schemas.schemas import InventoryCreate, InventoryUpdate
from app.ml.waste_risk_engine import calculate_waste_risk_score
from app.core.config import settings

def classify_expiry(expiry_date: datetime) -> Tuple[int, str]:
    now = datetime.now(timezone.utc)
    if expiry_date.tzinfo is None:
        expiry_date = expiry_date.replace(tzinfo=timezone.utc)
    
    delta = expiry_date.date() - now.date()
    days = delta.days

    if days <= 0:
        return days, "Expired"
    elif days <= settings.CRITICAL_RISK_DAYS:
        return days, "Critical"
    elif days <= settings.HIGH_RISK_DAYS:
        return days, "High Risk"
    elif days <= settings.MEDIUM_RISK_DAYS:
        return days, "Medium Risk"
    else:
        return days, "Safe"

def enrich_inventory_item(item: InventoryItem) -> Dict[str, Any]:
    days, status_name = classify_expiry(item.expiry_date)
    risk_info = calculate_waste_risk_score(
        food_category=item.food_category,
        current_stock=item.quantity,
        days_until_expiry=days,
        average_daily_sales=5.0,
        historical_waste_ratio=0.15,
        perishability="High" if item.food_category in ["Dairy", "Produce", "Meat"] else "Medium"
    )
    return {
        "id": item.id,
        "business_id": item.business_id,
        "food_name": item.food_name,
        "food_category": item.food_category,
        "quantity": item.quantity,
        "unit": item.unit,
        "purchase_date": item.purchase_date,
        "expiry_date": item.expiry_date,
        "storage_type": item.storage_type,
        "purchase_price": item.purchase_price,
        "selling_price": item.selling_price,
        "supplier_name": item.supplier_name,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
        "days_until_expiry": days,
        "expiry_status": status_name,
        "waste_risk_score": risk_info["risk_score"],
        "waste_risk_category": risk_info["risk_category"]
    }

def get_inventory_items(
    db: Session,
    business_id: Optional[int] = None,
    category: Optional[str] = None,
    expiry_status: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = "expiry_date",
    order: str = "asc"
) -> List[Dict[str, Any]]:
    query = db.query(InventoryItem)

    if business_id is not None:
        query = query.filter(InventoryItem.business_id == business_id)

    if category:
        query = query.filter(InventoryItem.food_category.ilike(f"%{category}%"))

    if search:
        query = query.filter(InventoryItem.food_name.ilike(f"%{search}%"))

    # Sorting
    sort_column = getattr(InventoryItem, sort_by, InventoryItem.expiry_date)
    if order == "desc":
        query = query.order_by(desc(sort_column))
    else:
        query = query.order_by(asc(sort_column))

    items = query.all()
    enriched = [enrich_inventory_item(item) for item in items]

    if expiry_status:
        enriched = [i for i in enriched if i["expiry_status"].lower() == expiry_status.lower()]

    return enriched

def get_inventory_item(db: Session, item_id: int, business_id: Optional[int] = None) -> InventoryItem:
    query = db.query(InventoryItem).filter(InventoryItem.id == item_id)
    if business_id is not None:
        query = query.filter(InventoryItem.business_id == business_id)
    item = query.first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found or you do not have permission to view it."
        )
    return item

def create_inventory_item(db: Session, item_in: InventoryCreate, business_id: int) -> Dict[str, Any]:
    # Validate expiry date vs purchase date
    if item_in.expiry_date < item_in.purchase_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiry date cannot be prior to purchase date."
        )

    db_item = InventoryItem(
        business_id=business_id,
        food_name=item_in.food_name,
        food_category=item_in.food_category,
        quantity=item_in.quantity,
        unit=item_in.unit,
        purchase_date=item_in.purchase_date,
        expiry_date=item_in.expiry_date,
        storage_type=item_in.storage_type,
        purchase_price=item_in.purchase_price,
        selling_price=item_in.selling_price,
        supplier_name=item_in.supplier_name
    )
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return enrich_inventory_item(db_item)

def update_inventory_item(db: Session, item_id: int, item_in: InventoryUpdate, business_id: int) -> Dict[str, Any]:
    db_item = get_inventory_item(db, item_id, business_id)

    update_data = item_in.model_dump(exclude_unset=True)
    
    # Check date consistency if dates are updated
    new_purchase = update_data.get("purchase_date", db_item.purchase_date)
    new_expiry = update_data.get("expiry_date", db_item.expiry_date)
    if new_expiry < new_purchase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiry date cannot be prior to purchase date."
        )

    for field, value in update_data.items():
        setattr(db_item, field, value)

    db.commit()
    db.refresh(db_item)
    return enrich_inventory_item(db_item)

def delete_inventory_item(db: Session, item_id: int, business_id: int) -> bool:
    db_item = get_inventory_item(db, item_id, business_id)
    db.delete(db_item)
    db.commit()
    return True

def reduce_stock(db: Session, item_id: int, amount: float) -> InventoryItem:
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).with_for_update().first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found.")
    if item.quantity < amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient inventory quantity. Available: {item.quantity}, requested: {amount}."
        )
    item.quantity -= amount
    db.commit()
    db.refresh(item)
    return item

def export_inventory_csv(db: Session, business_id: int) -> str:
    items = get_inventory_items(db, business_id=business_id)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ID", "Food Name", "Category", "Quantity", "Unit", "Purchase Date",
        "Expiry Date", "Days Remaining", "Expiry Status", "Storage Type",
        "Purchase Price", "Selling Price", "Supplier", "Waste Risk Score", "Waste Risk Category"
    ])
    for it in items:
        writer.writerow([
            it["id"], it["food_name"], it["food_category"], it["quantity"], it["unit"],
            it["purchase_date"].strftime("%Y-%m-%d"), it["expiry_date"].strftime("%Y-%m-%d"),
            it["days_until_expiry"], it["expiry_status"], it["storage_type"],
            it["purchase_price"], it["selling_price"] or "", it["supplier_name"] or "",
            it["waste_risk_score"], it["waste_risk_category"]
        ])
    return output.getvalue()

def import_inventory_csv(db: Session, business_id: int, csv_content: str) -> Dict[str, Any]:
    f = io.StringIO(csv_content)
    reader = csv.DictReader(f)
    imported = 0
    errors = []

    for row_num, row in enumerate(reader, start=1):
        try:
            food_name = row.get("Food Name") or row.get("food_name")
            category = row.get("Category") or row.get("food_category") or "General"
            qty = float(row.get("Quantity") or row.get("quantity") or 0)
            unit = row.get("Unit") or row.get("unit") or "kg"
            p_date_str = row.get("Purchase Date") or row.get("purchase_date")
            e_date_str = row.get("Expiry Date") or row.get("expiry_date")
            storage = row.get("Storage Type") or row.get("storage_type") or "Room Temp"
            p_price = float(row.get("Purchase Price") or row.get("purchase_price") or 0.0)
            s_price_str = row.get("Selling Price") or row.get("selling_price")
            s_price = float(s_price_str) if s_price_str else None
            supplier = row.get("Supplier") or row.get("supplier_name")

            if not food_name or qty <= 0 or not e_date_str:
                errors.append(f"Row {row_num}: Invalid item name, quantity, or expiry date.")
                continue

            purchase_date = datetime.strptime(p_date_str, "%Y-%m-%d") if p_date_str else datetime.now(timezone.utc)
            expiry_date = datetime.strptime(e_date_str, "%Y-%m-%d")

            item = InventoryItem(
                business_id=business_id,
                food_name=food_name,
                food_category=category,
                quantity=qty,
                unit=unit,
                purchase_date=purchase_date,
                expiry_date=expiry_date,
                storage_type=storage,
                purchase_price=p_price,
                selling_price=s_price,
                supplier_name=supplier
            )
            db.add(item)
            imported += 1
        except Exception as e:
            errors.append(f"Row {row_num}: {str(e)}")

    db.commit()
    return {"imported_count": imported, "errors": errors}
