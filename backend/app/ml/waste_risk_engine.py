from typing import Dict, Any, Tuple
from app.core.config import settings

def calculate_waste_risk_score(
    food_category: str,
    current_stock: float,
    days_until_expiry: int,
    average_daily_sales: float = 5.0,
    historical_waste_ratio: float = 0.15,
    perishability: str = "Medium"
) -> Dict[str, Any]:
    """
    Calculates a transparent, rule-based baseline waste-risk score (0 to 100).
    Note: This is a documented rule-based baseline heuristic, not an opaque black-box neural net.
    """
    # 1. Expiry Risk calculation
    if days_until_expiry <= 0:
        expiry_risk = 100.0
    elif days_until_expiry <= settings.CRITICAL_RISK_DAYS:
        expiry_risk = 90.0
    elif days_until_expiry <= settings.HIGH_RISK_DAYS:
        expiry_risk = 70.0
    elif days_until_expiry <= settings.MEDIUM_RISK_DAYS:
        expiry_risk = 40.0
    else:
        expiry_risk = 10.0

    # 2. Stock Risk calculation (Current stock vs anticipated demand before expiry)
    effective_days = max(0.5, float(days_until_expiry)) if days_until_expiry > 0 else 0.5
    safe_daily_sales = max(0.1, average_daily_sales)
    expected_sales_before_expiry = safe_daily_sales * effective_days

    if expected_sales_before_expiry <= 0:
        stock_risk = 100.0
    else:
        stock_ratio = current_stock / expected_sales_before_expiry
        if stock_ratio <= 1.0:
            # All or most stock expected to sell before expiry
            stock_risk = min(30.0, stock_ratio * 25.0)
        elif stock_ratio <= 1.5:
            stock_risk = 30.0 + (stock_ratio - 1.0) * 40.0
        elif stock_ratio <= 2.5:
            stock_risk = 50.0 + (stock_ratio - 1.5) * 30.0
        else:
            stock_risk = min(100.0, 80.0 + (stock_ratio - 2.5) * 10.0)

    # 3. Waste History Risk calculation
    # historical_waste_ratio: e.g., 0.15 means 15% historically wasted
    safe_waste_ratio = max(0.0, min(1.0, historical_waste_ratio))
    waste_history_risk = min(100.0, safe_waste_ratio * 250.0)

    # 4. Composite weighted final risk
    w_expiry = settings.RISK_EXPIRY_WEIGHT
    w_stock = settings.RISK_STOCK_WEIGHT
    w_waste = settings.RISK_WASTE_WEIGHT

    raw_score = (w_expiry * expiry_risk) + (w_stock * stock_risk) + (w_waste * waste_history_risk)

    # Perishability adjustment
    perishability_lower = perishability.lower()
    if perishability_lower in ["high", "very high", "seafood", "meat", "dairy"]:
        raw_score += 5.0
    elif perishability_lower in ["low", "canned", "dry", "beverages"]:
        raw_score -= 5.0

    final_score = round(max(0.0, min(100.0, raw_score)), 1)

    # Risk category classification
    if final_score >= 80.0:
        category = "Critical Risk"
    elif final_score >= 60.0:
        category = "High Risk"
    elif final_score >= 30.0:
        category = "Medium Risk"
    else:
        category = "Low Risk"

    # Explanation and recommendation generator
    explanation_parts = []
    if days_until_expiry <= 0:
        explanation_parts.append("Item is already past its expiration date.")
    elif days_until_expiry <= 1:
        explanation_parts.append(f"Expires in {days_until_expiry} day (critical expiry window).")
    elif days_until_expiry <= 3:
        explanation_parts.append(f"Approaching expiry in {days_until_expiry} days.")
    else:
        explanation_parts.append(f"Safe shelf-life remaining ({days_until_expiry} days).")

    if stock_risk >= 60.0:
        explanation_parts.append(f"Current stock ({current_stock}) substantially exceeds projected consumption ({expected_sales_before_expiry:.1f}).")
    elif stock_risk >= 35.0:
        explanation_parts.append(f"Stock moderately exceeds demand rate.")
    else:
        explanation_parts.append("Inventory level is balanced against expected demand.")

    if waste_history_risk >= 50.0:
        explanation_parts.append(f"Historical category waste rate ({historical_waste_ratio * 100:.0f}%) is elevated.")

    explanation = " ".join(explanation_parts)

    if final_score >= 80.0:
        recommendation = "List immediately on Surplus Marketplace for emergency NGO donation or immediate clearance."
    elif final_score >= 60.0:
        recommendation = "Create a surplus listing or bundle with promotional discounts to expedite turnover."
    elif final_score >= 30.0:
        recommendation = "Monitor inventory daily; hold surplus listing in draft if sales do not accelerate."
    else:
        recommendation = "Optimal stock status. Normal rotation and standard sales workflow recommended."

    return {
        "risk_score": final_score,
        "risk_category": category,
        "expiry_risk": round(expiry_risk, 1),
        "stock_risk": round(stock_risk, 1),
        "waste_history_risk": round(waste_history_risk, 1),
        "explanation": explanation,
        "recommendation": recommendation
    }
