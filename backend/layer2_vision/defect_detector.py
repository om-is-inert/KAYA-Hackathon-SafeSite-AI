"""
SafeSite AI — Layer 2 — Defect Detector
Stage 1: VLM-based defect analysis on site photos via Gemini (zero-shot fallback).
Stage 2: YOLOv11-seg / SAM 2 fine-tuned models.
"""

from __future__ import annotations

import base64
import json
import logging
import re
import uuid
from pathlib import Path
from typing import Optional

import google.generativeai as genai

from backend.config import GEMINI_API_KEY, VLM_MODEL
from backend.models import Defect, DefectReport, DefectType, Severity
from backend.json_utils import parse_gemini_json

logger = logging.getLogger(__name__)
genai.configure(api_key=GEMINI_API_KEY)


DEFECT_DETECTION_PROMPT = """You are a construction defect detection AI specialist.
Analyze this construction site photo and identify ALL visible defects.

For each defect found, provide:
1. Type: Concrete Crack, Honeycombing, Exposed/Rusted Rebar, Spalling,
   Formwork Misalignment, Improper Curing, or Other
2. Severity: CRITICAL, HIGH, MEDIUM, or LOW
3. Confidence: 0.0 to 1.0
4. Location in the image (describe position)
5. Description of the defect
6. Relevant IS 456:2000 code reference
7. Recommended remediation steps
8. Bounding box (approximate normalized coords: x, y, w, h from 0-1)

Return ONLY valid JSON:
{
  "defects": [
    {
      "defect_type": "Concrete Crack",
      "severity": "HIGH",
      "confidence": 0.85,
      "location": "Upper-left quadrant, vertical crack on column",
      "description": "Structural crack approximately 2mm wide...",
      "code_reference": "IS 456 §35.3 — Crack width limit 0.3mm",
      "remediation": "Inject epoxy resin...",
      "bounding_box": {"x": 0.1, "y": 0.15, "w": 0.2, "h": 0.4}
    }
  ],
  "overall_condition": "Fair / Poor / Critical",
  "estimated_repair_cost": "$X,000 - $Y,000",
  "estimated_repair_time": "X-Y days"
}"""


# ── YOLOv11-seg Class Definitions ──────────────────────────────────
YOLO_DEFECT_CLASSES = {
    0: "Concrete Crack",
    1: "Honeycombing",
    2: "Exposed/Rusted Rebar",
    3: "Spalling",
    4: "Formwork Misalignment",
    5: "Improper Curing",
    6: "Other"
}

YOLO_SEVERITY_MAPPING = {
    "Concrete Crack": Severity.HIGH,
    "Honeycombing": Severity.MEDIUM,
    "Exposed/Rusted Rebar": Severity.CRITICAL,
    "Spalling": Severity.HIGH,
    "Formwork Misalignment": Severity.CRITICAL,
    "Improper Curing": Severity.MEDIUM,
    "Other": Severity.LOW,
}


async def detect_defects(
    image_path: str | Path | None = None,
    image_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
    use_yolo: bool = False,
) -> DefectReport:
    """Analyze a site photo for construction defects."""
    if use_yolo:
        return await _detect_defects_yolo(image_path, image_bytes, mime_type)
    return await _detect_defects_vlm(image_path, image_bytes, mime_type)


async def _detect_defects_vlm(
    image_path: str | Path | None = None,
    image_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
) -> DefectReport:
    """Analyze a site photo for construction defects using Gemini VLM."""
    model = genai.GenerativeModel(VLM_MODEL)

    if image_bytes:
        data = image_bytes
    elif image_path:
        p = Path(image_path)
        data = p.read_bytes()
        suffix_map = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
        mime_type = suffix_map.get(p.suffix.lower(), mime_type)
    else:
        raise ValueError("Provide image_path or image_bytes")

    image_part = {"inline_data": {"mime_type": mime_type, "data": base64.b64encode(data).decode()}}

    logger.info("Sending site photo to %s for defect detection...", VLM_MODEL)

    import asyncio
    from google.api_core.exceptions import ResourceExhausted

    for attempt in range(3):
        try:
            response = await model.generate_content_async(
                [DEFECT_DETECTION_PROMPT, image_part],
                generation_config=genai.GenerationConfig(temperature=0.1, max_output_tokens=8192, response_mime_type="application/json"),
            )
            break
        except ResourceExhausted:
            if attempt == 2:
                raise
            logger.warning(f"Gemini API rate limit hit. Waiting 35 seconds before retry (Attempt {attempt + 1}/3)...")
            await asyncio.sleep(35)

    result = parse_gemini_json(
        response.text, fallback={"defects": [], "overall_condition": "Unknown"}
    )

    defects = []
    for d in result.get("defects", []):
        dtype_str = d.get("defect_type", "Other")
        try:
            dtype = DefectType(dtype_str)
        except ValueError:
            dtype = DefectType.OTHER
        try:
            sev = Severity(d.get("severity", "MEDIUM").upper())
        except ValueError:
            sev = Severity.MEDIUM

        defects.append(Defect(
            id=f"D{uuid.uuid4().hex[:6].upper()}",
            defect_type=dtype, severity=sev,
            confidence=float(d.get("confidence", 0.5)),
            location=d.get("location", ""),
            description=d.get("description", ""),
            code_reference=d.get("code_reference", ""),
            remediation=d.get("remediation", ""),
            bounding_box=d.get("bounding_box"),
        ))

    crit = sum(1 for d in defects if d.severity == Severity.CRITICAL)
    high = sum(1 for d in defects if d.severity == Severity.HIGH)

    return DefectReport(
        image_filename=str(image_path) if image_path else "uploaded_image",
        total_defects=len(defects), critical_count=crit, high_count=high,
        defects=defects,
        overall_condition=result.get("overall_condition", "Unknown"),
        estimated_repair_cost=result.get("estimated_repair_cost"),
        estimated_repair_time=result.get("estimated_repair_time"),
    )


async def _detect_defects_yolo(
    image_path: str | Path | None = None,
    image_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
) -> DefectReport:
    """
    Defect detection via YOLOv11-seg.
    Requires: pip install ultralytics
    Weights: Place weights at: backend/weights/defect_yolo11_seg.pt
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        logger.warning("ultralytics not installed, falling back to VLM")
        return await _detect_defects_vlm(image_path, image_bytes, mime_type)

    weights_path = Path(__file__).parent.parent / "weights" / "defect_yolo11_seg.pt"
    if not weights_path.exists():
        logger.warning("YOLO defect weights not found at %s, falling back to VLM", weights_path)
        return await _detect_defects_vlm(image_path, image_bytes, mime_type)

    model = YOLO(str(weights_path))

    # Prepare image
    if image_bytes:
        import tempfile
        tmp = Path(tempfile.mktemp(suffix=".jpg"))
        tmp.write_bytes(image_bytes)
        source = str(tmp)
    elif image_path:
        source = str(image_path)
    else:
        raise ValueError("Provide image_path or image_bytes")

    results = model(source, conf=0.35, iou=0.45, verbose=False)

    defects = []
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            cls_name = YOLO_DEFECT_CLASSES.get(cls_id, "Other")
            xyxy = box.xyxyn[0].tolist()  # normalized [x1, y1, x2, y2]

            try:
                dtype = DefectType(cls_name)
            except ValueError:
                dtype = DefectType.OTHER
                
            sev = YOLO_SEVERITY_MAPPING.get(cls_name, Severity.MEDIUM)

            defects.append(Defect(
                id=f"D{uuid.uuid4().hex[:6].upper()}",
                defect_type=dtype,
                severity=sev,
                confidence=conf,
                location=f"Detected via YOLO bounding box",
                description=f"Detected {cls_name} with {conf:.2f} confidence",
                code_reference="IS 456:2000",
                remediation="Consult structural engineer.",
                bounding_box={"x": xyxy[0], "y": xyxy[1], "w": xyxy[2] - xyxy[0], "h": xyxy[3] - xyxy[1]},
            ))

    crit = sum(1 for d in defects if d.severity == Severity.CRITICAL)
    high = sum(1 for d in defects if d.severity == Severity.HIGH)

    overall_condition = "Poor" if crit > 0 or high > 2 else "Fair"
    if len(defects) == 0:
        overall_condition = "Good"

    return DefectReport(
        image_filename=str(image_path) if image_path else "uploaded_image",
        total_defects=len(defects), critical_count=crit, high_count=high,
        defects=defects,
        overall_condition=overall_condition,
        estimated_repair_cost="Requires manual review",
        estimated_repair_time="Requires manual review",
    )
