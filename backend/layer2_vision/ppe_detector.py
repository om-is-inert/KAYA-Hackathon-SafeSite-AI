"""
SafeSite AI — Layer 2 — PPE Safety Detector
Adapted from: SH17 Dataset (https://github.com/ahmadmughees/SH17dataset)
Paper: Ahmad & Rahimi, "SH17: A Dataset for Human Safety and PPE Detection",
       Journal of Safety Science and Resilience, 2024.

Provides two inference paths:
  • Stage 1 (Default): Gemini VLM zero-shot PPE analysis
  • Stage 2 (Production): YOLOv8/v10 fine-tuned on SH17 (17 PPE classes)

The 17 SH17 classes are: person, ear, ear-mufs, face, face-guard, face-mask,
foot, tool, glasses, gloves, helmet, hands, head, medical-suit, shoes,
safety-suit, safety-vest.
"""

from __future__ import annotations

import base64
import json
import logging
import uuid
from pathlib import Path
from typing import Optional

import google.generativeai as genai

from backend.config import GEMINI_API_KEY, VLM_MODEL

logger = logging.getLogger(__name__)
genai.configure(api_key=GEMINI_API_KEY)

# ── SH17 Class Labels ──────────────────────────────────────────────
SH17_CLASSES = {
    0: "person", 1: "ear", 2: "ear-mufs", 3: "face", 4: "face-guard",
    5: "face-mask", 6: "foot", 7: "tool", 8: "glasses", 9: "gloves",
    10: "helmet", 11: "hands", 12: "head", 13: "medical-suit",
    14: "shoes", 15: "safety-suit", 16: "safety-vest",
}

# Mandatory PPE items per NBC 2016 Part IV
MANDATORY_PPE = {
    "helmet": "NBC 2016 §4.4.1 — Hard hat mandatory on all active construction sites",
    "safety-vest": "NBC 2016 §4.4.2 — High-visibility vest required for all ground workers",
    "gloves": "IS 3696 Part II — Hand protection required when handling rebar/formwork",
    "shoes": "IS 11226 — Safety footwear (steel-toe) required on active construction zones",
    "glasses": "IS 5983 — Eye protection required in welding/cutting/grinding zones",
    "face-guard": "IS 8521 — Face shield required for grinding/welding operations",
    "ear-mufs": "IS 9167 — Hearing protection required in zones exceeding 85 dB",
}

PPE_DETECTION_PROMPT = """You are a construction site safety AI specialist trained on the SH17 dataset
(17 PPE/body-part classes, 75,994 annotations, published in J. Safety Science & Resilience 2024).

Analyze this construction site photograph and detect ALL workers and their PPE compliance.

For each worker detected:
1. List PPE items PRESENT (from: helmet, safety-vest, gloves, shoes, glasses, face-guard,
   face-mask, ear-mufs, medical-suit, safety-suit)
2. List PPE items MISSING that are REQUIRED per Indian NBC 2016 Part IV
3. Overall compliance status: COMPLIANT / NON-COMPLIANT / PARTIAL
4. Confidence score: 0.0 to 1.0
5. Location in image (describe position)
6. Bounding box (approximate normalized coords: x, y, w, h from 0-1)

Also provide:
- Total worker count
- Overall site safety score (0-100)
- List of all safety violations with code references

Return ONLY valid JSON:
{
  "total_workers": 3,
  "site_safety_score": 65,
  "workers": [
    {
      "worker_id": "W1",
      "location": "Center-left, operating concrete mixer",
      "ppe_present": ["helmet", "safety-vest", "shoes"],
      "ppe_missing": ["gloves", "glasses"],
      "compliance_status": "PARTIAL",
      "confidence": 0.88,
      "bounding_box": {"x": 0.15, "y": 0.2, "w": 0.25, "h": 0.6},
      "violations": [
        {
          "missing_item": "gloves",
          "code_reference": "IS 3696 Part II — Hand protection required when handling formwork",
          "severity": "HIGH",
          "recommendation": "Provide heat-resistant gloves before concrete pouring"
        }
      ]
    }
  ],
  "site_level_violations": [
    {
      "violation": "60% of workers missing gloves near rebar zone",
      "severity": "CRITICAL",
      "code_reference": "NBC 2016 §4.4.1",
      "recommendation": "Halt operations and distribute mandatory PPE"
    }
  ]
}"""


async def detect_ppe(
    image_path: str | Path | None = None,
    image_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
    use_yolo: bool = False,
) -> dict:
    """
    Analyze a construction site image for PPE compliance.
    
    Args:
        image_path: Path to the image file
        image_bytes: Raw image bytes
        mime_type: MIME type of the image
        use_yolo: If True, use YOLOv10 fine-tuned on SH17 (requires weights)
        
    Returns:
        PPE compliance analysis report
    """
    if use_yolo:
        return await _detect_ppe_yolo(image_path, image_bytes, mime_type)
    return await _detect_ppe_vlm(image_path, image_bytes, mime_type)


async def _detect_ppe_vlm(
    image_path: str | Path | None,
    image_bytes: bytes | None,
    mime_type: str,
) -> dict:
    """PPE detection via Gemini VLM (zero-shot, SH17-informed prompting)."""
    model = genai.GenerativeModel(VLM_MODEL)

    if image_bytes:
        data = image_bytes
    elif image_path:
        p = Path(image_path)
        data = p.read_bytes()
        suffix_map = {".png": "image/png", ".jpg": "image/jpeg",
                      ".jpeg": "image/jpeg", ".webp": "image/webp"}
        mime_type = suffix_map.get(p.suffix.lower(), mime_type)
    else:
        raise ValueError("Provide image_path or image_bytes")

    image_part = {"inline_data": {"mime_type": mime_type,
                                  "data": base64.b64encode(data).decode()}}

    logger.info("Running SH17-guided PPE detection via %s...", VLM_MODEL)
    response = await model.generate_content_async(
        [PPE_DETECTION_PROMPT, image_part],
        generation_config=genai.GenerationConfig(temperature=0.1, max_output_tokens=8192, response_mime_type="application/json"),
    )

    raw = response.text.strip()
    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        import re
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        result = json.loads(m.group()) if m else {
            "total_workers": 0, "site_safety_score": 0,
            "workers": [], "site_level_violations": []
        }

    # Enrich with SH17 metadata
    result["detection_model"] = "gemini-vlm-sh17-guided"
    result["sh17_classes_used"] = list(SH17_CLASSES.values())
    result["dataset_source"] = "SH17 (8,099 images, 75,994 annotations, 17 classes)"
    result["image_filename"] = str(image_path) if image_path else "uploaded_image"

    return result


async def _detect_ppe_yolo(
    image_path: str | Path | None,
    image_bytes: bytes | None,
    mime_type: str,
) -> dict:
    """
    PPE detection via YOLOv10 fine-tuned on SH17.
    Requires: pip install ultralytics
    Weights: Download from https://github.com/ahmadmughees/SH17dataset/releases
    Place weights at: backend/weights/sh17_yolo10x.pt
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        logger.warning("ultralytics not installed, falling back to VLM")
        return await _detect_ppe_vlm(image_path, image_bytes, mime_type)

    weights_path = Path(__file__).parent.parent / "weights" / "sh17_yolo10x.pt"
    if not weights_path.exists():
        logger.warning("SH17 YOLO weights not found at %s, falling back to VLM", weights_path)
        return await _detect_ppe_vlm(image_path, image_bytes, mime_type)

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

    workers = []
    detections_by_class = {}
    for r in results:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            cls_name = SH17_CLASSES.get(cls_id, "unknown")
            xyxy = box.xyxyn[0].tolist()  # normalized [x1, y1, x2, y2]

            if cls_name not in detections_by_class:
                detections_by_class[cls_name] = []
            detections_by_class[cls_name].append({
                "confidence": conf,
                "bbox": {"x": xyxy[0], "y": xyxy[1],
                          "w": xyxy[2] - xyxy[0], "h": xyxy[3] - xyxy[1]},
            })

    # Build worker-level PPE compliance assessment
    person_count = len(detections_by_class.get("person", []))
    ppe_items_detected = {k for k in detections_by_class if k in MANDATORY_PPE}
    ppe_items_missing = set(MANDATORY_PPE.keys()) - ppe_items_detected

    violations = []
    for item in ppe_items_missing:
        violations.append({
            "missing_item": item,
            "code_reference": MANDATORY_PPE[item],
            "severity": "CRITICAL" if item in ("helmet", "safety-vest") else "HIGH",
            "recommendation": f"Provide {item} to all workers immediately",
        })

    safety_score = max(0, 100 - len(ppe_items_missing) * 15)

    return {
        "total_workers": max(person_count, 1),
        "site_safety_score": safety_score,
        "workers": [],  # YOLO gives object-level, not person-level assignment
        "detections_by_class": {k: len(v) for k, v in detections_by_class.items()},
        "ppe_present_onsite": list(ppe_items_detected),
        "ppe_missing_onsite": list(ppe_items_missing),
        "site_level_violations": violations,
        "detection_model": "yolov10x-sh17-finetuned",
        "sh17_classes_used": list(SH17_CLASSES.values()),
        "dataset_source": "SH17 (8,099 images, 75,994 annotations, 17 classes)",
        "image_filename": str(image_path) if image_path else "uploaded_image",
    }
