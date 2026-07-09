"""
SafeSite AI — Layer 3 — Forecaster
Time-series forecasting for material costs and lead times.
Stage 1: Simple statistical forecasting with synthetic data.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

from backend.models import ForecastResult

logger = logging.getLogger(__name__)


def generate_synthetic_cost_data(days: int = 365) -> pd.DataFrame:
    """Generate synthetic construction cost index data."""
    np.random.seed(42)
    dates = [datetime(2025, 1, 1) + timedelta(days=i) for i in range(days)]

    # Base trend + seasonality + noise
    trend = np.linspace(100, 115, days)
    seasonal = 5 * np.sin(2 * np.pi * np.arange(days) / 365)
    noise = np.random.normal(0, 2, days)

    cement_index = trend + seasonal + noise
    steel_index = trend * 1.1 + seasonal * 1.5 + np.random.normal(0, 3, days)
    labor_index = trend * 0.95 + seasonal * 0.5 + np.random.normal(0, 1.5, days)

    return pd.DataFrame({
        "date": dates,
        "cement_cost_index": cement_index,
        "steel_cost_index": steel_index,
        "labor_cost_index": labor_index,
    })


def forecast_costs(
    horizon_days: int = 90,
    target: str = "cement_cost_index",
) -> ForecastResult:
    """Simple moving-average + trend forecast for demo purposes."""
    df = generate_synthetic_cost_data()

    # Simple exponential smoothing
    values = df[target].values
    alpha = 0.3
    smoothed = [values[0]]
    for v in values[1:]:
        smoothed.append(alpha * v + (1 - alpha) * smoothed[-1])

    # Project forward
    last_val = smoothed[-1]
    trend_rate = (smoothed[-1] - smoothed[-30]) / 30  # daily trend

    predictions = []
    last_date = df["date"].iloc[-1]
    for i in range(1, horizon_days + 1):
        pred_date = last_date + timedelta(days=i)
        pred_val = last_val + trend_rate * i + np.random.normal(0, 1)
        predictions.append({
            "date": pred_date.strftime("%Y-%m-%d"),
            "value": round(float(pred_val), 2),
            "lower_bound": round(float(pred_val - 5 - i * 0.05), 2),
            "upper_bound": round(float(pred_val + 5 + i * 0.05), 2),
        })

    return ForecastResult(
        target=target,
        horizon_days=horizon_days,
        predictions=predictions,
        confidence_interval={"level": 0.95, "method": "exponential_smoothing"},
    )
