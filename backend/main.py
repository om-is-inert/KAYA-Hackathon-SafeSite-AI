"""
SafeSite AI — FastAPI Entry Point
Three-layer construction intelligence platform.
"""

from __future__ import annotations

import logging
import uuid
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.models import (
    ComplianceResult, DefectReport, ForesightReport, ProjectHealth,
    PPEReport, BD3ClassificationReport, ScanToBIMReport,
)
from backend.feedback_loop import feedback_loop

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(name)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="SafeSite AI",
    description="3-Layer Construction Intelligence Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend
frontend_dir = Path(__file__).resolve().parent.parent / "frontend"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir)), name="static")

# ── Knowledge Base (lazy init) ──────────────────────────────────────
_kb = None

def get_knowledge_base():
    global _kb
    if _kb is None:
        from backend.layer1_compliance.knowledge_base import KnowledgeBase
        _kb = KnowledgeBase(persist_dir=config.CHROMA_PERSIST_DIR)
    return _kb


# ── Layer 1 — Compliance Engine ─────────────────────────────────────

@app.post("/api/v1/compliance/analyze", response_model=ComplianceResult)
async def analyze_compliance(
    blueprint: UploadFile = File(...),
    codes: str = Form("NBC 2016 Part IV,IS 456:2000"),
):
    """Upload a blueprint and run compliance analysis."""
    content = await blueprint.read()
    filename = blueprint.filename or "blueprint"
    suffix = Path(filename).suffix.lower()

    # Save upload
    save_path = config.UPLOAD_DIR / f"{uuid.uuid4().hex}_{filename}"
    save_path.write_bytes(content)

    # Step 1: VLM spatial extraction
    from backend.layer1_compliance.blueprint_analyzer import (
        extract_spatial_data, extract_from_pdf_blueprint,
    )
    if suffix == ".pdf":
        spatial_data = await extract_from_pdf_blueprint(save_path)
    else:
        spatial_data = await extract_spatial_data(image_path=save_path)

    # Step 2: RAG retrieval
    kb = get_knowledge_base()
    queries = [
        "minimum corridor width fire escape",
        "exit door swing direction requirements",
        "staircase width requirements",
        "room ventilation window area requirements",
        "structural column spacing requirements",
        "fire safety exit count requirements",
    ]
    rag_results = []
    for q in queries:
        rag_results.extend(kb.query(q, n_results=3))

    # Step 3: Compliance check
    from backend.layer1_compliance.compliance_checker import check_compliance
    codes_list = [c.strip() for c in codes.split(",")]
    result = await check_compliance(spatial_data, rag_results, codes_list)
    result.blueprint_filename = filename

    # Feed into feedback loop
    feedback_loop.update_compliance(result)

    return result


@app.post("/api/v1/compliance/codes/upload")
async def upload_building_code(pdf: UploadFile = File(...)):
    """Upload a custom building code PDF to the knowledge base."""
    content = await pdf.read()
    save_path = config.UPLOAD_DIR / f"code_{pdf.filename}"
    save_path.write_bytes(content)

    kb = get_knowledge_base()
    count = kb.ingest_pdf(save_path)
    return {"status": "success", "chunks_ingested": count, "filename": pdf.filename}


@app.get("/api/v1/compliance/codes/list")
async def list_codes():
    """List available building codes."""
    codes = []
    for pdf_file in config.BUILDING_CODES_DIR.glob("*.pdf"):
        codes.append({"name": pdf_file.stem, "filename": pdf_file.name, "size_mb": round(pdf_file.stat().st_size / 1e6, 1)})
    return {"codes": codes}


@app.post("/api/v1/compliance/codes/ingest")
async def ingest_codes():
    """Ingest all building code PDFs from the Info on construction directory."""
    kb = get_knowledge_base()
    count = kb.ingest_directory(config.BUILDING_CODES_DIR)
    return {"status": "success", "total_chunks": count, "doc_count": kb.doc_count}


# ── Layer 2 — Vision Engine ─────────────────────────────────────────

@app.post("/api/v1/vision/defect/analyze", response_model=DefectReport)
async def analyze_defects(image: UploadFile = File(...)):
    """Upload a site photo for defect detection."""
    content = await image.read()
    save_path = config.UPLOAD_DIR / f"{uuid.uuid4().hex}_{image.filename}"
    save_path.write_bytes(content)

    from backend.layer2_vision.defect_detector import detect_defects
    report = await detect_defects(image_path=save_path)
    report.image_filename = image.filename or "uploaded"

    # Feed into feedback loop
    feedback_loop.update_defects(report)

    return report


@app.post("/api/v1/vision/ppe/analyze")
async def analyze_ppe(image: UploadFile = File(...), use_yolo: bool = Form(False)):
    """Upload a site photo for SH17-guided PPE & worker safety audit."""
    content = await image.read()
    save_path = config.UPLOAD_DIR / f"{uuid.uuid4().hex}_{image.filename}"
    save_path.write_bytes(content)

    from backend.layer2_vision.ppe_detector import detect_ppe
    report_dict = await detect_ppe(image_path=save_path, use_yolo=use_yolo)

    # Feed into feedback loop
    feedback_loop.update_ppe(report_dict)

    return report_dict


@app.post("/api/v1/vision/bd3/analyze")
async def analyze_bd3_defects(image: UploadFile = File(...), use_vit: bool = Form(False)):
    """Upload a surface photo for BD3 building defect classification."""
    content = await image.read()
    save_path = config.UPLOAD_DIR / f"{uuid.uuid4().hex}_{image.filename}"
    save_path.write_bytes(content)

    from backend.layer2_vision.defect_classifier import classify_building_defects
    report_dict = await classify_building_defects(image_path=save_path, use_vit=use_vit)

    # Feed into feedback loop
    feedback_loop.update_bd3(report_dict)

    return report_dict


@app.post("/api/v1/vision/scan2bim/compare")
async def compare_scan_to_bim(as_built_elements: str = Form(...), as_designed_elements: str = Form(...)):
    """Run Scan-to-BIM dimensional comparison between as-built scan and Layer 1 blueprint."""
    import json
    try:
        built_list = json.loads(as_built_elements)
        designed_list = json.loads(as_designed_elements)
    except Exception as e:
        raise HTTPException(400, f"Invalid JSON element lists: {e}")

    from backend.layer2_vision.scan_to_bim import scan_to_bim
    scan_to_bim.compare_with_blueprint(built_list, designed_list)
    summary = scan_to_bim.generate_comparison_summary()

    # Feed into feedback loop
    feedback_loop.update_scan2bim(summary)

    return summary


# ── Layer 3 — Foresight Engine ──────────────────────────────────────

@app.post("/api/v1/foresight/risk", response_model=ForesightReport)
async def run_risk_simulation(
    base_duration: int = Form(180),
    base_cost: float = Form(5_000_000),
):
    """Run Monte Carlo risk simulation."""
    from backend.layer3_foresight.risk_modeler import run_monte_carlo
    violations = feedback_loop.compliance_result.total_violations if feedback_loop.compliance_result else 0
    defects = feedback_loop.defect_report.total_defects if feedback_loop.defect_report else 0
    critical = feedback_loop.defect_report.critical_count if feedback_loop.defect_report else 0

    report = run_monte_carlo(
        base_duration_days=base_duration, base_cost=base_cost,
        violation_count=violations, defect_count=defects, critical_defects=critical,
    )
    feedback_loop.foresight_report = report
    return report


@app.post("/api/v1/foresight/optimize")
async def run_optimization():
    """Run MILP resource optimization."""
    from backend.layer3_foresight.optimizer import optimize_resources
    rework = []
    if feedback_loop.defect_report:
        from backend.models import Severity
        for d in feedback_loop.defect_report.defects:
            if d.severity in (Severity.CRITICAL, Severity.HIGH):
                rework.append({
                    "defect_type": d.defect_type.value,
                    "repair_days": 14 if d.severity == Severity.CRITICAL else 7,
                    "workers": 8 if d.severity == Severity.CRITICAL else 5,
                    "cost_per_day": 20000 if d.severity == Severity.CRITICAL else 12000,
                })
    result = optimize_resources(defect_rework=rework if rework else None)
    return result


@app.post("/api/v1/foresight/forecast")
async def run_forecast(horizon_days: int = Form(90), target: str = Form("cement_cost_index")):
    """Run time-series cost forecast."""
    from backend.layer3_foresight.forecaster import forecast_costs
    return forecast_costs(horizon_days=horizon_days, target=target)


@app.get("/api/v1/foresight/dashboard")
async def foresight_dashboard():
    """Current foresight state for the dashboard."""
    if feedback_loop.foresight_report:
        return feedback_loop.foresight_report
    from backend.layer3_foresight.risk_modeler import run_monte_carlo
    return run_monte_carlo()


# ── Cross-Layer ─────────────────────────────────────────────────────

@app.get("/api/v1/project/health", response_model=ProjectHealth)
async def project_health():
    """Get unified project health across all 3 layers."""
    return feedback_loop.get_project_health()


@app.post("/api/v1/project/loop/trigger")
async def trigger_loop():
    """Manually trigger the feedback loop recalculation."""
    if not feedback_loop.compliance_result and not feedback_loop.defect_report:
        return {"status": "no_data", "message": "Upload a blueprint or site photo first"}
    result = feedback_loop._recalculate_foresight()
    return result


# ── Reports ─────────────────────────────────────────────────────────

@app.get("/api/v1/compliance/report/pdf")
async def download_compliance_pdf():
    """Download compliance report as PDF."""
    if not feedback_loop.compliance_result:
        raise HTTPException(404, "No compliance analysis available. Run an analysis first.")
    from backend.report_generator import generate_compliance_pdf
    pdf_bytes = generate_compliance_pdf(feedback_loop.compliance_result)
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": "attachment; filename=compliance_report.pdf"})


@app.get("/api/v1/vision/report/pdf")
async def download_defect_pdf():
    """Download defect report as PDF."""
    if not feedback_loop.defect_report:
        raise HTTPException(404, "No defect analysis available. Run an analysis first.")
    from backend.report_generator import generate_defect_pdf
    pdf_bytes = generate_defect_pdf(feedback_loop.defect_report)
    return Response(content=pdf_bytes, media_type="application/pdf",
                    headers={"Content-Disposition": "attachment; filename=defect_report.pdf"})


# ── Health Check ────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "SafeSite AI", "version": "1.0.0"}
