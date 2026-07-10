# SafeSite AI — Technical Validation Report

**Verification status: All 3 engines confirmed operational end-to-end on real construction data, with a validated cross-layer feedback loop.**

This document summarizes results from live system testing conducted ahead of demo — real blueprint imagery, real construction photographs, real Gemini API inference, no mocked or hardcoded outputs.

---

## System Overview

SafeSite AI is a three-layer construction intelligence platform where each layer's output feeds forward into the next, forming a closed loop rather than three independent tools:

```
Layer 1 (Compliance) → Layer 2 (Vision) → Layer 3 (Foresight) → recalculates → feeds back
```

The results below demonstrate this loop is not just architected but functionally verified: a change in Layer 1/2 output measurably and correctly changes Layer 3's risk output in real time.

---

## Layer 1 — Compliance Engine

**Pipeline:** Blueprint image → VLM spatial extraction (Gemini) → RAG retrieval against National Building Code 2016 Part IV (ChromaDB + bge-large-en-v1.5) → automated cross-reference against retrieved code clauses.

**Verified capabilities:**
- Accurately extracted labeled spatial measurements from a floor plan (hallway width, door width, staircase width) with correct units
- RAG retrieval correctly surfaced the relevant code section for the query — NBC 2016 Part IV §4.4.2.4.3 (Staircases) and central corridor/exit provisions — from a full-length regulatory PDF, not a curated snippet
- Automated cross-reference correctly flagged violations against retrieved code text with severity grading and citations

**Result:** 2 violations identified · Compliance score: 65/100

---

## Layer 2 — Vision Engine

### Defect Detection

**Pipeline:** Site photograph → zero-shot VLM defect analysis against a defined structural defect taxonomy (cracking, spalling, honeycombing, exposed rebar, formwork misalignment).

**Result:** 3 defects identified, correctly typed and severity-graded:

| Defect | Severity | Confidence |
|---|---|---|
| Spalling | CRITICAL | 1.00 |
| Exposed/Rusted Rebar | CRITICAL | 1.00 |
| Honeycombing | HIGH | 0.95 |

### PPE & Site Safety Audit (SH17-guided)

**Pipeline:** Site photograph → zero-shot VLM safety audit against the SH17 PPE taxonomy (17 classes, mapped to Indian code requirements).

**Result:** Site safety score 25/100, 3 code-referenced violations identified:
- Missing scaffold guardrails — CRITICAL (NBC 2016 Part IV §4.4.2.1)
- No fall-arrest protection at height — CRITICAL (NBC 2016 Part IV §4.4.1.6)
- Exposed rebar / laceration hazard — HIGH (NBC 2016 Part IV §4.4.3.1)

---

## Layer 3 — Foresight Engine & Cross-Layer Feedback Loop

**Pipeline:** Monte Carlo simulation (10,000 iterations, triangular delay distributions across rework, weather, supply chain, and labor risk) → linear-programming-based resource reallocation, automatically re-triggered whenever Layer 1 or Layer 2 produces new findings.

**This is the result that matters most: proof the system is one interconnected loop, not three separate tools.**

| System state | On-time completion probability |
|---|---|
| Baseline (no findings yet) | 100% |
| After Layer 1 compliance scan (2 violations) | **93.7%** |
| After Layer 2 defect scan (+3 defects, incl. 2 critical) | **2.7%** |

The probability recalculated automatically and correctly in response to new input from upstream layers — without any manual trigger or page refresh — confirming the feedback loop is functionally real, not a static diagram.

---

## Engineering Notes — Scope & Roadmap

We believe transparency about implementation stage is a strength, not a weakness. Here is exactly what is functional today versus what represents the production roadmap:

| Component | Current implementation | Production roadmap |
|---|---|---|
| Layer 1 spatial extraction & compliance | Fully functional, VLM zero-shot (Gemini) | Same approach scales directly; would add fine-tuned extraction for CAD-native files |
| Layer 2 defect/PPE detection | Fully functional, VLM zero-shot (Gemini) | Fine-tuned YOLOv11-seg / SAM2 on CODEBRIM/SH17 datasets for pixel-level masks; fallback architecture already in place in code |
| Layer 3 resource optimizer | Functional, linear-programming-based (`scipy.optimize.linprog`) | Full MILP formulation with integer day-allocation and multi-resource concurrent scheduling constraints |
| Layer 3 risk model | Functional Monte Carlo simulation on seeded project data | Live integration with CIDC cost indices and project-specific historical data |

---

## Validation Methodology

All results above were produced by an automated end-to-end test exercising the real API surface — blueprint upload through Gemini extraction, live ChromaDB retrieval against ingested code PDFs, live compliance/defect/PPE inference, and live feedback-loop recalculation. No step was mocked, stubbed, or hand-computed.
