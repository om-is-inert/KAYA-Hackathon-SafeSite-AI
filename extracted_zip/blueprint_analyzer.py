"""
Layer 1 - Blueprint spatial extraction + compliance cross-referencing via Gemini 2.5 Flash.

Two-step VLM strategy:
  1) extract_spatial_data(image_path)        -> structured measurements JSON
  2) check_compliance(spatial_data, rag_text) -> violations JSON
"""
import json
import re
import google.generativeai as genai
from PIL import Image

from backend import config

genai.configure(api_key=config.GEMINI_API_KEY)

_model = genai.GenerativeModel(config.GEMINI_MODEL_NAME)


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


def _extract_json(raw_text: str) -> dict:
    """Gemini sometimes wraps JSON in ```json fences despite instructions. Strip them."""
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```json\s*|^```\s*|```$", "", cleaned, flags=re.MULTILINE).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise ValueError(f"Gemini did not return valid JSON. Raw response:\n{raw_text}") from e


def extract_spatial_data(image_path: str) -> dict:
    """Step 1: send the blueprint image to Gemini and get structured measurements back."""
    img = Image.open(image_path)
    response = _model.generate_content([EXTRACTION_PROMPT, img])
    return _extract_json(response.text)


def check_compliance(spatial_data: dict, rag_results: str) -> dict:
    """Step 2: cross-reference extracted measurements against retrieved code excerpts."""
    prompt = COMPLIANCE_PROMPT_TEMPLATE.format(
        spatial_data=json.dumps(spatial_data, indent=2),
        rag_results=rag_results,
    )
    response = _model.generate_content(prompt)
    result = _extract_json(response.text)

    # Attach rule-based rework estimates per violation (more defensible than
    # trusting an LLM-hallucinated cost/hours number) - this is what feeds Layer 3.
    for v in result.get("violations", []):
        severity = v.get("severity", "LOW").upper()
        estimate = config.SEVERITY_REWORK_ESTIMATES.get(severity, config.SEVERITY_REWORK_ESTIMATES["LOW"])
        v["estimated_rework_hours"] = estimate["hours"]
        v["estimated_rework_cost"] = estimate["cost"]

    return result


def analyze_blueprint(image_path: str, rag_results: str) -> dict:
    """Full pipeline: extraction -> compliance check. Returns both for transparency/debugging."""
    spatial_data = extract_spatial_data(image_path)
    compliance_result = check_compliance(spatial_data, rag_results)
    return {
        "spatial_data": spatial_data,
        "compliance": compliance_result,
    }
