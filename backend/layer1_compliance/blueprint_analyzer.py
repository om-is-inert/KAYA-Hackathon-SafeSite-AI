"""
SafeSite AI — Layer 1 — Blueprint Analyzer
Uses Gemini 2.5 Flash VLM to extract spatial data from architectural blueprints.
"""

from __future__ import annotations

import base64
import json
import logging
from pathlib import Path

import google.generativeai as genai

from backend.config import GEMINI_API_KEY, VLM_MODEL

logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)


SPATIAL_EXTRACTION_PROMPT = """Analyze this architectural blueprint/floor plan image carefully.

Extract ALL of the following spatial information and return as structured JSON:

{
  "building_type": "residential/commercial/industrial",
  "total_floors": <number>,
  "rooms": [
    {
      "name": "<room identifier>",
      "type": "bedroom/kitchen/bathroom/office/lobby/etc",
      "length_m": <float>,
      "width_m": <float>,
      "area_sqm": <float>,
      "has_window": true/false,
      "window_area_sqm": <float or null>
    }
  ],
  "hallways": [
    {
      "name": "<hallway identifier>",
      "width_m": <float>,
      "length_m": <float>,
      "is_fire_escape_route": true/false
    }
  ],
  "doors": [
    {
      "name": "<door identifier>",
      "width_m": <float>,
      "swing_direction": "inward/outward",
      "is_exit_door": true/false,
      "location": "<where it connects>"
    }
  ],
  "staircases": [
    {
      "name": "<staircase identifier>",
      "width_m": <float>,
      "riser_height_mm": <float or null>,
      "tread_depth_mm": <float or null>,
      "has_handrail": true/false
    }
  ],
  "exits": [
    {
      "name": "<exit identifier>",
      "type": "main/emergency/fire_escape",
      "width_m": <float>,
      "floor": <int>
    }
  ],
  "structural_elements": [
    {
      "type": "column/beam/wall",
      "dimensions": "<description>",
      "material": "concrete/steel/masonry/unknown"
    }
  ],
  "fire_safety": {
    "fire_escape_count": <int>,
    "sprinkler_visible": true/false,
    "smoke_detector_visible": true/false,
    "fire_extinguisher_locations": <int>
  },
  "general_notes": "<any other relevant observations>"
}

Be as precise as possible with measurements. If a measurement cannot be determined exactly, provide your best estimate and note uncertainty. If a field cannot be determined, use null.

IMPORTANT: Return ONLY valid JSON. No markdown, no explanation, just the JSON object."""


async def extract_spatial_data(
    image_path: str | Path | None = None,
    image_bytes: bytes | None = None,
    mime_type: str = "image/png",
) -> dict:
    """
    Use Gemini VLM to extract spatial information from a blueprint image.

    Args:
        image_path: Path to the blueprint image file.
        image_bytes: Raw bytes of the blueprint image (alternative to path).
        mime_type: MIME type of the image.

    Returns:
        Parsed spatial data as a dictionary.
    """
    model = genai.GenerativeModel(VLM_MODEL)

    # Prepare image
    if image_bytes:
        image_data = image_bytes
    elif image_path:
        image_path = Path(image_path)
        image_data = image_path.read_bytes()
        # Infer MIME type
        suffix = image_path.suffix.lower()
        mime_map = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
        mime_type = mime_map.get(suffix, mime_type)
    else:
        raise ValueError("Either image_path or image_bytes must be provided")

    image_part = {
        "inline_data": {
            "mime_type": mime_type,
            "data": base64.b64encode(image_data).decode("utf-8"),
        }
    }

    logger.info("Sending blueprint to %s for spatial extraction...", VLM_MODEL)

    response = await model.generate_content_async(
        [SPATIAL_EXTRACTION_PROMPT, image_part],
        generation_config=genai.GenerationConfig(
            temperature=0.1,
            max_output_tokens=4096,
        ),
    )

    raw_text = response.text.strip()

    # Strip markdown code fences if present
    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        raw_text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    try:
        spatial_data = json.loads(raw_text)
    except json.JSONDecodeError:
        logger.warning("VLM returned non-JSON; attempting extraction...")
        # Try to find JSON in the response
        import re
        json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if json_match:
            spatial_data = json.loads(json_match.group())
        else:
            spatial_data = {"raw_response": raw_text, "parse_error": True}

    logger.info("Spatial extraction complete: %d keys", len(spatial_data))
    return spatial_data


async def extract_from_pdf_blueprint(pdf_path: str | Path) -> dict:
    """
    Extract spatial data from a PDF blueprint by converting the first page to image.
    """
    import fitz

    pdf_path = Path(pdf_path)
    doc = fitz.open(str(pdf_path))

    # Render first page at high resolution
    page = doc[0]
    mat = fitz.Matrix(3.0, 3.0)  # 3x zoom for better detail
    pix = page.get_pixmap(matrix=mat)
    image_bytes = pix.tobytes("png")
    doc.close()

    return await extract_spatial_data(
        image_bytes=image_bytes,
        mime_type="image/png",
    )
