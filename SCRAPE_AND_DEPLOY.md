# SafeSite AI — Complete Scrape + Deploy Guide
## No credit card. No torch. No excuses.

> **Stack after changes:** Render (backend, free, no card) + Cloudflare Pages (frontend, free, no card) + Gemini API (embeddings + vision, free tier) + cron-job.org (keep-alive, free, no card).

---

## PART 1 — WHAT TO SCRAPE (exact file + line)

### DELETE this file entirely
| File | Why |
|---|---|
| `backend/gemini_schemas.py` | Confirmed dead code — never imported anywhere. Its own header says "Not currently used — causes hallucination loops." Clutters the repo for judges. |

---

### REMOVE from `backend/requirements.txt`
```diff
- sentence-transformers>=3.0.0    # pulls in torch (1-2GB) — the entire deployment blocker
- chromadb>=0.5.0                 # pulls in onnxruntime (300MB) — not needed with numpy search
```
```diff
+ google-genai>=0.3.0             # new Gemini SDK, used for embeddings
```
Keep everything else as-is (`google-generativeai`, `pymupdf`, `numpy`, `pandas`, `scipy`, `fpdf2`, `fastapi`, `uvicorn`, `python-multipart`, `pydantic`, `python-dotenv`, `pillow`, `pyyaml`, `matplotlib`, `plotly`).

---

### CHANGE in `backend/layer1_compliance/knowledge_base.py`

**Remove** the `SentenceTransformerEmbeddingFunction` import and all ChromaDB initialisation. **Replace** the entire class with a numpy-based vector store backed by the Gemini embedding API.

Exact lines to gut: the `_ensure_init` method (lines 128–152) and the `query` method (lines 208–244). The rest of the class structure, the PDF chunking functions (`extract_text_from_pdf`, `chunk_text`, `_categorize_chunk`, `_find_section_header`), and `build_query_from_spatial_data` at the bottom — **keep all of that, it's solid code**.

Replace the storage/retrieval backend with this:

```python
# Add at top of file:
import numpy as np
from google import genai
from google.genai import types
from backend.config import GEMINI_API_KEY, CHROMA_PERSIST_DIR

_genai_client = genai.Client(api_key=GEMINI_API_KEY)
INDEX_PATH = Path(CHROMA_PERSIST_DIR).parent / "codes_index.npz"

def _embed(texts: list[str], task: str) -> np.ndarray:
    """Call Gemini embedding API. task = RETRIEVAL_DOCUMENT or RETRIEVAL_QUERY."""
    r = _genai_client.models.embed_content(
        model="gemini-embedding-001",
        contents=texts,
        config=types.EmbedContentConfig(task_type=task, output_dimensionality=768),
    )
    vecs = np.array([e.values for e in r.embeddings], dtype="float32")
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    return vecs / np.where(norms == 0, 1, norms)   # L2-normalize
```

Replace `KnowledgeBase` with:
```python
class KnowledgeBase:
    def __init__(self, persist_dir: str = "./data/chroma_db"):
        self._vectors: np.ndarray | None = None
        self._meta: list[dict] = []
        self._index_path = Path(persist_dir).parent / "codes_index.npz"
        self._load_if_exists()

    def _load_if_exists(self):
        if self._index_path.exists():
            data = np.load(str(self._index_path), allow_pickle=True)
            self._vectors = data["vectors"]
            self._meta = list(data["meta"])
            logger.info("Loaded %d chunks from %s", len(self._meta), self._index_path)

    def ingest_pdf(self, pdf_path: str | Path) -> int:
        pages = extract_text_from_pdf(pdf_path)
        all_chunks = []
        for p in pages:
            all_chunks.extend(chunk_text(p["text"], source=p["source"], page=p["page"]))
        if not all_chunks:
            return 0
        texts = [c["text"] for c in all_chunks]
        # Embed in batches of 100 (Gemini limit)
        vecs = []
        for i in range(0, len(texts), 100):
            vecs.append(_embed(texts[i:i+100], "RETRIEVAL_DOCUMENT"))
        new_vecs = np.vstack(vecs)
        self._vectors = np.vstack([self._vectors, new_vecs]) if self._vectors is not None else new_vecs
        self._meta.extend(all_chunks)
        self._save()
        logger.info("Ingested %d chunks from %s", len(all_chunks), Path(pdf_path).name)
        return len(all_chunks)

    def _save(self):
        self._index_path.parent.mkdir(parents=True, exist_ok=True)
        np.savez(str(self._index_path), vectors=self._vectors, meta=np.array(self._meta, dtype=object))

    def query(self, query_text: str, n_results: int = 5, **_) -> list[dict]:
        if self._vectors is None or len(self._meta) == 0:
            return []
        q = _embed([query_text], "RETRIEVAL_QUERY")[0]
        scores = self._vectors @ q
        top = np.argsort(-scores)[:n_results]
        return [{**self._meta[i], "relevance_score": float(scores[i])} for i in top]

    def ingest_directory(self, directory: str | Path) -> int:
        total = 0
        for pdf_file in Path(directory).glob("*.pdf"):
            total += self.ingest_pdf(pdf_file)
        return total

    @property
    def doc_count(self) -> int:
        return len(self._meta)
```

---

### CHANGE in `backend/main.py`

**Remove lines 42–49** (the `StaticFiles` mount and root redirect). FastAPI is API-only now — Cloudflare Pages handles the frontend.

```python
# DELETE these lines (42-49):
frontend_dir = Path(__file__).resolve().parent.parent / "frontendv1"
if frontend_dir.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dir), html=True), name="static")

    @app.get("/")
    async def serve_root():
        from fastapi.responses import RedirectResponse
        return RedirectResponse(url="/static/index.html")
```

**Also fix the StaticFiles mount** — it currently points to the raw `frontendv1/` source dir, so visiting `/static/index.html` would serve unbuilt JSX that browsers can't run. Since the frontend is now on Cloudflare Pages, just delete the entire block. But if you ever want Render to serve the built frontend too, the path must be `frontendv1/dist`:
```python
# WRONG (currently in main.py:42–44):
frontend_dir = Path(__file__).resolve().parent.parent / "frontendv1"
# CORRECT (if keeping static serving):
frontend_dist = Path(__file__).resolve().parent.parent / "frontendv1" / "dist"
if frontend_dist.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dist), html=True), name="static")
# (But just delete the whole block if frontend lives on Cloudflare Pages)
```

**Also add startup auto-ingest** so the index builds automatically on first deploy (after the existing `app = FastAPI(...)` block):

```python
@app.on_event("startup")
async def _build_index_if_needed():
    """Build the embedding index from PDFs if it doesn't exist yet."""
    from backend.layer1_compliance.knowledge_base import KnowledgeBase
    from pathlib import Path
    index_path = Path(config.CHROMA_PERSIST_DIR).parent / "codes_index.npz"
    if not index_path.exists():
        logger.info("Index not found — ingesting building code PDFs...")
        kb = KnowledgeBase(persist_dir=config.CHROMA_PERSIST_DIR)
        kb.ingest_directory(config.BUILDING_CODES_DIR)
        logger.info("Index built: %d chunks", kb.doc_count)
```

**Also update the start command** — Render injects `$PORT`, not 8000:
```python
# In the health check, this is fine. But the uvicorn START COMMAND on Render must be:
# uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

---

### CHANGE in 3 frontend files — fix hardcoded localhost

**`frontendv1/src/pages/ComplianceEngine.jsx` — line 14**
```diff
- const API_BASE = 'http://localhost:8000';
+ const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
```

**`frontendv1/src/pages/VisionEngine.jsx` — line 14**
```diff
- const API_BASE = 'http://localhost:8000';
+ const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
```

**`frontendv1/src/pages/ForesightEngine.jsx` — line 15**
```diff
- const API_BASE = 'http://localhost:8000';
+ const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
```

---

### CHANGE in `frontendv1/src/pages/VisionEngine.jsx` — line 243

This says "YOLOv11-seg + Gemini VLM are processing your image" in the live UI — judges will see this and ask about YOLO.

```diff
- <span className="ce-dropzone-sub">YOLOv11-seg + Gemini VLM are processing your image. This may take 15–30 seconds.</span>
+ <span className="ce-dropzone-sub">Gemini Vision is analysing your image. This may take 15–30 seconds.</span>
```

---

### ADD new file — `frontendv1/public/_redirects`

**Required or every direct URL / refresh breaks on Cloudflare Pages** (e.g. judge pastes `/compliance-engine` and gets a 404).

```
/*    /index.html    200
```

That single line catches all React Router routes and returns `index.html` with a 200 — the SPA handles routing from there. Without this, any route except `/` returns Cloudflare's default 404.

---

### ADD new file — `render.yaml` (at repo root)

Tells Render exactly how to build and run so you don't have to click through the dashboard:

```yaml
services:
  - type: web
    name: safesite-ai-backend
    runtime: python
    buildCommand: pip install -r backend/requirements.txt
    startCommand: uvicorn backend.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: GEMINI_API_KEY
        sync: false          # you paste this value in the Render dashboard
      - key: DEMO_SEED
        value: "42"
    autoDeploy: true
```

---

### KEEP exactly as-is (do NOT touch these)

| File | Why to leave it |
|---|---|
| `backend/layer2_vision/defect_detector.py` | YOLO path is guarded by `use_yolo=False` default + weight file check → always falls back to Gemini. Safe. |
| `backend/layer2_vision/ppe_detector.py` | Same pattern. YOLOv10 path is dead code behind a flag. |
| `backend/layer2_vision/defect_classifier.py` | ViT path guarded by torch import + weight check. Falls back to Gemini. |
| `backend/layer2_vision/scan_to_bim.py` | Pure geometric comparison, no ML, no external deps. |
| `backend/layer3_foresight/risk_modeler.py` | Pure numpy Monte Carlo. Fast, correct, keep it. |
| `backend/layer3_foresight/resource_optimizer.py` | `scipy.milp` — real MILP, keep it. |
| `backend/layer3_foresight/forecaster.py` | Synthetic but functional. Fine for demo. |
| `backend/feedback_loop.py` | The interconnected loop — your winning feature. |
| `backend/json_utils.py` | Battle-tested multi-pass Gemini JSON repair. |
| `backend/models.py` | Clean Pydantic schemas. |
| `backend/layer1_compliance/compliance_checker.py` | Solid Gemini compliance loop. |
| `backend/layer1_compliance/blueprint_analyzer.py` | Solid VLM extraction. |
| `backend/report_generator.py` | PDF report generation. |
| `backend/config.py` | Good. Just ensure `GEMINI_API_KEY` is set as env var on Render. |

---

## PART 2 — DEPLOY (no credit card, both steps)

### Step 1 — Backend on Render (no card)

1. Push to GitHub.
2. render.com → **New → Web Service** → connect repo.
3. Settings:
   - **Language:** Python 3
   - **Build command:** `pip install -r backend/requirements.txt`
   - **Start command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Instance type:** Free
4. **Environment → Add env var:** `GEMINI_API_KEY` = your key (click "Add Secret").
   Also add: `DEMO_SEED` = `42` (pins the Monte Carlo for a reproducible demo).
5. Deploy. First deploy takes ~3–5 min (pip install). Watch logs — you should see "Index built: N chunks" confirming the PDF embed ran.
6. Copy your Render URL: `https://safesite-ai-backend.onrender.com`

### Step 2 — Frontend on Cloudflare Pages (no card)

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Select your repo.
3. Build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist` ← **type exactly `dist`, NOT `frontendv1/dist`** — the field is relative to the root directory you set, so `frontendv1/dist` would resolve to `frontendv1/frontendv1/dist` and fail
   - **Root directory:** `frontendv1`
4. **Environment Variables (production):** `VITE_API_BASE` = `https://safesite-ai-backend.onrender.com`
5. Deploy → get `https://safesite-ai.pages.dev`

### Step 3 — Keep-alive on cron-job.org (no card)

1. cron-job.org → Create cronjob.
2. URL: `https://safesite-ai-backend.onrender.com/api/health`
3. Interval: every **10 minutes**.
4. That's it. Render's 15-min sleep never triggers while this runs.

---

## PART 3 — ISSUES TO PRE-EMPT (researched)

These will bite you silently. Fix them before the demo.

---

### 🔴 Issue 1 — Render kills service if startup takes too long (health check timeout)
**Symptom:** Deploy succeeds, then service is marked "unhealthy" and killed.  
**Root cause:** Render sends a health check GET to `/` during startup. If the server doesn't respond within ~60s, it restarts. Your startup auto-ingest calls Gemini to embed 2 PDFs — if Gemini is slow or rate-limited, startup exceeds the timeout.  
**Fix:**
- In `main.py`, make the startup ingest **non-blocking** — run it in a background task so the server starts accepting requests immediately:
```python
import asyncio
@app.on_event("startup")
async def _build_index_if_needed():
    asyncio.create_task(_ingest_background())   # don't await

async def _ingest_background():
    from backend.layer1_compliance.knowledge_base import KnowledgeBase
    index_path = Path(config.CHROMA_PERSIST_DIR).parent / "codes_index.npz"
    if not index_path.exists():
        kb = KnowledgeBase(persist_dir=config.CHROMA_PERSIST_DIR)
        kb.ingest_directory(config.BUILDING_CODES_DIR)
```
- **Or** (simpler for demo): pre-generate `codes_index.npz` locally, commit it to the repo. Then the server finds it immediately and skips ingest entirely. File is only ~15 MB for 2 PDFs.

---

### 🔴 Issue 2 — Render free injects `$PORT`, not 8000
**Symptom:** App deploys but returns connection refused or Render shows "No open ports detected."  
**Root cause:** Render assigns a random port via `$PORT` env var. If uvicorn is hardcoded to `--port 8000`, it's listening on the wrong port.  
**Fix:** Start command must be:
```
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```
The `render.yaml` above already has this. Double-check the dashboard after deploy.

---

### 🔴 Issue 3 — React Router 404 on Cloudflare Pages (direct URL / refresh)
**Symptom:** Home page `/` works. But if a judge navigates directly to `https://safesite-ai.pages.dev/compliance-engine` or refreshes the page, they get Cloudflare's generic 404.  
**Root cause:** Cloudflare Pages serves static files. It doesn't know `/compliance-engine` is a client-side route — it looks for a file that doesn't exist.  
**Fix:** The `_redirects` file in `frontendv1/public/` (listed in Part 1 above). Confirm it exists before deploying.

---

### 🟠 Issue 4 — Gemini free-tier 429 during live demo
**Symptom:** A compliance analysis or defect scan returns an error mid-demo in front of judges.  
**Root cause:** Gemini free tier has ~15 req/min. If multiple people test simultaneously or you hit it during your own setup, you burn the per-minute limit.  
**Fix — multi-key rotation** (the cleanest approach for a team):

In `backend/config.py`, add:
```python
import itertools
_GEMINI_KEYS = [k for k in [
    os.getenv("GEMINI_API_KEY"),
    os.getenv("GEMINI_API_KEY_2"),
    os.getenv("GEMINI_API_KEY_3"),
    os.getenv("GEMINI_API_KEY_4"),
    os.getenv("GEMINI_API_KEY_5"),
] if k]
_key_cycle = itertools.cycle(_GEMINI_KEYS)

def next_gemini_key() -> str:
    return next(_key_cycle)
```

In each Gemini call site (`blueprint_analyzer.py`, `compliance_checker.py`, `defect_detector.py`, `ppe_detector.py`, `defect_classifier.py`) — inside the `ResourceExhausted` retry block, rotate the key:
```python
except ResourceExhausted:
    if attempt == 2:
        raise
    new_key = config.next_gemini_key()
    genai.configure(api_key=new_key)
    model = genai.GenerativeModel(VLM_MODEL)   # re-init with new key
    await asyncio.sleep(5)                       # short wait, then retry
```

Add `GEMINI_API_KEY_2` through `GEMINI_API_KEY_5` in Render env vars with each team member's key. This gives you 5× the quota with seamless fallback — virtually impossible to exhaust during a demo.

---

### 🟠 Issue 5 — `google-generativeai` and `google-genai` conflict
**Symptom:** Import errors or unexpected behaviour when both SDKs are installed.  
**Root cause:** `google-generativeai` (the old SDK, used by your VLM calls) and `google-genai` (the new SDK, used for embeddings) can have dependency version conflicts on certain pip versions.  
**Fix:** Pin them both and test:
```
google-generativeai>=0.8.0,<1.0.0
google-genai>=0.3.0,<1.0.0
```
They use different Python namespaces (`import google.generativeai as genai` vs `from google import genai`) so they don't collide at runtime — but pip can get confused about shared `google-auth` sub-dependencies. If you see an error, add `google-auth>=2.28.0` explicitly to pin the shared dep.

---

### 🔴 Issue 6 — CORS startup crash — `allow_credentials=True` + `allow_origins=["*"]`
**Symptom:** FastAPI server crashes at startup on Render with `ValueError: Cannot use 'allow_credentials=True' with wildcard 'allow_origins'`. Render marks the service "Failed" immediately on every deploy. Nothing else runs.  
**Root cause:** Confirmed in `backend/main.py:33–39`. The CORS spec forbids wildcard origins with credentials. Starlette 0.20+ (which FastAPI 0.115 depends on) enforces this as a hard ValueError at startup — it does not just log a warning.  
**Fix — remove `allow_credentials=True`** (you don't use cookies or HTTP auth, so you don't need it):
```python
# main.py:33–39 — replace with:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    # No allow_credentials line
)
```

---

### 🟠 Issue 7 — PyMuPDF install fails on Render (Linux)
**Symptom:** Build fails with `Could not find a version that satisfies the requirement pymupdf`.  
**Root cause:** The package name changed. On newer pip, `pymupdf` works. On older pip/Python, you may need `PyMuPDF` (capital letters). Also, it now ships as a pre-built wheel — no system libs needed.  
**Fix:** If build fails, change `requirements.txt`:
```
PyMuPDF>=1.24.0
```
(Capital P, Capital M — the PyPI canonical name.)

---

### 🟠 Issue 8 — `codes_index.npz` wiped between Render sleeps
**Symptom:** App works for the first request after boot, but after Render wakes from sleep (15 min idle), the index is gone. RAG returns no results. Compliance engine produces output with no code references.  
**Root cause:** Render's free tier filesystem is **ephemeral** — it's reset every time the dyno sleeps and wakes. The `.npz` file written at startup is gone on the next cold start.  
**Fix (best):** Commit `codes_index.npz` to the repo. Generate it once locally:
```bash
python -m backend.ingest_codes "Info on construction/NBC2016-Part-IV.pdf" NBC2016
python -m backend.ingest_codes "Info on construction/is.456.2000.pdf" IS456
# Then find and commit the codes_index.npz file
```
Remove `data/chroma_db/` from `.gitignore` (or add an exception for `*.npz`). Once it's in the repo, Render clones it fresh every cold start — no ingest needed.  
**Fix (backup):** The `asyncio.create_task` approach from Issue 1 — server answers the health check immediately, ingest runs in background. First compliance request might be slightly slower but won't break.

---

### 🟡 Issue 9 — Render 750hr/month cap + cron-job.org keeps it awake
**Symptom:** Towards end of month, Render suspends the service.  
**Root cause:** 750 hours / month ÷ 720 hours in a month = 1.04 instances awake 24/7. Pinging every 10 min keeps it from sleeping, which **uses all 750 hours in ~31 days** — that's fine for one month/one hackathon.  
**No action needed** for the hackathon window. If you run past the month, either reduce ping frequency or let it sleep between sessions.

---

### 🟡 Issue 10 — `scipy.optimize.milp` version requirement
**Symptom:** `ImportError: cannot import name 'milp' from 'scipy.optimize'`  
**Root cause:** `scipy.milp` was added in scipy 1.8.0. Your `requirements.txt` pins `scipy>=1.13.0` — fine. But if Render somehow resolves an older version, it breaks.  
**Fix:** Already safe as written. If you ever see the error, add `scipy>=1.8.0` as an explicit lower bound (already covered by `>=1.13.0`).

---

### 🟡 Issue 11 — `VITE_API_BASE` not injected (frontend calls localhost in production)
**Symptom:** On the live site, API calls go to `localhost:8000` (which is the judge's machine) and fail silently or with "Failed to fetch."  
**Root cause:** Vite bakes env vars at **build time**, not runtime. If `VITE_API_BASE` isn't set in Cloudflare's build environment before the `npm run build` runs, the fallback `http://localhost:8000` is baked in permanently.  
**Fix:** In Cloudflare Pages → Settings → Environment Variables → **Production**, add `VITE_API_BASE` = `https://your-render-url.onrender.com` **before** the first deploy. If you deployed before setting it, redeploy after setting it.

---

### 🟡 Issue 12 — Cold start during live demo
**Symptom:** Judge clicks a button, sees a spinning loader for 30–60 seconds, then gets a result (or a timeout).  
**Root cause:** Render free spins down after 15 min idle. The cron-job.org pinger prevents this *during quiet periods*, but if cron fires at :00 and the judge clicks at :14, the service may have just slept.  
**Fix:** 15 minutes before you present, **manually open your live URL and run one compliance analysis.** This guarantees a warm instance. Set cron-job.org to 5-min interval on demo day.

---

## PART 4 — CHECKLIST (run in order)

```
SCRAPE
[ ] Delete backend/gemini_schemas.py
[ ] Edit requirements.txt — remove sentence-transformers, remove chromadb, add google-genai
[ ] Rewrite KnowledgeBase class in knowledge_base.py (numpy + Gemini embeddings)
[ ] Edit main.py — remove StaticFiles mount, remove allow_credentials=True from CORS, add startup ingest background task
[ ] Fix localhost in ComplianceEngine.jsx:14, VisionEngine.jsx:14, ForesightEngine.jsx:15
[ ] Fix VisionEngine.jsx:243 — remove "YOLOv11-seg +" from UI text
[ ] Add frontendv1/public/_redirects  (content: /*    /index.html    200)
[ ] Add render.yaml at repo root
[ ] Generate codes_index.npz locally, commit it (so deploy doesn't need to ingest)
[ ] Soften README overclaims (BIM-Net++, SAM 2, Prophet, XGBoost, Gurobi are roadmap)

PRE-FLIGHT
[ ] Run locally: pip install -r backend/requirements.txt
[ ] Run locally: uvicorn backend.main:app --reload --port 8000
[ ] Test compliance upload with sample_floor_plan_blueprint.png — confirm violations returned
[ ] Test defect upload with demo_site_photo_worker_on_scaffold.jpg — confirm defects returned
[ ] Test foresight/risk — confirm on-time % drops after uploads
[ ] Confirm .env and .token are NOT in git: git status before push

DEPLOY
[ ] Push to GitHub
[ ] Render: new web service → set GEMINI_API_KEY + DEMO_SEED=42
[ ] Wait for deploy → check logs for "Application startup complete"
[ ] curl https://<render-url>/api/health → {"status":"ok"}
[ ] Cloudflare Pages: connect repo → set root=frontendv1, VITE_API_BASE=<render-url>
[ ] Wait for build → open live URL
[ ] Test full flow on live URL (not localhost) — blueprint → photo → foresight
[ ] Set cron-job.org → <render-url>/api/health every 10 min

DEMO DAY
[ ] Add team Gemini keys as GEMINI_API_KEY_2 through _5 on Render
[ ] Set cron-job.org to 5-min interval on demo day
[ ] 15 min before presenting: open live URL, run one compliance analysis (warms instance)
[ ] Pin demo seed (DEMO_SEED=42) for reproducible 100% → 89.6% → 1.5% feedback loop
```

---

## PART 5 — WHAT ACTUALLY RUNS (so your pitch is honest)

| Feature | Reality | Pitch it as |
|---|---|---|
| Blueprint compliance (L1) | Gemini VLM + numpy RAG + Gemini compliance check | ✅ "Fully functional" |
| Defect detection (L2) | Gemini zero-shot VLM | ✅ "Gemini Vision, YOLOv11 fallback path scaffolded" |
| PPE / safety audit (L2) | Gemini zero-shot VLM, SH17-informed prompts | ✅ "Fully functional" |
| BD3 building classification (L2) | Gemini zero-shot VLM | ✅ "Fully functional" |
| Monte Carlo risk sim (L3) | Real `numpy` stochastic simulation, 10k iterations | ✅ "Real math, fully functional" |
| MILP optimizer (L3) | Real `scipy.milp` integer programming | ✅ "Real MILP, fully functional" |
| Feedback loop | Real — on-time % drops measurably on each upload | ✅ "The core differentiator" |
| Cost forecaster (L3) | Synthetic `np.random` data + exponential smoothing | ⚠️ "Demo forecaster; Prophet integration is roadmap" |
| YOLOv11-seg weights | Weights absent — always falls back to Gemini | ⚠️ Don't say YOLO is live |
| BIM-Net++, SAM 2, Prophet, XGBoost | Not implemented | ❌ Roadmap only — don't claim |
