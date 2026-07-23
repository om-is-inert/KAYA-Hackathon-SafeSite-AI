"""
SafeSite AI — Layer 1 — Blueprint Analyzer
Uses Gemini VLM to extract spatial data from architectural blueprints and cross-reference compliance.
"""

from __future__ import annotations

import base64
import json
import logging
import re
from pathlib import Path
from typing import Any

import google.generativeai as genai
from PIL import Image

from backend import config
from backend.config import GEMINI_API_KEY, VLM_MODEL

logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)
_model = genai.GenerativeModel(VLM_MODEL)


EXTRACTION_PROMPT = """You are a structural/architectural analyst extracting precise spatial data from a blueprint or floor plan image.

Analyze this blueprint and extract ALL of the following, using measurements as shown on the drawing (note the units used, e.g. ft, m, mm):

1. Rooms: name/label, length, width, area
2. Hallways/corridors: label, width, length
3. Doors: location/room, width, swing direction (inward/outward)
4. Staircases: location, width, number of risers, riser height if shown
5. Windows: location/room, approximate width
6. Exits: location, count, straight-line distance between exits
7. Structural elements: columns, beams, load-bearing walls with thickness if labeled

Rules:
- If a measurement is not visible or not labeled on the drawing, output null for that field - do NOT estimate or guess.
- Preserve the exact units shown on the blueprint (do not convert).
- Use the room/area labels exactly as printed on the drawing so results can be cross-referenced visually.
- If the image is unclear or measurements are ambiguous, note this in a "notes" field rather than fabricating a value.

Return ONLY valid JSON, no markdown formatting, no commentary, in this exact structure:

{
  "rooms": [{"label": "", "length": null, "width": null, "unit": "", "area": null}],
  "hallways": [{"label": "", "width": null, "length": null, "unit": ""}],
  "doors": [{"location": "", "width": null, "unit": "", "swing_direction": ""}],
  "staircases": [{"location": "", "width": null, "unit": "", "riser_count": null, "riser_height": null}],
  "windows": [{"location": "", "width": null, "unit": ""}],
  "exits": [{"location": "", "distance_to_next_exit": null, "unit": ""}],
  "structural_elements": [{"type": "", "location": "", "thickness": null, "unit": ""}],
  "notes": ""
}
"""

COMPLIANCE_PROMPT_TEMPLATE = """You are a building code compliance auditor. You will cross-reference extracted blueprint measurements against relevant building code excerpts and identify every violation.

EXTRACTED BLUEPRINT DATA:
{spatial_data}

RELEVANT CODE EXCERPTS (National Building Code 2016 Part IV, IS 456:2000):
{rag_results}

Instructions:
- Compare each measurement in the blueprint data against the applicable code excerpt.
- Only flag a violation if a code excerpt directly and explicitly supports it - do not infer requirements that aren't stated in the excerpts provided.
- If a measurement is null in the blueprint data, skip it (do not flag missing data as a violation).
- If no code excerpt is relevant to a given measurement, skip it.
- For each violation, assign severity based on life-safety impact: CRITICAL (blocks emergency egress or structural safety), HIGH (significant code deviation), MEDIUM (moderate deviation), LOW (minor/cosmetic code deviation).

Return ONLY valid JSON, no markdown, no commentary, in this exact structure:

{{
  "violations": [
    {{
      "id": "",
      "location": "",
      "element_type": "",
      "measured_value": "",
      "required_value": "",
      "code_reference": "",
      "code_excerpt": "",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW",
      "fix_suggestion": ""
    }}
  ],
  "summary": {{
    "total_violations": null,
    "critical_count": null,
    "high_count": null,
    "medium_count": null,
    "low_count": null
  }}
}}
"""


def _repair_json(text: str) -> str:
    """Best-effort repair of common Gemini JSON issues (unescaped quotes in
    measurement values like  2'-4"  and truncated responses)."""
    # Fix unescaped double-quotes inside string values.
    # Pattern: find strings that contain an unescaped " mid-value
    # e.g.  "width": "2'-4""  ->  "width": "2'-4\""
    # We do this by replacing inch-mark patterns with a safe placeholder,
    # then swapping back after parse.
    text = re.sub(r'(\d)\\"', r"\1 in", text)   # already-escaped \" -> in
    text = re.sub(r"(\d)\"(?=[^:,\s\}\]])", r"\1 in", text)  # bare " after digit

    # If the response was truncated, try to close open braces/brackets
    open_braces = text.count("{") - text.count("}")
    open_brackets = text.count("[") - text.count("]")
    if open_braces > 0 or open_brackets > 0:
        # Strip any trailing partial key/value
        text = re.sub(r',\s*"[^"]*$', "", text)
        text = re.sub(r",\s*$", "", text)
        text += "]" * max(open_brackets, 0)
        text += "}" * max(open_braces, 0)
    return text


def _extract_json(raw_text: str) -> dict[str, Any]:
    """Strip markdown code fences if present and decode JSON."""
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```json\s*|^```\s*|```$", "", cleaned, flags=re.MULTILINE).strip()

    # First pass: try as-is
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Second pass: try to repair common Gemini quirks
    repaired = _repair_json(cleaned)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        pass

    # Third pass: extract the outermost { ... } and repair that
    json_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if json_match:
        fragment = _repair_json(json_match.group())
        try:
            return json.loads(fragment)
        except json.JSONDecodeError:
            pass

    logger.error("All JSON parse attempts failed. Raw response:\n%s", raw_text[:2000])
    raise ValueError(f"Gemini did not return valid JSON. Raw response:\n{raw_text}")


def extract_spatial_data(
    image_path: str | Path | None = None,
    image_bytes: bytes | None = None,
    mime_type: str = "image/png",
) -> dict[str, Any]:
    """
    Step 1: send the blueprint image to Gemini and get structured measurements back.
    Works synchronously for standalone scripts and API calls.
    """
    import time
    from google.api_core.exceptions import ResourceExhausted

    for attempt in range(3):
        try:
            if image_path is not None:
                image_path = Path(image_path)
                img = Image.open(image_path)
                logger.info("Sending blueprint %s to %s for spatial extraction...", image_path.name, VLM_MODEL)
                response = _model.generate_content(
                    [EXTRACTION_PROMPT, img],
                    generation_config=genai.GenerationConfig(response_mime_type="application/json"),
                )
            elif image_bytes is not None:
                image_part = {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": base64.b64encode(image_bytes).decode("utf-8"),
                    }
                }
                logger.info("Sending blueprint bytes to %s for spatial extraction...", VLM_MODEL)
                response = _model.generate_content(
                    [EXTRACTION_PROMPT, image_part],
                    generation_config=genai.GenerationConfig(response_mime_type="application/json"),
                )
            else:
                raise ValueError("Either image_path or image_bytes must be provided")
            break
        except ResourceExhausted:
            if attempt == 2:
                raise
            logger.warning(f"Gemini API rate limit hit. Waiting 35 seconds before retry (Attempt {attempt + 1}/3)...")
            time.sleep(35)

    spatial_data = _extract_json(response.text)
    logger.info("Spatial extraction complete: %d keys", len(spatial_data))
    return spatial_data


async def extract_spatial_data_async(
    image_path: str | Path | None = None,
    image_bytes: bytes | None = None,
    mime_type: str = "image/png",
) -> dict[str, Any]:
    """Async wrapper around extract_spatial_data for asyncio callers."""
    import asyncio
    return await asyncio.to_thread(
        extract_spatial_data, image_path=image_path, image_bytes=image_bytes, mime_type=mime_type
    )


def extract_from_pdf_blueprint(pdf_path: str | Path) -> dict[str, Any]:
    """Extract spatial data from a PDF blueprint by rendering the first page to image."""
    import fitz

    pdf_path = Path(pdf_path)
    doc = fitz.open(str(pdf_path))
    page = doc[0]
    mat = fitz.Matrix(3.0, 3.0)
    pix = page.get_pixmap(matrix=mat)
    image_bytes = pix.tobytes("png")
    doc.close()

    return extract_spatial_data(image_bytes=image_bytes, mime_type="image/png")


def check_compliance(spatial_data: dict[str, Any], rag_results: str) -> dict[str, Any]:
    """Step 2: cross-reference extracted measurements against retrieved code excerpts."""
    prompt = COMPLIANCE_PROMPT_TEMPLATE.format(
        spatial_data=json.dumps(spatial_data, indent=2),
        rag_results=rag_results,
    )
    response = _model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(response_mime_type="application/json"),
    )
    result = _extract_json(response.text)

    # Attach rule-based rework estimates per violation (more defensible than
    # trusting an LLM-hallucinated cost/hours number) - this is what feeds Layer 3.
    for v in result.get("violations", []):
        severity = str(v.get("severity", "LOW")).upper()
        estimate = config.SEVERITY_REWORK_ESTIMATES.get(severity, config.SEVERITY_REWORK_ESTIMATES["LOW"])
        v["estimated_rework_hours"] = estimate["hours"]
        v["estimated_rework_cost"] = estimate["cost"]

    return result


def analyze_blueprint(image_path: str | Path, rag_results: str) -> dict[str, Any]:
    """Full pipeline: extraction -> compliance check. Returns both for transparency/debugging."""
    spatial_data = extract_spatial_data(image_path)
    compliance_result = check_compliance(spatial_data, rag_results)
    return {
        "spatial_data": spatial_data,
        "compliance": compliance_result,
    }
