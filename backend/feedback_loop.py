"""
SafeSite AI — Cross-Layer Feedback Loop
Orchestrates data flow between all three engines:
  • Layer 1: Compliance Engine (Blueprint & Building Codes)
  • Layer 2: Vision Engine (Structural Defects, SH17 PPE Safety, BD3 Defects, Scan-to-BIM)
  • Layer 3: Foresight Engine (Risk Monte Carlo, MILP Optimizer, Cost Forecaster)
"""

from __future__ import annotations

import logging
from datetime import datetime

from backend.models import (
    ComplianceResult, DefectReport, ForesightReport, ProjectHealth, Severity,
    PPEReport, BD3ClassificationReport, ScanToBIMReport,
)
from backend.layer3_foresight.risk_modeler import run_monte_carlo
from backend.layer3_foresight.optimizer import optimize_resources

logger = logging.getLogger(__name__)


class FeedbackLoop:
    """Manages the interconnected feedback loop across all 3 layers."""

    def __init__(self):
        self.compliance_result: ComplianceResult | None = None
        self.defect_report: DefectReport | None = None
        self.ppe_report: PPEReport | None = None
        self.bd3_report: BD3ClassificationReport | None = None
        self.scan2bim_report: ScanToBIMReport | None = None
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
        return self._recalculate_foresight()

    def update_ppe(self, report: PPEReport | dict) -> dict:
        """L2 → L3: SH17 PPE safety audits feed into risk model."""
        if isinstance(report, dict):
            # Parse dict into PPEReport if needed or store metadata
            self.ppe_report = PPEReport(**{k: v for k, v in report.items() if k in PPEReport.__fields__}) if hasattr(PPEReport, "__fields__") else report
        else:
            self.ppe_report = report
        self._active = True
        self._last_update = datetime.now().isoformat()
        logger.info("Feedback loop: L2 PPE safety audit updated")
        return self._recalculate_foresight()

    def update_bd3(self, report: BD3ClassificationReport | dict) -> dict:
        """L2 → L3: BD3 building defect classifications feed into risk model."""
        if isinstance(report, dict):
            self.bd3_report = report
        else:
            self.bd3_report = report
        self._active = True
        self._last_update = datetime.now().isoformat()
        logger.info("Feedback loop: L2 BD3 defect classification updated")
        return self._recalculate_foresight()

    def update_scan2bim(self, report: ScanToBIMReport | dict) -> dict:
        """L2 ↔ L1 → L3: Scan-to-BIM dimensional deviations feed into risk & optimizer."""
        if isinstance(report, dict):
            self.scan2bim_report = report
        else:
            self.scan2bim_report = report
        self._active = True
        self._last_update = datetime.now().isoformat()
        logger.info("Feedback loop: L2 Scan-to-BIM bridge updated")
        return self._recalculate_foresight()

    def _recalculate_foresight(self) -> dict:
        """Recalculate L3 based on current L1 + L2 state (including SH17, BD3, and Scan-to-BIM)."""
        violations = self.compliance_result.total_violations if self.compliance_result else 0
        
        # Combine defects across structural, BD3, and Scan-to-BIM deviations
        defects = 0
        critical = 0
        if self.defect_report:
            defects += self.defect_report.total_defects
            critical += self.defect_report.critical_count
        
        if isinstance(self.scan2bim_report, dict):
            defects += self.scan2bim_report.get("deviations_found", 0)
            critical += self.scan2bim_report.get("critical", 0)
        elif self.scan2bim_report:
            defects += self.scan2bim_report.deviations_found
            critical += self.scan2bim_report.critical

        # Factor PPE violations as critical safety hazards
        if isinstance(self.ppe_report, dict):
            site_viols = len(self.ppe_report.get("site_level_violations", []))
            defects += site_viols
            if self.ppe_report.get("site_safety_score", 100) < 70:
                critical += 1
        elif self.ppe_report:
            defects += len(self.ppe_report.site_level_violations)
            if self.ppe_report.site_safety_score < 70:
                critical += 1

        self.foresight_report = run_monte_carlo(
            violation_count=violations,
            defect_count=defects,
            critical_defects=critical,
        )

        # Run optimization if there are defects or Scan-to-BIM deviations requiring rework
        rework_items = []
        if self.defect_report:
            for d in self.defect_report.defects:
                if d.severity in (Severity.CRITICAL, Severity.HIGH):
                    rework_items.append({
                        "defect_type": d.defect_type.value,
                        "repair_days": 14 if d.severity == Severity.CRITICAL else 7,
                        "workers": 8 if d.severity == Severity.CRITICAL else 5,
                        "cost_per_day": 20000 if d.severity == Severity.CRITICAL else 12000,
                    })

        if isinstance(self.scan2bim_report, dict) and self.scan2bim_report.get("deviations"):
            for dev in self.scan2bim_report.get("deviations", []):
                sev = dev.get("severity", "MEDIUM")
                if sev in ("CRITICAL", "HIGH"):
                    rework_items.append({
                        "defect_type": f"Scan2BIM {dev.get('element_type', 'element')} deviation",
                        "repair_days": 18 if sev == "CRITICAL" else 9,
                        "workers": 10 if sev == "CRITICAL" else 6,
                        "cost_per_day": 25000 if sev == "CRITICAL" else 15000,
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
            "critical_defects_input": critical,
            "on_time_probability": self.foresight_report.on_time_probability,
            "timestamp": self._last_update,
        }

    def get_project_health(self) -> ProjectHealth:
        """Compute unified health score from all layers."""
        comp_score = self.compliance_result.compliance_score if self.compliance_result else 100.0
        
        vis_score = 100.0
        if self.defect_report:
            vis_score -= self.defect_report.critical_count * 25 + self.defect_report.high_count * 15
        if isinstance(self.ppe_report, dict):
            vis_score = min(vis_score, float(self.ppe_report.get("site_safety_score", 100)))
        elif self.ppe_report:
            vis_score = min(vis_score, self.ppe_report.site_safety_score)
        if isinstance(self.bd3_report, dict):
            vis_score = min(vis_score, float(self.bd3_report.get("surface_condition_score", 100)))
        
        vis_score = max(0.0, vis_score)
        fore_score = (self.foresight_report.on_time_probability * 100) if self.foresight_report else 100.0

        health = (comp_score * 0.35 + vis_score * 0.35 + fore_score * 0.30)

        active_defects_count = self.defect_report.total_defects if self.defect_report else 0
        if isinstance(self.scan2bim_report, dict):
            active_defects_count += self.scan2bim_report.get("deviations_found", 0)
        elif self.scan2bim_report:
            active_defects_count += self.scan2bim_report.deviations_found

        return ProjectHealth(
            health_score=round(health, 1),
            compliance_score=round(comp_score, 1),
            vision_score=round(vis_score, 1),
            foresight_score=round(fore_score, 1),
            active_violations=self.compliance_result.total_violations if self.compliance_result else 0,
            active_defects=active_defects_count,
            active_risks=len(self.foresight_report.risk_scenarios) if self.foresight_report else 0,
            last_scan_timestamp=self._last_update,
            feedback_loop_active=self._active,
        )


# Singleton instance
feedback_loop = FeedbackLoop()
