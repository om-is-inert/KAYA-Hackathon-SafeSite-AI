"""
SafeSite AI — Layer 3 — MILP-Based Resource Cost Optimizer
Triggered when Layer 2 flags defects requiring rework.
Uses mixed-integer linear programming (scipy.optimize.milp) to find the
minimum-cost task duration allocation (in whole days) subject to
workforce constraints.

Migrated from linprog -> milp. Why this matters here specifically:
the old linprog path solved for *continuous* days, then truncated with
int(optimized_days[i]) after result.success was already checked. That
truncation could push a task below its minimum bound or make the
worker constraint infeasible again, silently, since nothing re-validated
the rounded solution. milp with integrality=1 solves for integer days
directly, so the returned solution is guaranteed feasible as reported.
"""

from __future__ import annotations

import logging

import numpy as np
from scipy.optimize import milp, LinearConstraint, Bounds

from backend.models import OptimizationResult

logger = logging.getLogger(__name__)


def optimize_resources(
    tasks: list[dict] | None = None,
    defect_rework: list[dict] | None = None,
    total_budget: float = 5_000_000,
    total_workers: int = 50,
    total_days: int = 180,
) -> OptimizationResult:
    """
    MILP resource optimization. Minimizes total project cost subject to
    resource constraints, with task durations constrained to whole days.
    """
    if tasks is None:
        tasks = _default_tasks()

    if defect_rework:
        for rework in defect_rework:
            tasks.append({
                "name": f"Rework: {rework.get('defect_type', 'Unknown')}",
                "duration_days": rework.get("repair_days", 7),
                "workers_needed": rework.get("workers", 5),
                "cost_per_day": rework.get("cost_per_day", 15000),
                "priority": 1,  # High priority
            })

    n = len(tasks)

    # Objective: minimize total cost = sum(cost_per_day * allocated_days)
    # milp minimizes c @ x, same convention as linprog.
    c = np.array([t["cost_per_day"] for t in tasks], dtype=float)

    # Constraint: total workers per day <= total_workers (same construction
    # as the original linprog version — unit fix from bug #1 preserved:
    # b_ub is total_workers * total_days, not a bare headcount).
    A_ub = np.array([[t["workers_needed"] for t in tasks]], dtype=float)
    b_ub = np.array([total_workers * total_days], dtype=float)

    constraint = LinearConstraint(A_ub, -np.inf, b_ub)

    # Bounds: each task must run at least its min duration, same as before.
    lower = np.array([t["duration_days"] for t in tasks], dtype=float)
    upper = np.array([t["duration_days"] * 1.5 for t in tasks], dtype=float)
    bounds = Bounds(lower, upper)

    # All variables represent whole days -> integer.
    integrality = np.ones(n)

    result = milp(
        c,
        constraints=[constraint],
        bounds=bounds,
        integrality=integrality,
    )

    if result.success:
        optimized_days = result.x
        original_cost = sum(t["cost_per_day"] * t["duration_days"] * 1.2 for t in tasks)
        optimized_cost = float(result.fun)

        allocation = []
        for i, task in enumerate(tasks):
            allocation.append({
                "task": task["name"],
                "original_days": int(task["duration_days"] * 1.2),
                # No truncation needed here — milp already returned an
                # integer value, so round() is just a float->int cast for
                # display, not a correction of the solver's output.
                "optimized_days": int(round(optimized_days[i])),
                "workers": task["workers_needed"],
                "daily_cost": task["cost_per_day"],
                "total_cost": int(round(optimized_days[i]) * task["cost_per_day"]),
            })

        savings = ((original_cost - optimized_cost) / original_cost) * 100

        return OptimizationResult(
            status="optimal",
            objective_value=round(optimized_cost, 2),
            original_cost=round(original_cost, 2),
            optimized_cost=round(optimized_cost, 2),
            savings_percent=round(savings, 1),
            resource_allocation=allocation,
        )
    else:
        logger.warning("Optimization did not converge: %s", result.message)
        return OptimizationResult(status="infeasible", objective_value=0)


def _default_tasks() -> list[dict]:
    """Default construction task set for demo."""
    return [
        {"name": "Foundation Work", "duration_days": 30, "workers_needed": 15, "cost_per_day": 25000, "priority": 2},
        {"name": "Structural Framework", "duration_days": 45, "workers_needed": 20, "cost_per_day": 35000, "priority": 2},
        {"name": "MEP Installation", "duration_days": 30, "workers_needed": 12, "cost_per_day": 20000, "priority": 3},
        {"name": "Concrete Pouring", "duration_days": 20, "workers_needed": 18, "cost_per_day": 30000, "priority": 1},
        {"name": "Finishing & Interiors", "duration_days": 35, "workers_needed": 10, "cost_per_day": 18000, "priority": 4},
        {"name": "Quality Inspection", "duration_days": 15, "workers_needed": 5, "cost_per_day": 12000, "priority": 3},
    ]
