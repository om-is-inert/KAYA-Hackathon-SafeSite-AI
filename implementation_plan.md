# 🏗️ SafeSite AI v3 — 3-Layer Construction Intelligence Platform
## Compliance Engine + Vision Engine + Foresight Engine
### KAYA Hackathon · Track 4: Open Innovation

---

## Core Differentiator: The Interconnected Loop

```
Compliance Engine flags design flaws
        ↓
Vision Engine identifies as-built defects
        ↓
Foresight Engine recalculates schedule/cost/risk and re-optimizes resources
        ↓ (feeds back)
Compliance Engine re-validates against updated constraints
```

> **IMPORTANT:** This closed-loop feedback system is what separates SafeSite AI from three unrelated demos bolted together. Every defect or violation detected by one layer automatically triggers recalculation in the others. This is the **single most important idea** to nail in the proposal, deck, and video.

---

## Product Architecture — The 3-Layer System

| Layer | Phase | Core Question | Core Technique |
|---|---|---|---|
| **Layer 1 — Compliance Engine** | Pre-construction | "Is this design legal?" | VLM (blueprint parsing) + RAG (building codes) |
| **Layer 2 — Vision Engine** | Active build | "Does reality match the design?" | Point cloud instance segmentation (BIM-Net++) + YOLO defect detection |
| **Layer 3 — Foresight Engine** | Continuous | "What will happen next, and what should we do?" | Time-series forecasting + Bayesian risk modeling + MILP optimization |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5 + Vanilla CSS + JavaScript (dark mode, glassmorphism) |
| **Backend** | Python 3.10+ / FastAPI / Uvicorn |
| **VLM** | Google Gemini 2.5 Flash (blueprint parsing + defect analysis) |
| **Embeddings** | `bge-large-en-v1.5` (BAAI) via `sentence-transformers` |
| **Vector Store** | ChromaDB (section-aware chunks with metadata) |
| **PDF Parsing** | PyMuPDF (`fitz`) |
| **Point Cloud Segmentation** | BIM-Net++ (pretrained on HePIC dataset) |
| **Defect Detection** | YOLOv11-seg / SAM 2 (fine-tuned on CODEBRIM + CONCORDE) |
| **Time-Series** | Prophet / XGBoost / Temporal Fusion Transformer (TFT) |
| **Risk Modeling** | Monte Carlo simulation / Bayesian Belief Network |
| **Optimization** | SciPy `linprog` / `milp` (or Gurobi if available) |
| **Reports** | fpdf2 for downloadable PDF reports |
| **Font** | Inter (Google Fonts) |

---

## Datasets & Models Reference

| Purpose | Dataset | Model to Train/Use |
|---|---|---|
| Blueprint parsing | FloorPlanCAD, MSD (Modified Swiss Dwellings), CubiASA | VLM API (Gemini 2.5 Flash) zero-shot; or fine-tune PaliGemma/LLaVA-1.6 if local |
| Building codes (text) | NBC India 2016 Part IV, IS 456:2000, local RERA/DCR docs, fire codes | RAG: ChromaDB + `bge-large-en-v1.5` embeddings |
| Point cloud → BIM labels | HePIC dataset | BIM-Net++ (pretrained weights available) |
| Concrete cracks / rust | CODEBRIM, CONCORDE + custom collected | YOLOv11-seg or SAM 2 (fine-tuned) |
| PPE / safety hazards (stretch) | Roboflow "Hard Hat Workers" / PPE Detection | YOLOv8 (pretrained) |
| Cost / logistics forecasting | Public construction cost datasets (Kaggle), CIDC Construction Cost Indices | Prophet / XGBoost / TFT |

---

## Layer 1 — Compliance Engine (Design Phase)

### What It Does
1. User uploads a **floor plan / blueprint** (PDF, image, or CAD export)
2. User selects which codes to check against (NBC 2016, IS 456, or uploads custom)
3. VLM **extracts spatial data** from the blueprint — room dimensions, corridor widths, door widths, egress paths, staircase widths, window sizes
4. RAG pipeline **retrieves relevant code requirements** — embeds NBC/IS 456 text into ChromaDB, retrieves matching clauses
5. **Agentic reasoning loop** cross-references extracted spatial data against retrieved code clauses
6. Output: Flagged violations with **exact location, measurement vs. requirement, code citation, severity, and fix suggestion**

### VLM Prompt Strategy (Two-Step)

```
STEP 1 — Spatial Extraction:
"Analyze this architectural blueprint/floor plan. Extract ALL:
- Room names, dimensions (length × width), areas
- Hallway/corridor widths
- Door positions, swing direction, widths
- Staircase locations, widths, riser heights
- Window positions and approximate sizes
- Exit locations and distances between them
- Fire escape routes
- Structural elements (columns, beams, walls with thickness)
Return as structured JSON."

STEP 2 — Compliance Check (with RAG context):
"Given these extracted measurements: {spatial_data}
And these building code requirements: {rag_results}
Identify ALL violations. For each, specify:
- exact_location: where on the blueprint
- measured_value: what the blueprint shows
- required_value: what the code mandates
- code_reference: section number and excerpt
- severity: CRITICAL / HIGH / MEDIUM / LOW
- fix_suggestion: how to resolve"
```

### Example Violations Detected

| What VLM Extracts | Code Requirement | Violation |
|---|---|---|
| Hallway width: 3ft | NBC requires 4ft for fire escape corridor | ❌ "Hallway B2 is 3ft wide, code §4.3.2 requires minimum 4ft" |
| Exit door opens inward | NBC requires outward-opening exits | ❌ "Main exit door opens inward, violates §4.4.1" |
| Staircase width: 0.9m | IS 456 requires min 1.2m for buildings > 15m | ❌ "Staircase S1 is 0.9m, code requires 1.2m" |
| No fire escape on floor 3 | NBC requires 2 exits for floors > 500 sq.m | ❌ "Floor 3 has only 1 exit, code requires 2" |
| Room has no window | NBC requires ventilation opening ≥ 10% floor area | ❌ "Room R4 has no ventilation opening" |

### RAG Knowledge Base Pipeline

```
NBC2016-Part-IV.pdf ──► PyMuPDF ──► Section-aware chunking ──► bge-large-en-v1.5 ──► ChromaDB
is.456.2000.pdf ────►                (500 tokens, 100 overlap)
```

**Chunking Strategy:**
- Split at section headers (§, Clause, Chapter)
- Preserve tables with full context
- Metadata per chunk: `source_doc`, `section_number`, `section_title`, `page`, `category`

### Stage 1 Scope
> Zero-shot proof of concept — feed 5–10 sample blueprints into Gemini 2.5 Flash and demonstrate extraction + flagging logic works. RAG pipeline with ChromaDB operational but not production-hardened.

---

## Layer 2 — Vision Engine (Active Build Phase)

### What It Does
1. User uploads **drone/phone footage** or **photogrammetry point clouds** + source-of-truth **3D BIM file**
2. **BIM-Net++** performs instance segmentation on the point cloud — labels structural elements (walls, columns, slabs, beams)
3. **YOLOv11-seg / SAM 2** detects surface-level defects (cracks, spalling, honeycombing, exposed rebar, rust) with pixel-level masks
4. **Alignment algorithm** overlays segmented as-built data against the BIM file to compute deviation (mm-level where possible)
5. Output: **Deviation report** + **defect severity/location**, tied to the specific BIM element

### Point Cloud Instance Segmentation (BIM-Net++)
- **Paper:** BIM-Net++ — point cloud instance segmentation pretrained on HePIC dataset
- **Input:** Raw, unstructured 3D point cloud scans from photogrammetry or LiDAR
- **Output:** Labeled structural elements with class + instance ID
- **Classes:** Walls, columns, slabs, beams, doors, windows, stairs, MEP elements

### Defect Detection (YOLOv11-seg / SAM 2)

| Defect | What Model Detects | Code Reference | Severity Trigger |
|--------|-------------------|----------------|-----------------|
| Concrete cracks | Hairline, structural, or settlement cracks | IS 456 §35.3 | Width > 0.3mm = HIGH |
| Honeycombing | Voids in concrete surface | IS 456 §14 | Area > 100cm² = CRITICAL |
| Exposed/rusted rebar | Visible reinforcement steel | IS 456 §26.4 (cover requirements) | Any = HIGH |
| Formwork misalignment | Non-plumb walls, uneven slabs | IS 456 §12 | Deviation > 5mm = HIGH |
| Improper curing signs | Dry patches, surface crazing | IS 456 §13.5 | — |
| Spalling | Chipped/flaking concrete | IS 456 §35.3 | Depth > 10mm = CRITICAL |

### BIM Deviation Alignment
- **Method:** ICP (Iterative Closest Point) or feature-based registration
- **Output per element:** Measured position vs. BIM-specified position, deviation in mm
- **Threshold:** Flag elements with deviation > tolerance (configurable, default 10mm)

### Stage 1 Scope
> Cite BIM-Net++ paper and pretrained weights explicitly; show sample output (screenshot or short clip) of segmentation on a public point cloud sample. Use VLM (Gemini) for defect detection on uploaded site photos as a zero-shot fallback. Full YOLOv11-seg retraining and BIM alignment are Stage 2 tasks.

---

## Layer 3 — Foresight Engine (Continuous Operations)

### What It Does
1. Ingests **historical cost/logistics data**, **live defect/compliance flags** from Layers 1–2, and **weather/commodity feeds**
2. **Time-series forecasting** predicts material lead-times and price volatility
3. **Bayesian / Monte Carlo risk modeling** computes probabilistic delay and completion estimates
4. **MILP resource optimization** triggers automatically when Layer 2 flags a defect requiring rework
5. Output: **Updated probability-weighted schedule**, **reallocated resource plan**, **cost variance estimate**

### Time-Series Forecasting
- **Models:** Prophet (baseline), XGBoost (feature-rich), Temporal Fusion Transformer (TFT, if data allows)
- **Targets:** Material lead-time, material price, labor availability, weather impact
- **Features:** Historical cost data, CIDC Construction Cost Indices, commodity feeds, seasonal patterns

### Bayesian Risk Modeling
- **Method:** Monte Carlo simulation (10,000+ iterations) or Bayesian Belief Network
- **Output format:** Probabilistic schedule, e.g.:
  - "82% probability of on-time completion"
  - "14% risk of 3-week delay (triggered by rebar supply chain disruption)"
  - "4% risk of >6-week delay (weather + material compounding)"
- **Inputs from other layers:**
  - Layer 1 compliance violations → rework probability
  - Layer 2 defect severity → repair time + cost estimates

### MILP Resource Re-Optimization
- **Tool:** `scipy.optimize.milp` or Gurobi (if available)
- **Trigger:** Layer 2 flags a defect requiring rework
- **Objective:** Minimize total project cost subject to:
  - Resource availability constraints
  - Precedence constraints (task dependencies)
  - Updated time estimates from defect rework
- **Output:** Reallocated crew assignments, updated procurement schedule, revised milestones

### Stage 1 Scope
> Describe the models and show a simple illustrative simulation — an interactive toy notebook or dashboard mockup demonstrating the probabilistic output format. Use synthetic data to show Monte Carlo probability distributions and a sample MILP optimization result.

---

## The Interconnected Feedback Loop (In Detail)

### Data Flow Between Layers

| From → To | What Flows | Trigger |
|-----------|-----------|---------|
| L1 → L2 | List of compliance violations with locations | New blueprint analyzed |
| L1 → L3 | Estimated rework scope from violations found pre-build | Violation count/severity changes |
| L2 → L3 | Defect type, severity, estimated repair cost/time | New defect detected |
| L2 → L3 | BIM deviation per element (mm) | New scan processed |
| L3 → L1 | Updated budget/timeline constraints | Schedule/cost recalculated |
| L3 → L2 | Priority zones for next inspection | Risk score updated |

---

## API Endpoints

```
# Layer 1 — Compliance Engine
POST   /api/v1/compliance/analyze         — Upload blueprint + select codes → violations
POST   /api/v1/compliance/codes/upload    — Upload custom building code PDF
GET    /api/v1/compliance/codes/list      — Available building codes
GET    /api/v1/compliance/report/{id}/pdf — Download compliance PDF report

# Layer 2 — Vision Engine
POST   /api/v1/vision/defect/analyze      — Upload site photo → defect report
POST   /api/v1/vision/pointcloud/segment  — Upload point cloud → labeled elements
POST   /api/v1/vision/bim/compare         — Upload scan + BIM → deviation report
GET    /api/v1/vision/report/{id}/pdf     — Download vision report

# Layer 3 — Foresight Engine
POST   /api/v1/foresight/forecast         — Run time-series forecast
POST   /api/v1/foresight/risk             — Run Monte Carlo risk simulation
POST   /api/v1/foresight/optimize         — Trigger MILP resource optimization
GET    /api/v1/foresight/dashboard        — Current project risk dashboard data

# Cross-Layer
GET    /api/v1/project/{id}/status        — Unified project health view
POST   /api/v1/project/{id}/loop/trigger  — Manually trigger feedback loop
```

---

## Frontend — Three-Tab Dashboard

### Design System
- **Theme:** Dark mode with glassmorphism cards
- **Color coding:** 🔴 Critical → 🟠 High → 🟡 Medium → 🟢 Pass
- **Font:** Inter (Google Fonts)
- **Animations:** Scanning effect on analysis, smooth transitions, micro-interactions
- **Layout:** Full-width dashboard with sidebar navigation

### Tab 1: Compliance Engine
- Upload zone for floor plan (PDF / image / CAD export)
- Code selection checkboxes (NBC 2016 ✓, IS 456 ✓, custom ✓)
- **Main view:** Blueprint image with violation markers overlaid (color-coded by severity)
- **Side panel:** Violation cards — severity badge, measurement vs. requirement, code reference, fix suggestion
- Download compliance report button (PDF)

### Tab 2: Vision Engine
- Upload zone for site photos / point cloud files
- **Main view:** Photo with defect regions highlighted (bounding boxes + masks)
- **Secondary view:** 3D point cloud viewer with labeled elements (Three.js)
- **Side panel:** Defect cards — type, severity, IS 456 reference, remediation steps
- BIM deviation overlay toggle

### Tab 3: Foresight Engine
- **Main view:** Gantt chart with probabilistic completion ranges
- **Charts:** Monte Carlo probability distribution, cost variance waterfall, risk heatmap
- **Resource panel:** Current allocation vs. optimized allocation comparison
- **Alerts:** Auto-triggered warnings when Layer 2 flags trigger schedule changes
- Interactive "what-if" scenario slider

### Unified Header
- Project health score (composite of all 3 layers)
- Active alerts count (violations + defects + risks)
- Last scan timestamp
- Feedback loop status indicator (animated when active)

---

## File Structure

```
KAYA Hackathon/
├── backend/
│   ├── main.py                      # FastAPI entry point
│   ├── config.py                    # Settings, env vars, model paths
│   ├── models.py                    # Pydantic schemas (shared)
│   │
│   ├── layer1_compliance/
│   │   ├── __init__.py
│   │   ├── blueprint_analyzer.py    # VLM spatial extraction
│   │   ├── knowledge_base.py        # RAG pipeline (ChromaDB + bge-large)
│   │   └── compliance_checker.py    # Agentic reasoning loop
│   │
│   ├── layer2_vision/
│   │   ├── __init__.py
│   │   ├── defect_detector.py       # YOLOv11-seg / SAM 2 / VLM fallback
│   │   ├── pointcloud_segmenter.py  # BIM-Net++ wrapper
│   │   └── bim_aligner.py           # ICP deviation alignment
│   │
│   ├── layer3_foresight/
│   │   ├── __init__.py
│   │   ├── forecaster.py            # Prophet / XGBoost / TFT
│   │   ├── risk_modeler.py          # Monte Carlo / Bayesian
│   │   └── optimizer.py             # MILP resource optimization
│   │
│   ├── feedback_loop.py             # Cross-layer orchestration
│   ├── report_generator.py          # PDF report generation (fpdf2)
│   └── requirements.txt
│
├── frontend/
│   ├── index.html                   # Main dashboard shell
│   ├── css/
│   │   └── styles.css               # Design system (dark mode, glassmorphism)
│   └── js/
│       ├── app.js                   # Router, tab switching, shared state
│       ├── compliance.js            # Tab 1: blueprint upload + violations
│       ├── vision.js                # Tab 2: defect detection + point cloud viewer
│       └── foresight.js             # Tab 3: forecasting + risk dashboard
│
├── data/
│   ├── sample_blueprints/           # 5-10 sample floor plans for demo
│   ├── sample_site_photos/          # Site photos for defect detection demo
│   ├── sample_pointclouds/          # Public point cloud samples
│   └── synthetic_cost_data/         # Synthetic data for Foresight Engine demo
│
├── models/
│   ├── bimnet_weights/              # BIM-Net++ pretrained weights (Stage 2)
│   └── yolo_weights/               # YOLOv11-seg fine-tuned weights (Stage 2)
│
├── Info on construction/            # Building Code PDFs (NBC 2016, IS 456)
│   ├── NBC2016-Part-IV.pdf
│   └── is.456.2000.pdf
│
├── notebooks/
│   ├── layer1_poc.ipynb             # Compliance Engine proof of concept
│   ├── layer2_poc.ipynb             # Vision Engine proof of concept
│   └── layer3_poc.ipynb             # Foresight Engine simulation demo
│
├── implementation_plan.md           # This file
├── README.md
├── .gitignore
└── .env                             # API keys (gitignored)
```

---

## Build Phases

### Stage 1 — Hackathon MVP (Target: ~18-22 hours)

| Phase | Time | Layer | Deliverable |
|-------|------|-------|------------|
| **1. RAG Knowledge Base** | 2-3h | L1 | Parse NBC/IS 456 PDFs → ChromaDB with bge-large-en-v1.5 embeddings |
| **2. Blueprint Compliance Engine** | 3-4h | L1 | VLM spatial extraction + agentic compliance checking with RAG |
| **3. Defect Detection (VLM fallback)** | 1-2h | L2 | Gemini-based defect analysis on site photos (zero-shot) |
| **4. Foresight Simulation** | 2-3h | L3 | Monte Carlo simulation + simple MILP demo with synthetic data |
| **5. Feedback Loop Wiring** | 1-2h | All | Cross-layer data flow: violations → defect priorities → schedule updates |
| **6. FastAPI Backend** | 2-3h | All | API endpoints for all three layers |
| **7. Frontend Dashboard** | 4-5h | All | Three-tab dashboard with visualizations |
| **8. PDF Reports** | 1h | All | Downloadable compliance + defect + risk reports |
| **9. Polish & Demo** | 1-2h | All | Animations, demo script rehearsal, video |
| **Total** | **~18-22h** | | |

### Stage 2 — Post-Hackathon (Production)

| Task | Layer | Description |
|------|-------|-------------|
| BIM-Net++ integration | L2 | Download pretrained weights, build inference pipeline on HePIC |
| YOLOv11-seg fine-tuning | L2 | Train on CODEBRIM + CONCORDE for crack/spalling detection |
| SAM 2 integration | L2 | Pixel-level defect masks for area calculation |
| BIM alignment pipeline | L2 | ICP-based registration, deviation computation |
| TFT forecasting | L3 | Train Temporal Fusion Transformer on real construction cost data |
| Bayesian Belief Network | L3 | Full probabilistic risk graph with conditional dependencies |
| Gurobi optimization | L3 | Production-grade MILP with real constraint sets |
| Production RAG | L1 | Multi-doc ingestion, reranking, hybrid search |
| Auth + multi-tenancy | All | User accounts, project management, role-based access |

---

## Requirements

```txt
# Core
fastapi==0.115.0
uvicorn==0.30.0
python-multipart==0.0.9
pydantic==2.8.0
python-dotenv==1.0.0

# Layer 1 — Compliance Engine
google-generativeai==0.8.0
chromadb==0.5.0
sentence-transformers==3.0.0
pymupdf==1.24.0

# Layer 2 — Vision Engine (Stage 1: VLM fallback only)
pillow==10.4.0
# Stage 2 additions:
# ultralytics>=8.2.0       # YOLOv11-seg
# open3d>=0.18.0           # Point cloud processing
# trimesh>=4.0.0           # BIM mesh handling

# Layer 3 — Foresight Engine
numpy>=1.26.0
pandas>=2.2.0
scipy>=1.13.0
prophet==1.1.5
# xgboost>=2.0.0           # Optional: gradient-boosted forecasting
# pytorch-forecasting       # Optional: TFT (Stage 2)

# Reports
fpdf2==2.8.0

# Visualization (for notebooks)
matplotlib>=3.9.0
plotly>=5.22.0
```

---

## Demo Script (4 min)

### 1. Hook (30s)
> "A measurement error on a blueprint costs $50K in rework. A crack detected too late? Millions. What if one AI platform caught design flaws before construction, detected defects during construction, and predicted schedule risks before they happen — in a single, interconnected loop?"

### 2. Layer 1 — Compliance Engine (60s)
> Upload sample floor plan → scanning animation → violations appear as markers on the blueprint → click violation → "Hallway B is 3ft wide, NBC §4.3.2 requires 4ft for fire escape" → show code reference panel → highlight severity distribution

### 3. Layer 2 — Vision Engine (60s)
> Upload site photo → defect detection animation → cracks highlighted with masks → "This honeycomb pattern indicates insufficient vibration, violating IS 456 §14" → show severity + remediation → briefly show point cloud viewer (if BIM-Net++ ready)

### 4. Layer 3 — Foresight Engine (45s)
> Show dashboard → Monte Carlo probability chart → "82% on-time, 14% risk of 3-week delay due to rebar supply" → trigger optimization → watch resource reallocation animate → cost variance waterfall

### 5. The Loop (30s)
> "Here's what makes SafeSite different. Watch:" → Layer 2 flags new defect → Foresight Engine automatically recalculates → schedule shifts → new risk alert → compliance re-validates → all three panels update in sync

### 6. Close (15s)
> "Three layers. One loop. Zero blind spots. SafeSite AI."

---

## Environment Variables

```env
# .env file (gitignored)
GEMINI_API_KEY=your_google_ai_studio_key_here
CHROMA_PERSIST_DIR=./data/chroma_db
EMBEDDING_MODEL=BAAI/bge-large-en-v1.5
VLM_MODEL=gemini-2.5-flash
```
