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

import google.generativeai as genai

from backend.config import GEMINI_API_KEY, VLM_MODEL
from backend.models import Defect, DefectReport, DefectType, Severity

logger = logging.getLogger(__name__)
genai.configure(api_key=GEMINI_API_KEY)


def _repair_json(text: str) -> str:
    """Best-effort repair of common Gemini JSON issues."""
    text = re.sub(r'(\d)\\"', r"\1 in", text)
    text = re.sub(r'(\d)"(?=[^:,\s\}\]])', r"\1 in", text)
    open_braces = text.count("{") - text.count("}")
    open_brackets = text.count("[") - text.count("]")
    if open_braces > 0 or open_brackets > 0:
        text = re.sub(r',\s*"[^"]*$', "", text)
        text = re.sub(r",\s*$", "", text)
        text += "]" * max(open_brackets, 0)
        text += "}" * max(open_braces, 0)
    return text


def _parse_gemini_json(raw_text: str) -> dict:
    """Multi-pass JSON parser with repair for Gemini responses."""
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```json\s*|^```\s*|```$", "", cleaned, flags=re.MULTILINE).strip()
    for text in [cleaned, _repair_json(cleaned)]:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
    m = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if m:
        try:
            return json.loads(_repair_json(m.group()))
        except json.JSONDecodeError:
            pass
    logger.error("All JSON parse attempts failed. Raw:\n%s", raw_text[:2000])
    return {"defects": [], "overall_condition": "Unknown"}

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


async def detect_defects(
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
    response = await model.generate_content_async(
        [DEFECT_DETECTION_PROMPT, image_part],
        generation_config=genai.GenerationConfig(temperature=0.1, max_output_tokens=8192, response_mime_type="application/json"),
    )

    result = _parse_gemini_json(response.text)

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
