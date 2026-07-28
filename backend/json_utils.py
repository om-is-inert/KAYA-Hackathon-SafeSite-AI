"""
SafeSite AI — Shared JSON Utilities
Resilient JSON parsing for Gemini VLM responses that may contain
unescaped quotes in measurement values (e.g. 2'-4") or be truncated.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


def repair_json(text: str) -> str:
    """Best-effort repair of common Gemini JSON issues (unescaped quotes in
    measurement values like  2'-4"  and truncated responses)."""
    # Replace inch-mark patterns with a safe text equivalent
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


def parse_gemini_json(raw_text: str, fallback: dict[str, Any] | None = None) -> dict[str, Any]:
    """Multi-pass JSON parser with repair for Gemini responses.

    Args:
        raw_text: Raw response text from Gemini.
        fallback: Dict to return if all parse attempts fail. If None, raises ValueError.
    """
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```json\s*|^```\s*|```$", "", cleaned, flags=re.MULTILINE).strip()

    # First pass: try as-is
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Second pass: try to repair common Gemini quirks
    repaired = repair_json(cleaned)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        pass

    # Third pass: extract the outermost { ... } and repair that
    json_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if json_match:
        fragment = repair_json(json_match.group())
        try:
            return json.loads(fragment)
        except json.JSONDecodeError:
            pass

    logger.error("All JSON parse attempts failed. Raw response:\n%s", raw_text[:2000])
    if fallback is not None:
        return fallback
    raise ValueError(f"Gemini did not return valid JSON. Raw response:\n{raw_text}")
