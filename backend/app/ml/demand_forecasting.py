import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

def train_and_forecast_demand(
    sales_data: List[Dict[str, Any]],
    category: str,
    current_stock: float = 0.0,
    days_until_expiry: int = 7,
    forecast_days: int = 14,
    lead_time_days: int = 2
) -> Dict[str, Any]:
    """
    Cleans historical daily sales data, evaluates model on a test split,
    generates daily and weekly demand forecasts with confidence intervals,
    identifies potential surplus, and computes recommended reorder quantities.
    """
    if not sales_data or len(sales_data) < 7:
        # Fallback for insufficient data
        avg_demand = 5.0
        if sales_data:
            df_temp = pd.DataFrame(sales_data)
            if "quantity" in df_temp.columns and len(df_temp) > 0:
                avg_demand = max(1.0, float(df_temp["quantity"].mean()))

        daily_forecast = []
        start_date = datetime.now()
        for i in range(1, forecast_days + 1):
            f_date = (start_date + timedelta(days=i)).strftime("%Y-%m-%d")
            daily_forecast.append({
                "date": f_date,
                "predicted_demand": round(avg_demand, 2),
                "lower_bound": round(max(0.0, avg_demand * 0.7), 2),
                "upper_bound": round(avg_demand * 1.3, 2),
            })

        weekly_forecast = []
        for w in range(1, 5):
            w_date = (start_date + timedelta(weeks=w)).strftime("%Y-%m-%d")
            weekly_demand = avg_demand * 7
            weekly_forecast.append({
                "date": f_date,
                "predicted_demand": round(weekly_demand, 2),
                "lower_bound": round(weekly_demand * 0.7, 2),
                "upper_bound": round(weekly_demand * 1.3, 2),
            })

        demand_before_expiry = avg_demand * max(1, days_until_expiry)
        projected_surplus = max(0.0, current_stock - demand_before_expiry)
        reorder_point = avg_demand * lead_time_days
        reorder_qty = max(0.0, (avg_demand * (lead_time_days + 3)) - current_stock)

        return {
            "category": category,
            "historical_days_evaluated": len(sales_data),
            "model_used": "Baseline Moving Average (Insufficient Historical Data for ML)",
            "test_metrics": {"mae": 0.0, "rmse": 0.0, "mape": 0.0},
            "daily_forecast": daily_forecast,
            "weekly_forecast": weekly_forecast,
            "current_stock": round(current_stock, 2),
            "projected_surplus_quantity": round(projected_surplus, 2),
            "recommended_reorder_quantity": round(reorder_qty, 2),
            "insight": f"Limited historical records ({len(sales_data)} data points). Baseline estimation used. Minimum 14 daily observations recommended for machine-learning feature extraction."
        }

    # 1. Convert to DataFrame and clean
    df = pd.DataFrame(sales_data)
    df["sale_date"] = pd.to_datetime(df["sale_date"])
    
    # Aggregate by day
    daily_df = df.groupby(df["sale_date"].dt.date)["quantity"].sum().reset_index()
    daily_df.rename(columns={"sale_date": "ds", "quantity": "y"}, inplace=True)
    daily_df["ds"] = pd.to_datetime(daily_df["ds"])
    daily_df = daily_df.sort_values("ds").reset_index(drop=True)

    # Re-index to ensure continuous daily sequence (fill missing dates with 0)
    full_idx = pd.date_range(start=daily_df["ds"].min(), end=daily_df["ds"].max(), freq="D")
    daily_df = daily_df.set_index("ds").reindex(full_idx, fill_value=0.0).rename_axis("ds").reset_index()

    n_samples = len(daily_df)
    if n_samples < 10:
        mean_y = float(daily_df["y"].mean())
        return {
            "category": category,
            "historical_days_evaluated": n_samples,
            "model_used": "Rolling Mean Baseline",
            "test_metrics": {"mae": 0.0, "rmse": 0.0, "mape": 0.0},
            "daily_forecast": [],
            "weekly_forecast": [],
            "current_stock": current_stock,
            "projected_surplus_quantity": max(0.0, current_stock - (mean_y * max(1, days_until_expiry))),
            "recommended_reorder_quantity": max(0.0, (mean_y * (lead_time_days + 4)) - current_stock),
            "insight": "Historical sample span is under 10 days. Simple statistical baseline applied."
        }

    # 2. Feature Engineering for Time Series
    daily_df["day_of_week"] = daily_df["ds"].dt.dayofweek
    daily_df["is_weekend"] = daily_df["day_of_week"].isin([5, 6]).astype(int)
    daily_df["day_sin"] = np.sin(2 * np.pi * daily_df["day_of_week"] / 7)
    daily_df["day_cos"] = np.cos(2 * np.pi * daily_df["day_of_week"] / 7)
    daily_df["lag_1"] = daily_df["y"].shift(1).bfill()
    daily_df["lag_7"] = daily_df["y"].shift(7).bfill()
    daily_df["rolling_mean_7"] = daily_df["y"].shift(1).rolling(7, min_periods=1).mean().bfill()

    feature_cols = ["day_of_week", "is_weekend", "day_sin", "day_cos", "lag_1", "lag_7", "rolling_mean_7"]
    X = daily_df[feature_cols].values
    y = daily_df["y"].values

    # Train / Test split (80% train, 20% test)
    split_idx = max(int(len(daily_df) * 0.8), len(daily_df) - 7)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    model = Ridge(alpha=1.0)
    model.fit(X_train, y_train)

    # Evaluate on test set
    y_pred_test = np.clip(model.predict(X_test), 0, None)
    mae = float(mean_absolute_error(y_test, y_pred_test))
    rmse = float(root_mean_squared_error(y_test, y_pred_test))
    # Safe MAPE
    non_zero = y_test > 0
    if np.sum(non_zero) > 0:
        mape = float(np.mean(np.abs((y_test[non_zero] - y_pred_test[non_zero]) / y_test[non_zero])) * 100)
    else:
        mape = 0.0

    # Fit on all available historical data for final forecasting
    model.fit(X, y)

    # Recursive / rolling future forecast
    last_known_y = list(daily_df["y"].values)
    last_date = daily_df["ds"].max()
    future_daily = []
    
    # Calculate residual std dev for confidence intervals
    residuals = y - model.predict(X)
    residual_std = float(np.std(residuals)) if len(residuals) > 1 else 1.0

    for i in range(1, forecast_days + 1):
        target_date = last_date + timedelta(days=i)
        dow = target_date.dayofweek
        is_wknd = 1 if dow in [5, 6] else 0
        d_sin = np.sin(2 * np.pi * dow / 7)
        d_cos = np.cos(2 * np.pi * dow / 7)
        lag1 = last_known_y[-1]
        lag7 = last_known_y[-7] if len(last_known_y) >= 7 else last_known_y[0]
        roll7 = float(np.mean(last_known_y[-7:])) if len(last_known_y) >= 7 else float(np.mean(last_known_y))

        feat = np.array([[dow, is_wknd, d_sin, d_cos, lag1, lag7, roll7]])
        pred = float(np.clip(model.predict(feat)[0], 0, None))
        
        lower = max(0.0, pred - 1.645 * residual_std)
        upper = pred + 1.645 * residual_std

        future_daily.append({
            "date": target_date.strftime("%Y-%m-%d"),
            "predicted_demand": round(pred, 2),
            "lower_bound": round(lower, 2),
            "upper_bound": round(upper, 2)
        })
        last_known_y.append(pred)

    # Aggregate to weekly forecast
    future_weekly = []
    for w in range(min(4, forecast_days // 7)):
        w_slice = future_daily[w*7 : (w+1)*7]
        if w_slice:
            w_pred = sum(d["predicted_demand"] for d in w_slice)
            w_lower = sum(d["lower_bound"] for d in w_slice)
            w_upper = sum(d["upper_bound"] for d in w_slice)
            future_weekly.append({
                "date": w_slice[-1]["date"],
                "predicted_demand": round(w_pred, 2),
                "lower_bound": round(w_lower, 2),
                "upper_bound": round(w_upper, 2)
            })

    # Surplus identification: compare current stock with predicted demand before expiry
    safe_expiry_days = min(len(future_daily), max(1, days_until_expiry))
    cumulative_demand_before_expiry = sum(d["predicted_demand"] for d in future_daily[:safe_expiry_days])
    projected_surplus = max(0.0, current_stock - cumulative_demand_before_expiry)

    # Reorder quantity recommendation using standard inventory replenishment policy:
    # Target stock = (Daily Demand * (Lead Time + Review Period)) + Safety Stock
    # Safety Stock = 1.65 * sqrt(Lead Time) * std_dev
    avg_pred_daily = float(np.mean([d["predicted_demand"] for d in future_daily[:7]])) if future_daily else 5.0
    review_period_days = 5
    safety_stock = 1.65 * np.sqrt(max(1, lead_time_days)) * max(1.0, residual_std)
    target_inventory = (avg_pred_daily * (lead_time_days + review_period_days)) + safety_stock
    recommended_reorder = max(0.0, target_inventory - current_stock)

    insight = (
        f"Evaluated on {n_samples} historical days across test window. "
        f"Mean Absolute Error (MAE): {mae:.2f}. "
        f"Predicted avg daily demand is {avg_pred_daily:.1f} units."
    )
    if projected_surplus > 0:
        insight += f" Alert: {projected_surplus:.1f} units projected to exceed demand prior to expiry."

    return {
        "category": category,
        "historical_days_evaluated": n_samples,
        "model_used": "Time-Series Ridge Regression (Lags, Day-of-Week Seasonality, Rolling Trends)",
        "test_metrics": {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "mape": round(mape, 2)
        },
        "daily_forecast": future_daily,
        "weekly_forecast": future_weekly,
        "current_stock": round(current_stock, 2),
        "projected_surplus_quantity": round(projected_surplus, 2),
        "recommended_reorder_quantity": round(recommended_reorder, 2),
        "insight": insight
    }
