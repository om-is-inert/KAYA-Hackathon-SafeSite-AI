"""
SafeSite AI — Cross-Layer Feedback Loop
Orchestrates data flow between all three engines.
"""

from __future__ import annotations

import logging
from datetime import datetime

from backend.models import (
    ComplianceResult, DefectReport, ForesightReport, ProjectHealth, Severity,
)
from backend.layer3_foresight.risk_modeler import run_monte_carlo
from backend.layer3_foresight.optimizer import optimize_resources

logger = logging.getLogger(__name__)


class FeedbackLoop:
    """Manages the interconnected feedback loop across all 3 layers."""

    def __init__(self):
        self.compliance_result: ComplianceResult | None = None
        self.defect_report: DefectReport | None = None
        self.foresight_report: ForesightReport | None = None
        self._active = False
        self._last_update: str | None = None

    @property
    def is_active(self) -> bool:
        return self._active

    def update_compliance(self, result: ComplianceResult) -> dict:
        """L1 → L3: Compliance violations feed into risk model."""
        self.compliance_result = result
        self._active = True
        self._last_update = datetime.now().isoformat()
        logger.info(
            "Feedback loop: L1 updated with %d violations",
            result.total_violations,
        )
        # Trigger L3 recalculation
        return self._recalculate_foresight()

    def update_defects(self, report: DefectReport) -> dict:
        """L2 → L3: Defect detections feed into risk model + optimizer."""
        self.defect_report = report
        self._active = True
        self._last_update = datetime.now().isoformat()
        logger.info(
            "Feedback loop: L2 updated with %d defects",
            report.total_defects,
        )
        # Trigger L3 recalculation
        return self._recalculate_foresight()

    def _recalculate_foresight(self) -> dict:
        """Recalculate L3 based on current L1 + L2 state."""
        violations = self.compliance_result.total_violations if self.compliance_result else 0
        defects = self.defect_report.total_defects if self.defect_report else 0
        critical = self.defect_report.critical_count if self.defect_report else 0

        self.foresight_report = run_monte_carlo(
            violation_count=violations,
            defect_count=defects,
            critical_defects=critical,
        )

        # Run optimization if there are defects requiring rework
        if defects > 0 and self.defect_report:
            rework_items = []
            for d in self.defect_report.defects:
                if d.severity in (Severity.CRITICAL, Severity.HIGH):
                    rework_items.append({
                        "defect_type": d.defect_type.value,
                        "repair_days": 14 if d.severity == Severity.CRITICAL else 7,
                        "workers": 8 if d.severity == Severity.CRITICAL else 5,
                        "cost_per_day": 20000 if d.severity == Severity.CRITICAL else 12000,
                    })
            if rework_items:
                opt = optimize_resources(defect_rework=rework_items)
                self.foresight_report.optimization = opt

        logger.info(
            "Feedback loop: L3 recalculated — on-time prob=%.1f%%",
            self.foresight_report.on_time_probability * 100,
        )

        return {
            "loop_triggered": True,
            "violations_input": violations,
            "defects_input": defects,
            "on_time_probability": self.foresight_report.on_time_probability,
            "timestamp": self._last_update,
        }

    def get_project_health(self) -> ProjectHealth:
        """Compute unified health score from all layers."""
        comp_score = self.compliance_result.compliance_score if self.compliance_result else 100.0
        vis_score = 100.0
        if self.defect_report:
            vis_score = max(0, 100 - self.defect_report.critical_count * 25 - self.defect_report.high_count * 15)
        fore_score = (self.foresight_report.on_time_probability * 100) if self.foresight_report else 100.0

        health = (comp_score * 0.35 + vis_score * 0.35 + fore_score * 0.30)

        return ProjectHealth(
            health_score=round(health, 1),
            compliance_score=round(comp_score, 1),
            vision_score=round(vis_score, 1),
            foresight_score=round(fore_score, 1),
            active_violations=self.compliance_result.total_violations if self.compliance_result else 0,
            active_defects=self.defect_report.total_defects if self.defect_report else 0,
            active_risks=len(self.foresight_report.risk_scenarios) if self.foresight_report else 0,
            last_scan_timestamp=self._last_update,
            feedback_loop_active=self._active,
        )


# Singleton instance
feedback_loop = FeedbackLoop()
