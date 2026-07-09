"""
SafeSite AI — Layer 3 — Risk Modeler
Monte Carlo simulation for probabilistic schedule/cost estimation.
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np

from backend.config import MONTE_CARLO_ITERATIONS
from backend.models import ForesightReport, RiskScenario

logger = logging.getLogger(__name__)


def run_monte_carlo(
    base_duration_days: int = 180,
    base_cost: float = 5_000_000,
    violation_count: int = 0,
    defect_count: int = 0,
    critical_defects: int = 0,
    iterations: int = MONTE_CARLO_ITERATIONS,
    weather_risk: float = 0.15,
    supply_chain_risk: float = 0.10,
) -> ForesightReport:
    """
    Run Monte Carlo simulation to compute probabilistic project outcomes.
    """
    np.random.seed(42)

    # Risk factors — each adds delay/cost with some probability
    rework_days_per_violation = np.random.triangular(2, 5, 14, size=iterations)
    rework_days_per_defect = np.random.triangular(3, 7, 21, size=iterations)
    rework_days_per_critical = np.random.triangular(7, 14, 35, size=iterations)

    # Weather delays
    weather_hits = np.random.binomial(1, weather_risk, size=iterations)
    weather_delay = weather_hits * np.random.triangular(5, 14, 30, size=iterations)

    # Supply chain delays
    supply_hits = np.random.binomial(1, supply_chain_risk, size=iterations)
    supply_delay = supply_hits * np.random.triangular(7, 21, 45, size=iterations)

    # Labor shortages
    labor_risk = 0.08
    labor_hits = np.random.binomial(1, labor_risk, size=iterations)
    labor_delay = labor_hits * np.random.triangular(3, 10, 20, size=iterations)

    # Total simulated duration
    total_delays = (
        rework_days_per_violation * violation_count
        + rework_days_per_defect * defect_count
        + rework_days_per_critical * critical_defects
        + weather_delay + supply_delay + labor_delay
    )
    simulated_durations = base_duration_days + total_delays

    # Cost impact (proportional to delay)
    cost_multiplier = simulated_durations / base_duration_days
    simulated_costs = base_cost * cost_multiplier

    # Compute probability bands
    on_time = np.mean(simulated_durations <= base_duration_days * 1.05)
    minor_delay = np.mean(
        (simulated_durations > base_duration_days * 1.05)
        & (simulated_durations <= base_duration_days * 1.15)
    )
    major_delay = np.mean(simulated_durations > base_duration_days * 1.15)

    p50_dur = float(np.percentile(simulated_durations, 50))
    p80_dur = float(np.percentile(simulated_durations, 80))
    p95_dur = float(np.percentile(simulated_durations, 95))
    p50_cost = float(np.percentile(simulated_costs, 50))
    p80_cost = float(np.percentile(simulated_costs, 80))
    p95_cost = float(np.percentile(simulated_costs, 95))

    risk_scenarios = [
        RiskScenario(
            scenario="On-time completion",
            probability=round(float(on_time), 3),
            impact_days=0, impact_cost=0.0, trigger="No major issues",
        ),
        RiskScenario(
            scenario="Minor delay (5-15% overrun)",
            probability=round(float(minor_delay), 3),
            impact_days=int(p80_dur - base_duration_days),
            impact_cost=round(p80_cost - base_cost, 2),
            trigger="Rework from defects or weather",
        ),
        RiskScenario(
            scenario="Major delay (>15% overrun)",
            probability=round(float(major_delay), 3),
            impact_days=int(p95_dur - base_duration_days),
            impact_cost=round(p95_cost - base_cost, 2),
            trigger="Compounding risks (supply + weather + critical defects)",
        ),
    ]

    # Build schedule data for Gantt visualization
    schedule_data = _build_schedule(base_duration_days, total_delays, iterations)

    return ForesightReport(
        project_name="SafeSite Project",
        on_time_probability=round(float(on_time), 3),
        risk_scenarios=risk_scenarios,
        monte_carlo_iterations=iterations,
        schedule_data=schedule_data,
    )


def _build_schedule(base_duration: int, delays: np.ndarray, iterations: int) -> list[dict]:
    """Build simplified schedule data for Gantt visualization."""
    phases = [
        {"name": "Foundation", "base_start": 0, "base_duration": 30, "weight": 0.15},
        {"name": "Structure", "base_start": 25, "base_duration": 50, "weight": 0.30},
        {"name": "MEP Rough-in", "base_start": 60, "base_duration": 35, "weight": 0.20},
        {"name": "Envelope", "base_start": 75, "base_duration": 30, "weight": 0.15},
        {"name": "Interior Finish", "base_start": 100, "base_duration": 40, "weight": 0.10},
        {"name": "Commissioning", "base_start": 135, "base_duration": 25, "weight": 0.10},
    ]

    avg_delay = float(np.mean(delays))
    schedule = []
    for phase in phases:
        phase_delay = avg_delay * phase["weight"]
        schedule.append({
            "phase": phase["name"],
            "planned_start": phase["base_start"],
            "planned_end": phase["base_start"] + phase["base_duration"],
            "projected_start": int(phase["base_start"] + phase_delay * 0.3),
            "projected_end": int(phase["base_start"] + phase["base_duration"] + phase_delay),
            "risk_level": (
                "HIGH" if phase_delay > 10 else "MEDIUM" if phase_delay > 5 else "LOW"
            ),
        })
    return schedule
