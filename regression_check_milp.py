"""
regression_check_milp.py

Runs the OLD linprog-based optimizer and the NEW milp-based optimizer on
identical default tasks, and diffs the results. Use this once, right after
the migration, to confirm milp didn't change behavior other than enforcing
integer days.

Usage:
    python regression_check_milp.py

Requires both versions to be importable — adjust the import paths below
to match wherever you've placed the old vs new file (e.g. keep the old
one temporarily as resource_optimizer_linprog_OLD.py during this check,
then delete it once you're satisfied).
"""

import copy

# Adjust these imports to match your actual file locations.
from backend.layer3_foresight.resource_optimizer_linprog_OLD import (
    optimize_resources as optimize_old,
    _default_tasks,
)
from backend.layer3_foresight.resource_optimizer import (
    optimize_resources as optimize_new,
)


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
        print("  ⚠️  >2% difference in objective value — investigate before trusting migration.")
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
