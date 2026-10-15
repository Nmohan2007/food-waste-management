from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Any, Dict
from pydantic import BaseModel

from app.database import get_db
from app.models.models import InventoryItem, SalesRecord, WasteRecord, BusinessProfile, User
from app.schemas.schemas import WasteRiskInput, WasteRiskScoreOut, DemandForecastOut, ReorderRecommendation
from app.api.deps import get_current_user, get_current_business
from app.ml.waste_risk_engine import calculate_waste_risk_score
from app.ml.demand_forecasting import train_and_forecast_demand
from app.services.inventory_service import classify_expiry, enrich_inventory_item

router = APIRouter(prefix="/ai", tags=["AI & Analytics Engines"])

class ForecastRequestBody(BaseModel):
    category: str
    forecast_days: int = 14
    lead_time_days: int = 2

@router.post("/waste-risk", response_model=WasteRiskScoreOut)
def get_waste_risk(
    input_data: WasteRiskInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    # If inventory item ID provided, retrieve actual record
    if input_data.inventory_item_id:
        item = db.query(InventoryItem).filter(InventoryItem.id == input_data.inventory_item_id).first()
        if item:
            days, _ = classify_expiry(item.expiry_date)
            # Find average daily sales in this category for this business
            sales = db.query(SalesRecord).filter(
                SalesRecord.business_id == item.business_id,
                SalesRecord.category == item.food_category
            ).all()
            avg_sales = float(sum(s.quantity for s in sales) / max(1, len(sales))) if sales else input_data.average_daily_sales
            
            # Waste ratio
            waste = db.query(WasteRecord).filter(
                WasteRecord.business_id == item.business_id,
                WasteRecord.category == item.food_category
            ).all()
            total_waste = sum(w.quantity for w in waste)
            total_purchased = total_waste + sum(s.quantity for s in sales)
            waste_ratio = float(total_waste / max(1.0, total_purchased)) if total_purchased > 0 else 0.15

            return calculate_waste_risk_score(
                food_category=item.food_category,
                current_stock=item.quantity,
                days_until_expiry=days,
                average_daily_sales=avg_sales,
                historical_waste_ratio=waste_ratio,
                perishability="High" if item.food_category in ["Produce", "Dairy", "Meat"] else "Medium"
            )

    return calculate_waste_risk_score(
        food_category=input_data.food_category,
        current_stock=input_data.current_stock,
        days_until_expiry=input_data.days_until_expiry,
        average_daily_sales=input_data.average_daily_sales,
        historical_waste_ratio=input_data.historical_waste_ratio,
        perishability=input_data.perishability
    )

@router.post("/demand-forecast", response_model=DemandForecastOut)
def run_demand_forecast(
    body: ForecastRequestBody,
    db: Session = Depends(get_db),
    business: BusinessProfile = Depends(get_current_business)
) -> Any:
    # Retrieve historical sales records for this business & category
    sales = db.query(SalesRecord).filter(
        SalesRecord.business_id == business.id,
        SalesRecord.category.ilike(f"%{body.category}%")
    ).all()

    sales_data = [
        {"sale_date": s.sale_date, "quantity": s.quantity}
        for s in sales
    ]

    # Get current stock in this category
    items = db.query(InventoryItem).filter(
        InventoryItem.business_id == business.id,
        InventoryItem.food_category.ilike(f"%{body.category}%")
    ).all()
    current_stock = sum(i.quantity for i in items)

    # Average days until expiry for current stock
    min_days = 7
    if items:
        days_list = [classify_expiry(i.expiry_date)[0] for i in items]
        min_days = min([d for d in days_list if d > 0] or [7])

    return train_and_forecast_demand(
        sales_data=sales_data,
        category=body.category,
        current_stock=current_stock,
        days_until_expiry=min_days,
        forecast_days=body.forecast_days,
        lead_time_days=body.lead_time_days
    )

@router.get("/high-risk-items", response_model=List[Dict[str, Any]])
def get_high_risk_items(
    db: Session = Depends(get_db),
    business: BusinessProfile = Depends(get_current_business)
) -> Any:
    items = db.query(InventoryItem).filter(InventoryItem.business_id == business.id).all()
    enriched = [enrich_inventory_item(i) for i in items]
    # Filter for high or critical risk items
    high_risk = [i for i in enriched if i["waste_risk_category"] in ["High Risk", "Critical Risk"] or i["expiry_status"] in ["Critical", "High Risk", "Expired"]]
    high_risk.sort(key=lambda x: x["waste_risk_score"], reverse=True)
    return high_risk

@router.get("/reorder-recommendations", response_model=List[ReorderRecommendation])
def get_reorder_recommendations(
    db: Session = Depends(get_db),
    business: BusinessProfile = Depends(get_current_business)
) -> Any:
    items = db.query(InventoryItem).filter(InventoryItem.business_id == business.id).all()
    recommendations = []

    for item in items:
        days, expiry_status = classify_expiry(item.expiry_date)
        
        # Query sales for this category
        sales = db.query(SalesRecord).filter(
            SalesRecord.business_id == business.id,
            SalesRecord.category == item.food_category
        ).all()
        avg_daily = float(sum(s.quantity for s in sales) / max(1, len(sales))) if sales else 6.0

        lead_time = 2
        review_period = 5
        safety_stock = 1.65 * (lead_time ** 0.5) * 2.0
        target_inv = (avg_daily * (lead_time + review_period)) + safety_stock
        reorder_qty = round(max(0.0, target_inv - item.quantity), 1)

        urgency = "Normal"
        reason = "Inventory is within safe operating parameters."

        if days <= 2 and item.quantity > avg_daily * 2:
            urgency = "Do Not Reorder / Surplus Alert"
            reason = f"Existing stock ({item.quantity} {item.unit}) expires in {days} days. Order freeze advised."
            reorder_qty = 0.0
        elif item.quantity < (avg_daily * lead_time):
            urgency = "Urgent Reorder"
            reason = f"Current inventory ({item.quantity} {item.unit}) below lead-time consumption ({avg_daily * lead_time:.1f} {item.unit})."
        elif item.quantity < target_inv:
            urgency = "Moderate"
            reason = f"Stock level below target threshold ({target_inv:.1f} {item.unit})."

        recommendations.append({
            "inventory_item_id": item.id,
            "food_name": item.food_name,
            "food_category": item.food_category,
            "current_stock": item.quantity,
            "unit": item.unit,
            "days_until_expiry": days,
            "predicted_daily_demand": round(avg_daily, 1),
            "recommended_reorder": reorder_qty,
            "urgency": urgency,
            "reason": reason
        })

    return recommendations
