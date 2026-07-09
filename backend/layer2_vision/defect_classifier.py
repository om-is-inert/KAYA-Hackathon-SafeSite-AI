"""
SafeSite AI — Layer 2 — Building Defect Classifier
Adapted from: BD3 Dataset (https://github.com/Praveenkottari/BD3-Dataset)
Paper: Kottari & Arjunan, "BD3: Building Defects Detection Dataset",
       ACM BuildSys '24 (DOI: 10.1145/3671127.3698789)

BD3 provides 3,965 annotated RGB images across 7 classes:
  Algae, Major Crack, Minor Crack, Peeling, Spalling, Stain, Normal

This module implements a ViT-based classifier pipeline that:
  • Stage 1 (Default): Uses Gemini VLM with BD3-informed prompting
  • Stage 2 (Production): Uses ViT-patch16 fine-tuned on BD3 augmented set (F1=0.9879)
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

# ── BD3 Class Definitions ──────────────────────────────────────────
BD3_CLASSES = {
    0: "algae",
    1: "major_crack",
    2: "minor_crack",
    3: "peeling",
    4: "spalling",
    5: "stain",
    6: "normal",
}

# Severity mapping per BD3 class (aligned with IS 456:2000)
BD3_SEVERITY = {
    "major_crack": "CRITICAL",
    "spalling": "HIGH",
    "minor_crack": "MEDIUM",
    "peeling": "MEDIUM",
    "algae": "LOW",
    "stain": "LOW",
    "normal": "PASS",
}

# IS 456 / NBC 2016 code references per BD3 defect type
BD3_CODE_REFERENCES = {
    "major_crack": "IS 456 §35.3.2 — Crack width exceeds 0.3mm (moderate exposure); structural integrity compromised",
    "minor_crack": "IS 456 §35.3.2 — Hairline/surface cracks detected; monitor for width propagation over 28 days",
    "spalling": "IS 456 §35.4 — Concrete cover delamination with exposed aggregate; risk of rebar corrosion",
    "peeling": "IS 456 §14.1 — Surface finish deterioration; re-apply protective coating per NBC 2016 §7.2",
    "algae": "NBC 2016 §7.4 — Biological growth indicating persistent moisture ingress; waterproofing failure",
    "stain": "NBC 2016 §7.3 — Efflorescence or rust staining from water seepage through concrete matrix",
    "normal": "No defect detected — surface condition satisfactory",
}

# Remediation actions per BD3 defect type
BD3_REMEDIATION = {
    "major_crack": "Immediate structural assessment required. Inject low-viscosity epoxy resin per IS 15988. If width >1mm, install carbon fiber wrap reinforcement.",
    "minor_crack": "Apply flexible sealant (polyurethane). Monitor crack gauges monthly. Document width progression.",
    "spalling": "Remove loose concrete, treat rebar with anti-corrosion primer (zinc phosphate), apply polymer-modified repair mortar per IS 456 §14.",
    "peeling": "Power-wash surface, apply bonding agent, re-plaster with 1:4 cement-sand mix. Apply waterproof coating.",
    "algae": "Pressure wash with biocide solution. Apply silicone-based waterproof membrane. Fix drainage to eliminate moisture source.",
    "stain": "Identify and seal water ingress source. Treat efflorescence with dilute HCl (5%). Apply breathable sealant.",
    "normal": "No action required. Schedule next inspection per maintenance calendar.",
}


BD3_CLASSIFICATION_PROMPT = """You are a building defect classification AI trained on the BD3 dataset
(3,965 annotated images, 7 defect classes, published at ACM BuildSys '24).

Analyze this building surface photograph and classify ALL visible defects.

The BD3 defect taxonomy is:
1. **Algae** — Biological growth (green/black patches) from moisture
2. **Major Crack** — Structural cracks >0.3mm wide
3. **Minor Crack** — Hairline cracks <0.3mm
4. **Peeling** — Paint/plaster delamination and flaking
5. **Spalling** — Concrete cover breaking away, exposing aggregate
6. **Stain** — Efflorescence, rust, or water marks
7. **Normal** — No defect visible

For each region/defect found, provide:
1. BD3 defect class (from the 7 classes above)
2. Severity: CRITICAL, HIGH, MEDIUM, LOW, or PASS
3. Confidence: 0.0 to 1.0
4. Location on the surface (describe position)
5. Description of visual characteristics
6. Affected area percentage (estimated)

Return ONLY valid JSON:
{
  "primary_classification": "major_crack",
  "confidence": 0.92,
  "all_defects_found": [
    {
      "defect_class": "major_crack",
      "severity": "CRITICAL",
      "confidence": 0.92,
      "location": "Vertical crack running through center of wall panel",
      "description": "Structural crack approximately 2-3mm wide, 45cm long, running vertically with branching pattern",
      "affected_area_percent": 8.5
    },
    {
      "defect_class": "stain",
      "severity": "LOW",
      "confidence": 0.78,
      "location": "Upper-right corner near ceiling junction",
      "description": "Water staining with efflorescence deposits",
      "affected_area_percent": 3.2
    }
  ],
  "surface_condition_score": 35,
  "requires_immediate_action": true,
  "inspection_summary": "Wall panel shows significant structural cracking..."
}"""


async def classify_building_defects(
    image_path: str | Path | None = None,
    image_bytes: bytes | None = None,
    mime_type: str = "image/jpeg",
    use_vit: bool = False,
) -> dict:
    """
    Classify building surface defects using BD3 taxonomy.
    
    Args:
        image_path: Path to the image file
        image_bytes: Raw image bytes
        mime_type: MIME type of the image
        use_vit: If True, use ViT-patch16 fine-tuned on BD3 (requires model)
        
    Returns:
        BD3-aligned defect classification report with IS 456 references
    """
    if use_vit:
        return await _classify_defects_vit(image_path, image_bytes, mime_type)
    return await _classify_defects_vlm(image_path, image_bytes, mime_type)


async def _classify_defects_vlm(
    image_path: str | Path | None,
    image_bytes: bytes | None,
    mime_type: str,
) -> dict:
    """BD3-guided defect classification via Gemini VLM."""
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

    logger.info("Running BD3-guided defect classification via %s...", VLM_MODEL)
    response = await model.generate_content_async(
        [BD3_CLASSIFICATION_PROMPT, image_part],
        generation_config=genai.GenerationConfig(temperature=0.1, max_output_tokens=4096),
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
            "primary_classification": "normal",
            "confidence": 0.5,
            "all_defects_found": [],
            "surface_condition_score": 100,
            "requires_immediate_action": False,
        }

    # Enrich each defect with BD3 metadata (code references and remediation)
    for defect in result.get("all_defects_found", []):
        cls_name = defect.get("defect_class", "normal")
        defect["code_reference"] = BD3_CODE_REFERENCES.get(cls_name, "")
        defect["remediation"] = BD3_REMEDIATION.get(cls_name, "")
        if "severity" not in defect:
            defect["severity"] = BD3_SEVERITY.get(cls_name, "MEDIUM")

    # Add primary classification metadata
    primary = result.get("primary_classification", "normal")
    result["primary_code_reference"] = BD3_CODE_REFERENCES.get(primary, "")
    result["primary_remediation"] = BD3_REMEDIATION.get(primary, "")
    result["primary_severity"] = BD3_SEVERITY.get(primary, "PASS")

    # Enrich with BD3 metadata
    result["detection_model"] = "gemini-vlm-bd3-guided"
    result["bd3_classes"] = list(BD3_CLASSES.values())
    result["dataset_source"] = "BD3 (3,965 images, 7 classes, ACM BuildSys '24)"
    result["image_filename"] = str(image_path) if image_path else "uploaded_image"

    return result


async def _classify_defects_vit(
    image_path: str | Path | None,
    image_bytes: bytes | None,
    mime_type: str,
) -> dict:
    """
    BD3 defect classification via ViT-patch16 fine-tuned model.
    Requires: pip install torch torchvision
    Model: Fine-tuned ViT-patch16 on BD3 augmented (14,000 images)
    Expected weights at: backend/weights/bd3_vit_patch16.pth
    """
    try:
        import torch
        from torchvision import transforms, models
        from PIL import Image
    except ImportError:
        logger.warning("torch/torchvision not installed, falling back to VLM")
        return await _classify_defects_vlm(image_path, image_bytes, mime_type)

    weights_path = Path(__file__).parent.parent / "weights" / "bd3_vit_patch16.pth"
    if not weights_path.exists():
        logger.warning("BD3 ViT weights not found at %s, falling back to VLM", weights_path)
        return await _classify_defects_vlm(image_path, image_bytes, mime_type)

    # Load model
    model = models.vit_b_16(weights=None)
    model.heads.head = torch.nn.Linear(model.heads.head.in_features, len(BD3_CLASSES))
    model.load_state_dict(torch.load(str(weights_path), map_location="cpu"))
    model.eval()

    # Preprocessing (BD3 paper standard)
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    if image_bytes:
        import io
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    elif image_path:
        img = Image.open(str(image_path)).convert("RGB")
    else:
        raise ValueError("Provide image_path or image_bytes")

    tensor = transform(img).unsqueeze(0)

    with torch.no_grad():
        logits = model(tensor)
        probs = torch.softmax(logits, dim=1)[0]
        pred_idx = int(probs.argmax())
        pred_conf = float(probs[pred_idx])

    cls_name = BD3_CLASSES[pred_idx]

    return {
        "primary_classification": cls_name,
        "confidence": pred_conf,
        "all_defects_found": [{
            "defect_class": cls_name,
            "severity": BD3_SEVERITY.get(cls_name, "MEDIUM"),
            "confidence": pred_conf,
            "location": "Full surface analysis",
            "description": f"Classified as '{cls_name}' with {pred_conf:.1%} confidence",
            "code_reference": BD3_CODE_REFERENCES.get(cls_name, ""),
            "remediation": BD3_REMEDIATION.get(cls_name, ""),
            "affected_area_percent": None,
        }],
        "class_probabilities": {BD3_CLASSES[i]: round(float(probs[i]), 4) for i in range(len(BD3_CLASSES))},
        "surface_condition_score": 100 if cls_name == "normal" else max(10, int(100 - pred_conf * 80)),
        "requires_immediate_action": cls_name in ("major_crack", "spalling"),
        "primary_code_reference": BD3_CODE_REFERENCES.get(cls_name, ""),
        "primary_remediation": BD3_REMEDIATION.get(cls_name, ""),
        "primary_severity": BD3_SEVERITY.get(cls_name, "PASS"),
        "detection_model": "vit-patch16-bd3-finetuned",
        "bd3_classes": list(BD3_CLASSES.values()),
        "dataset_source": "BD3 (14,000 augmented images, 7 classes, F1=0.9879)",
        "image_filename": str(image_path) if image_path else "uploaded_image",
    }
