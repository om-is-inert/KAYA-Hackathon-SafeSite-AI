"""
SafeSite AI — Layer 1 — Compliance Checker
Agentic reasoning loop: cross-references VLM-extracted spatial data
against RAG-retrieved code clauses.
"""

from __future__ import annotations

import json
import logging
import re
import uuid

import google.generativeai as genai

from backend.config import GEMINI_API_KEY, VLM_MODEL
from backend.models import ComplianceResult, Severity, SpatialElement, Violation

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
    return {"violations": [], "compliance_score": 0}


COMPLIANCE_CHECK_PROMPT = (
    "You are a senior building compliance auditor AI. You have:\n"
    "1. Extracted spatial data from a blueprint (JSON).\n"
    "2. Relevant building code requirements from NBC 2016 & IS 456:2000.\n\n"
    "Spatial Data:\n{spatial_data}\n\n"
    "Code Requirements:\n{rag_context}\n\n"
    "Compare EVERY measurement against code requirements. Flag deviations.\n"
    "Severity: CRITICAL (life safety), HIGH (major violation), "
    "MEDIUM (minor deviation), LOW (best practice).\n\n"
    "Return ONLY valid JSON:\n"
    '{{"violations": [{{"id":"V001","exact_location":"...","measured_value":"...",'
    '"required_value":"...","code_reference":"...","severity":"CRITICAL",'
    '"fix_suggestion":"...","category":"fire_safety"}}],'
    '"compliance_score": 65,'
    '"summary": "..."}}'
)


async def check_compliance(
    spatial_data: dict,
    rag_results: list[dict],
    codes_checked: list[str] | None = None,
) -> ComplianceResult:
    if codes_checked is None:
        codes_checked = ["NBC 2016 Part IV", "IS 456:2000"]

    rag_context = ""
    for i, r in enumerate(rag_results, 1):
        rag_context += (
            f"\n--- Section {i} ---\n"
            f"Source: {r.get('source','')}\n"
            f"Section: {r.get('section','')}\n"
            f"Text: {r.get('text','')}\n"
        )
    if not rag_context.strip():
        rag_context = "No specific sections retrieved. Use NBC 2016 Part IV and IS 456:2000 knowledge."

    prompt = COMPLIANCE_CHECK_PROMPT.format(
        spatial_data=json.dumps(spatial_data, indent=2),
        rag_context=rag_context,
    )

    import asyncio
    from google.api_core.exceptions import ResourceExhausted

    model = genai.GenerativeModel(VLM_MODEL)
    logger.info("Running compliance check with %d RAG results...", len(rag_results))

    for attempt in range(3):
        try:
            response = await model.generate_content_async(
                prompt,
                generation_config=genai.GenerationConfig(temperature=0.2, max_output_tokens=8192, response_mime_type="application/json"),
            )
            break
        except ResourceExhausted:
            if attempt == 2:
                raise
            logger.warning(f"Gemini API rate limit hit. Waiting 35 seconds before retry (Attempt {attempt + 1}/3)...")
            await asyncio.sleep(35)

    raw_text = response.text.strip()
    if raw_text.startswith("```"):
        lines = raw_text.split("\n")
        raw_text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])

    result_data = _parse_gemini_json(raw_text)

    violations = []
    for v in result_data.get("violations", []):
        try:
            sev = Severity(v.get("severity", "MEDIUM").upper())
        except ValueError:
            sev = Severity.MEDIUM
        violations.append(Violation(
            id=v.get("id", f"V{uuid.uuid4().hex[:6].upper()}"),
            exact_location=v.get("exact_location", "Unknown"),
            measured_value=v.get("measured_value", "N/A"),
            required_value=v.get("required_value", "N/A"),
            code_reference=v.get("code_reference", ""),
            severity=sev,
            fix_suggestion=v.get("fix_suggestion", ""),
            category=v.get("category", "general"),
        ))

    elements = []
    for room in spatial_data.get("rooms", []):
        elements.append(SpatialElement(
            element_type="room", name=room.get("name", "Unknown"),
            measurements={"length_m": room.get("length_m"), "width_m": room.get("width_m"), "area_sqm": room.get("area_sqm")},
        ))

    crit = sum(1 for v in violations if v.severity == Severity.CRITICAL)
    high = sum(1 for v in violations if v.severity == Severity.HIGH)
    med = sum(1 for v in violations if v.severity == Severity.MEDIUM)
    low = sum(1 for v in violations if v.severity == Severity.LOW)

    return ComplianceResult(
        total_violations=len(violations), critical_count=crit, high_count=high,
        medium_count=med, low_count=low, violations=violations,
        spatial_elements=elements,
        compliance_score=result_data.get("compliance_score", max(0, 100 - crit*20 - high*10 - med*5)),
        raw_extraction=spatial_data, codes_checked=codes_checked,
    )
