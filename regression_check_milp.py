"""
regression_check_milp.py

Self-contained regression check: compares the OLD linprog-based optimizer
(embedded inline below) against the NEW milp-based optimizer on identical
default tasks, and diffs the results.

Usage:
    python regression_check_milp.py

The old linprog logic is inlined here so this script remains runnable even
after cost_optimizer.py has been deleted from the repo. The new milp
version is imported from the live module.
"""

import copy

import numpy as np
from scipy.optimize import linprog

from backend.models import OptimizationResult
from backend.layer3_foresight.resource_optimizer import (
    optimize_resources as optimize_new,
)


# ── Inlined OLD linprog optimizer (exact copy of the deleted cost_optimizer.py) ──

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


def optimize_old(
    tasks: list[dict] | None = None,
    total_workers: int = 50,
    total_days: int = 180,
) -> OptimizationResult:
    """OLD linprog-based optimizer (continuous LP + post-hoc int() truncation)."""
    if tasks is None:
        tasks = _default_tasks()

    c = np.array([t["cost_per_day"] for t in tasks], dtype=float)
    A_ub = np.array([[t["workers_needed"] for t in tasks]], dtype=float)
    b_ub = np.array([total_workers * total_days], dtype=float)
    bounds = [(t["duration_days"], t["duration_days"] * 1.5) for t in tasks]

    result = linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method="highs")

    if result.success:
        optimized_days = result.x
        original_cost = sum(t["cost_per_day"] * t["duration_days"] * 1.2 for t in tasks)
        optimized_cost = float(result.fun)

        allocation = []
        for i, task in enumerate(tasks):
            allocation.append({
                "task": task["name"],
                "original_days": int(task["duration_days"] * 1.2),
                "optimized_days": int(optimized_days[i]),
                "workers": task["workers_needed"],
                "daily_cost": task["cost_per_day"],
                "total_cost": int(optimized_days[i] * task["cost_per_day"]),
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
        return OptimizationResult(status="infeasible", objective_value=0)


# ── Regression diff ──────────────────────────────────────────────────

def main():
    tasks_old = copy.deepcopy(_default_tasks())
    tasks_new = copy.deepcopy(_default_tasks())

    old_result = optimize_old(tasks=tasks_old)
    new_result = optimize_new(tasks=tasks_new)

    print("=" * 60)
    print("OLD (linprog, continuous + post-hoc int() truncation)")
    print("=" * 60)
    print(f"Status: {old_result.status}")
    print(f"Optimized cost: {old_result.optimized_cost}")
    print(f"Savings %: {old_result.savings_percent}")
    for a in old_result.resource_allocation:
        print(f"  {a['task']:<28} optimized_days={a['optimized_days']:>3}  "
              f"total_cost={a['total_cost']}")

    print()
    print("=" * 60)
    print("NEW (milp, integrality=1)")
    print("=" * 60)
    print(f"Status: {new_result.status}")
    print(f"Optimized cost: {new_result.optimized_cost}")
    print(f"Savings %: {new_result.savings_percent}")
    for a in new_result.resource_allocation:
        print(f"  {a['task']:<28} optimized_days={a['optimized_days']:>3}  "
              f"total_cost={a['total_cost']}")

    print()
    print("=" * 60)
    print("DIFF")
    print("=" * 60)

    cost_delta = new_result.optimized_cost - old_result.optimized_cost
    print(f"Objective value delta (new - old): {cost_delta:+.2f}")
    if abs(cost_delta) > old_result.optimized_cost * 0.02:
        print("  WARNING: >2% difference in objective value — investigate before trusting migration.")
    else:
        print("  OK — objective value within expected rounding tolerance.")

    print()
    for old_a, new_a in zip(old_result.resource_allocation, new_result.resource_allocation):
        day_delta = new_a["optimized_days"] - old_a["optimized_days"]
        flag = "  <-- differs by >1 day" if abs(day_delta) > 1 else ""
        print(f"  {old_a['task']:<28} old={old_a['optimized_days']:>3}d  "
              f"new={new_a['optimized_days']:>3}d  delta={day_delta:+d}{flag}")

    print()
    print("If all deltas are 0 or ±1 day (rounding), and objective value is")
    print("within ~2%, the migration preserved behavior and just enforces")
    print("integer feasibility properly. Large deltas mean re-check the")
    print("constraint/bounds translation before trusting milp's output.")


if __name__ == "__main__":
    main()
