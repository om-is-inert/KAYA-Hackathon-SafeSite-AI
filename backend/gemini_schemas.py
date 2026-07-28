"""
SafeSite AI — Gemini Response Schemas
Typed response_schema definitions for each Gemini VLM call.
These are passed alongside response_mime_type="application/json" to
enforce shape at the API level and prevent schema drift.

NOTE: The deprecated google.generativeai SDK accepts response_schema
as a plain dict (JSON Schema-style mapping), NOT a Pydantic model.

WARNING: Not currently used — causes hallucination loops under google.generativeai 
when combined with image payloads. Do not wire in until migrated to google.genai.
"""

# ── Layer 1: Blueprint spatial extraction ──────────────────────────
SPATIAL_EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "rooms": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "label": {"type": "string"},
                    "length": {},  # nullable — accepts string or number
                    "width": {},
                    "unit": {"type": "string"},
                    "area": {},
                },
                "required": ["label"],
            },
        },
        "hallways": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "label": {"type": "string"},
                    "width": {},
                    "length": {},
                    "unit": {"type": "string"},
                },
                "required": ["label"],
            },
        },
        "doors": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"},
                    "width": {},
                    "unit": {"type": "string"},
                    "swing_direction": {"type": "string"},
                },
                "required": ["location"],
            },
        },
        "staircases": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"},
                    "width": {},
                    "unit": {"type": "string"},
                    "riser_count": {},
                    "riser_height": {},
                },
                "required": ["location"],
            },
        },
        "windows": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"},
                    "width": {},
                    "unit": {"type": "string"},
                },
                "required": ["location"],
            },
        },
        "exits": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"},
                    "distance_to_next_exit": {},
                    "unit": {"type": "string"},
                },
                "required": ["location"],
            },
        },
        "structural_elements": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string"},
                    "location": {"type": "string"},
                    "thickness": {},
                    "unit": {"type": "string"},
                },
                "required": ["type", "location"],
            },
        },
        "notes": {"type": "string"},
    },
    "required": ["rooms", "hallways", "doors", "staircases", "windows",
                 "exits", "structural_elements", "notes"],
}

# ── Layer 1: Compliance check ──────────────────────────────────────
COMPLIANCE_CHECK_SCHEMA = {
    "type": "object",
    "properties": {
        "violations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "exact_location": {"type": "string"},
                    "measured_value": {"type": "string"},
                    "required_value": {"type": "string"},
                    "code_reference": {"type": "string"},
                    "severity": {"type": "string", "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"]},
                    "fix_suggestion": {"type": "string"},
                    "category": {"type": "string"},
                },
                "required": ["id", "exact_location", "severity"],
            },
        },
        "compliance_score": {"type": "number"},
        "summary": {"type": "string"},
    },
    "required": ["violations", "compliance_score"],
}

# ── Layer 2: Defect detection ──────────────────────────────────────
DEFECT_DETECTION_SCHEMA = {
    "type": "object",
    "properties": {
        "defects": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "defect_type": {"type": "string"},
                    "severity": {"type": "string", "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"]},
                    "confidence": {"type": "number"},
                    "location": {"type": "string"},
                    "description": {"type": "string"},
                    "code_reference": {"type": "string"},
                    "remediation": {"type": "string"},
                    "bounding_box": {
                        "type": "object",
                        "properties": {
                            "x": {"type": "number"},
                            "y": {"type": "number"},
                            "w": {"type": "number"},
                            "h": {"type": "number"},
                        },
                    },
                },
                "required": ["defect_type", "severity", "confidence"],
            },
        },
        "overall_condition": {"type": "string"},
        "estimated_repair_cost": {"type": "string"},
        "estimated_repair_time": {"type": "string"},
    },
    "required": ["defects", "overall_condition"],
}

# ── Layer 2: BD3 defect classifier ─────────────────────────────────
BD3_CLASSIFICATION_SCHEMA = {
    "type": "object",
    "properties": {
        "primary_classification": {"type": "string"},
        "confidence": {"type": "number"},
        "all_defects_found": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "defect_class": {"type": "string"},
                    "severity": {"type": "string", "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW", "PASS"]},
                    "confidence": {"type": "number"},
                    "location": {"type": "string"},
                    "description": {"type": "string"},
                    "affected_area_percent": {"type": "number"},
                },
                "required": ["defect_class", "severity", "confidence"],
            },
        },
        "surface_condition_score": {"type": "number"},
        "requires_immediate_action": {"type": "boolean"},
        "inspection_summary": {"type": "string"},
    },
    "required": ["primary_classification", "confidence", "all_defects_found",
                 "surface_condition_score", "requires_immediate_action"],
}

# ── Layer 2: PPE / site safety ─────────────────────────────────────
PPE_DETECTION_SCHEMA = {
    "type": "object",
    "properties": {
        "total_workers": {"type": "integer"},
        "site_safety_score": {"type": "number"},
        "workers": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "ppe_worn": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "ppe_missing": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "location": {"type": "string"},
                    "compliance_status": {"type": "string"},
                },
                "required": ["id", "ppe_worn", "ppe_missing"],
            },
        },
        "site_level_violations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "violation": {"type": "string"},
                    "severity": {"type": "string"},
                    "code_reference": {"type": "string"},
                },
                "required": ["violation", "severity"],
            },
        },
    },
    "required": ["total_workers", "site_safety_score", "workers"],
}
