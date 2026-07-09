"""
SafeSite AI — Pydantic Schemas (shared across layers)
"""

from __future__ import annotations

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


# ── Enums ───────────────────────────────────────────────────────────

class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    PASS = "PASS"


class DefectType(str, Enum):
    CRACK = "Concrete Crack"
    HONEYCOMB = "Honeycombing"
    EXPOSED_REBAR = "Exposed/Rusted Rebar"
    SPALLING = "Spalling"
    FORMWORK_MISALIGNMENT = "Formwork Misalignment"
    IMPROPER_CURING = "Improper Curing"
    OTHER = "Other"


# ── Layer 1 — Compliance Engine Schemas ─────────────────────────────

class SpatialElement(BaseModel):
    """A single spatial element extracted from a blueprint."""
    element_type: str = Field(..., description="e.g. 'room', 'hallway', 'door', 'staircase'")
    name: str = Field(..., description="e.g. 'Hallway B2', 'Room R4'")
    measurements: dict = Field(default_factory=dict, description="Extracted measurements")
    location: str = Field("", description="Location on the blueprint")


class Violation(BaseModel):
    """A single compliance violation."""
    id: str = Field(..., description="Unique violation ID")
    exact_location: str = Field(..., description="Where on the blueprint")
    measured_value: str = Field(..., description="What the blueprint shows")
    required_value: str = Field(..., description="What the code mandates")
    code_reference: str = Field(..., description="Section number and excerpt")
    severity: Severity = Field(..., description="CRITICAL / HIGH / MEDIUM / LOW")
    fix_suggestion: str = Field(..., description="How to resolve")
    category: str = Field("", description="Category (e.g. 'fire_safety', 'structural')")


class ComplianceResult(BaseModel):
    """Full compliance analysis result."""
    project_name: str = ""
    blueprint_filename: str = ""
    total_violations: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    spatial_elements: list[SpatialElement] = Field(default_factory=list)
    violations: list[Violation] = Field(default_factory=list)
    compliance_score: float = Field(100.0, description="0-100 score")
    raw_extraction: dict = Field(default_factory=dict)
    codes_checked: list[str] = Field(default_factory=list)


# ── Layer 2 — Vision Engine Schemas ─────────────────────────────────

class Defect(BaseModel):
    """A single detected defect."""
    id: str
    defect_type: DefectType
    severity: Severity
    confidence: float = Field(..., ge=0.0, le=1.0)
    location: str = Field("", description="Where in the image/scene")
    description: str = ""
    code_reference: str = Field("", description="IS 456 reference")
    remediation: str = Field("", description="How to fix")
    bounding_box: Optional[dict] = None  # {x, y, w, h} normalized


class DefectReport(BaseModel):
    """Full defect analysis result."""
    image_filename: str = ""
    total_defects: int = 0
    critical_count: int = 0
    high_count: int = 0
    defects: list[Defect] = Field(default_factory=list)
    overall_condition: str = ""
    estimated_repair_cost: Optional[str] = None
    estimated_repair_time: Optional[str] = None


# ── Layer 3 — Foresight Engine Schemas ──────────────────────────────

class RiskScenario(BaseModel):
    """A single risk scenario from Monte Carlo simulation."""
    scenario: str
    probability: float = Field(..., ge=0.0, le=1.0)
    impact_days: int = 0
    impact_cost: float = 0.0
    trigger: str = ""


class ForecastResult(BaseModel):
    """Time-series forecast result."""
    target: str = ""
    horizon_days: int = 30
    predictions: list[dict] = Field(default_factory=list)
    confidence_interval: dict = Field(default_factory=dict)


class OptimizationResult(BaseModel):
    """MILP optimization result."""
    status: str = ""
    objective_value: float = 0.0
    original_cost: float = 0.0
    optimized_cost: float = 0.0
    savings_percent: float = 0.0
    resource_allocation: list[dict] = Field(default_factory=list)
    schedule_changes: list[dict] = Field(default_factory=list)


class ForesightReport(BaseModel):
    """Full foresight analysis result."""
    project_name: str = ""
    on_time_probability: float = 0.0
    risk_scenarios: list[RiskScenario] = Field(default_factory=list)
    forecast: Optional[ForecastResult] = None
    optimization: Optional[OptimizationResult] = None
    monte_carlo_iterations: int = 10000
    schedule_data: list[dict] = Field(default_factory=list)


# ── Cross-Layer — Project Health ────────────────────────────────────

class ProjectHealth(BaseModel):
    """Unified project health across all 3 layers."""
    project_id: str = "default"
    health_score: float = Field(100.0, description="Composite 0-100")
    compliance_score: float = 100.0
    vision_score: float = 100.0
    foresight_score: float = 100.0
    active_violations: int = 0
    active_defects: int = 0
    active_risks: int = 0
    last_scan_timestamp: Optional[str] = None
    feedback_loop_active: bool = False
