"""
SafeSite AI  -  PDF Report Generator
Generates downloadable PDF reports using fpdf2.
"""

from __future__ import annotations

import io
import logging
from datetime import datetime

from fpdf import FPDF

from backend.models import ComplianceResult, DefectReport, ForesightReport, Severity

logger = logging.getLogger(__name__)

SEVERITY_COLORS = {
    Severity.CRITICAL: (220, 53, 69),
    Severity.HIGH: (255, 152, 0),
    Severity.MEDIUM: (255, 193, 7),
    Severity.LOW: (76, 175, 80),
    Severity.PASS: (76, 175, 80),
}


class SafeSiteReport(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(30, 30, 60)
        self.cell(0, 10, "SafeSite AI  -  Inspection Report", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("Helvetica", "", 9)
        self.set_text_color(120, 120, 120)
        self.cell(0, 5, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}} | SafeSite AI", align="C")


def generate_compliance_pdf(result: ComplianceResult) -> bytes:
    """Generate a compliance report PDF."""
    pdf = SafeSiteReport()
    pdf.alias_nb_pages()
    pdf.add_page()

    # Summary section
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(30, 30, 60)
    pdf.cell(0, 10, "Compliance Engine Report", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 7, f"Codes Checked: {', '.join(result.codes_checked)}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Compliance Score: {result.compliance_score:.0f}/100", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Total Violations: {result.total_violations}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, (
        f"Breakdown: {result.critical_count} Critical, {result.high_count} High, "
        f"{result.medium_count} Medium, {result.low_count} Low"
    ), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Violations table
    for v in result.violations:
        color = SEVERITY_COLORS.get(v.severity, (100, 100, 100))
        pdf.set_fill_color(*color)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 7, f"  [{v.severity.value}] {v.id}  -  {v.exact_location}", fill=True, new_x="LMARGIN", new_y="NEXT")

        pdf.set_text_color(60, 60, 60)
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 6, f"  Measured: {v.measured_value}")
        pdf.multi_cell(0, 6, f"  Required: {v.required_value}")
        pdf.multi_cell(0, 6, f"  Code Ref: {v.code_reference}")
        pdf.multi_cell(0, 6, f"  Fix: {v.fix_suggestion}")
        pdf.ln(3)

    buf = io.BytesIO()
    pdf.output(buf)
    return buf.getvalue()


def generate_defect_pdf(report: DefectReport) -> bytes:
    """Generate a defect detection report PDF."""
    pdf = SafeSiteReport()
    pdf.alias_nb_pages()
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(30, 30, 60)
    pdf.cell(0, 10, "Vision Engine  -  Defect Report", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(60, 60, 60)
    pdf.cell(0, 7, f"Overall Condition: {report.overall_condition}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Total Defects: {report.total_defects}", new_x="LMARGIN", new_y="NEXT")
    if report.estimated_repair_cost:
        pdf.cell(0, 7, f"Est. Repair Cost: {report.estimated_repair_cost}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    for d in report.defects:
        color = SEVERITY_COLORS.get(d.severity, (100, 100, 100))
        pdf.set_fill_color(*color)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 10)
        pdf.cell(0, 7, f"  [{d.severity.value}] {d.defect_type.value}", fill=True, new_x="LMARGIN", new_y="NEXT")

        pdf.set_text_color(60, 60, 60)
        pdf.set_font("Helvetica", "", 10)
        pdf.multi_cell(0, 6, f"  Location: {d.location}")
        pdf.multi_cell(0, 6, f"  Description: {d.description}")
        pdf.multi_cell(0, 6, f"  Code Ref: {d.code_reference}")
        pdf.multi_cell(0, 6, f"  Remediation: {d.remediation}")
        pdf.ln(3)

    buf = io.BytesIO()
    pdf.output(buf)
    return buf.getvalue()


def generate_foresight_pdf(report: ForesightReport) -> bytes:
    """Generate a foresight/risk analysis report PDF."""
    pdf = SafeSiteReport()
    pdf.alias_nb_pages()
    pdf.add_page()

    # Title
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(30, 30, 60)
    pdf.cell(0, 10, "Foresight Engine  -  Risk & Optimization Report", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(3)

    # Summary
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(60, 60, 60)
    if report.project_name:
        pdf.cell(0, 7, f"Project: {report.project_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"On-Time Probability: {report.on_time_probability:.1%}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 7, f"Monte Carlo Iterations: {report.monte_carlo_iterations:,}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(5)

    # Risk scenarios
    if report.risk_scenarios:
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(30, 30, 60)
        pdf.cell(0, 8, "Risk Scenarios", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

        for rs in report.risk_scenarios:
            # Color by probability: high = red, low = green
            if rs.probability >= 0.7:
                pdf.set_fill_color(220, 53, 69)
            elif rs.probability >= 0.4:
                pdf.set_fill_color(255, 152, 0)
            else:
                pdf.set_fill_color(76, 175, 80)

            pdf.set_text_color(255, 255, 255)
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(0, 7, f"  {rs.scenario}  -  P={rs.probability:.0%}", fill=True, new_x="LMARGIN", new_y="NEXT")

            pdf.set_text_color(60, 60, 60)
            pdf.set_font("Helvetica", "", 10)
            if rs.impact_days:
                pdf.multi_cell(0, 6, f"  Schedule Impact: +{rs.impact_days} days")
            if rs.impact_cost:
                pdf.multi_cell(0, 6, f"  Cost Impact: +${rs.impact_cost:,.0f}")
            if rs.trigger:
                pdf.multi_cell(0, 6, f"  Trigger: {rs.trigger}")
            pdf.ln(2)

    # Optimization results
    if report.optimization and report.optimization.status == "optimal":
        opt = report.optimization
        pdf.ln(3)
        pdf.set_font("Helvetica", "B", 12)
        pdf.set_text_color(30, 30, 60)
        pdf.cell(0, 8, "Resource Optimization (MILP)", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(2)

        pdf.set_font("Helvetica", "", 11)
        pdf.set_text_color(60, 60, 60)
        pdf.cell(0, 7, f"Original Cost: ${opt.original_cost:,.0f}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 7, f"Optimized Cost: ${opt.optimized_cost:,.0f}", new_x="LMARGIN", new_y="NEXT")
        pdf.cell(0, 7, f"Savings: {opt.savings_percent:.1f}%", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(3)

        # Allocation table header
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_fill_color(30, 30, 60)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(60, 7, "  Task", fill=True)
        pdf.cell(30, 7, "Orig Days", fill=True, align="C")
        pdf.cell(30, 7, "Opt Days", fill=True, align="C")
        pdf.cell(25, 7, "Workers", fill=True, align="C")
        pdf.cell(40, 7, "Total Cost", fill=True, align="C", new_x="LMARGIN", new_y="NEXT")

        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(60, 60, 60)
        for i, alloc in enumerate(opt.resource_allocation):
            bg = (245, 245, 245) if i % 2 == 0 else (255, 255, 255)
            pdf.set_fill_color(*bg)
            pdf.cell(60, 6, f"  {alloc.get('task', '')}", fill=True)
            pdf.cell(30, 6, str(alloc.get("original_days", "")), fill=True, align="C")
            pdf.cell(30, 6, str(alloc.get("optimized_days", "")), fill=True, align="C")
            pdf.cell(25, 6, str(alloc.get("workers", "")), fill=True, align="C")
            pdf.cell(40, 6, f"${alloc.get('total_cost', 0):,}", fill=True, align="C", new_x="LMARGIN", new_y="NEXT")

    buf = io.BytesIO()
    pdf.output(buf)
    return buf.getvalue()

