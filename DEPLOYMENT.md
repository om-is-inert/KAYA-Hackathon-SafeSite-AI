# 🚀 SafeSite AI — Free Deployment Plan (NO Credit Card)

> **One-line verdict:** Make the backend tiny (offload embeddings to Gemini's free API + drop ChromaDB for a numpy search), host it on **Render's free tier** (no card required), put the React frontend on **Cloudflare Pages** (no card), and keep the backend awake with **cron-job.org** (no card). Total cost: **₹0 / $0**, zero credit card, and it renders flawlessly for judges.

**Hard constraint honored throughout this doc: no credit card, anywhere — not even for "verification."**

Everything below was checked against current (August 2026) free-tier limits.

---

## 0. TL;DR — The Decision Table (all no-card)

| Piece | Where | Why | Card? |
|---|---|---|---|
| **Frontend** (React/Vite SPA) | **Cloudflare Pages** | Unlimited bandwidth, global CDN, free forever | ❌ No card |
| **Backend** (FastAPI) | **Render free web service** | No card, native FastAPI, 512 MB RAM (fits once torch is gone) | ❌ No card |
| **Backend (alt)** | **Vercel Hobby** (Python serverless) | No card, no sleep-babysitting — but must be stateless (numpy path) | ❌ No card |
| **Embeddings** | **Gemini `gemini-embedding-001` API** | Kills the 3–5 GB `torch` stack → backend fits in 512 MB | ❌ No card |
| **LLM/Vision** | **Gemini 2.5 Flash API** (already wired) | Already your engine for all 3 layers | ❌ No card |
| **Vector search** | **numpy cosine similarity** (drop ChromaDB) | Only 2 tiny PDFs — no DB needed; smaller image, faster boot | ❌ No card |
| **Keep-alive** | **cron-job.org** (pings `/api/health` every ~10 min) | Beats Render's 15-min spin-down | ❌ No card |

> ⚠️ **What's OUT because it needs a card (2026):** Oracle Cloud, Google Cloud Run, Fly.io, Railway — all require a credit card even for free usage. **What died:** Glitch (shut July 2025), Deta Space (shut down), Cyclic (defunct). **What went paid:** Hugging Face Docker/Gradio Spaces (now need PRO), Replit always-on (now paid), Koyeb free web tier (retired). The no-card field is basically **Render + Vercel** now.

---

## 1. First, the honest audit — what's real vs. decoration

You asked me to check the three docs (`production_implementation_plan.md`, `message.txt`, README) against the **actual code**. Here's the ground truth — it matters for deployment because you shouldn't ship or waste time on code that doesn't run.

### ✅ What actually works today (all via Gemini API)
- **Layer 1 — Compliance:** Gemini VLM extracts blueprint dimensions → RAG retrieves code clauses → Gemini cross-references → violations with citations. **Real, working.**
- **Layer 2 — Vision:** Gemini zero-shot defect detection, PPE/SH17 safety audit, BD3 classification. **Real, working.**
- **Layer 3 — Foresight:** Monte Carlo risk sim (`numpy`, 10k iterations) + `scipy.optimize.linprog` optimizer. **Real math, working.**
- **The feedback loop:** L1/L2 findings measurably change L3's on-time probability (100% → 89.6% → 1.5% as findings stack). **This is your winning demo moment. Real.**

### ⚠️ The two things you flagged — confirmed

**1. "We're using YOLOv3" — NO, and it doesn't matter.**
- The code never mentions YOLOv3 anywhere (grep-confirmed).
- `defect_detector.py` references **YOLOv11-seg**; `ppe_detector.py` references **YOLOv10**.
- **Both are optional stubs.** If `ultralytics` isn't installed *or* the `.pt` weights are missing (they are — no weights in the repo), they silently **fall back to Gemini VLM**. So **no YOLO runs today** — every Layer 2 result is Gemini. That's fine for the hackathon and *helps* free hosting (YOLO weights + torch would blow the 512 MB budget).
- **Pitch it truthfully:** *"VLM-based detection today, with a fine-tuned YOLOv11-seg fallback path already scaffolded in code."* That's what your `VERIFIED_RESULTS.md` already says. Don't claim YOLO is live.

**2. "Gemini schemas are dead code" — CONFIRMED, delete it.**
- `backend/gemini_schemas.py` is **imported nowhere** (grep-confirmed).
- Its own header says: *"Not currently used — causes hallucination loops... Do not wire in until migrated to google.genai."*
- **Action:** Delete `backend/gemini_schemas.py`. Runtime JSON shape is already enforced by `parse_gemini_json` + Pydantic models — you lose nothing.

### 🎭 What's aspirational (README oversells — trim to match reality)
README lists BIM-Net++, SAM 2, Prophet, XGBoost, Gurobi, point-cloud segmentation. **None run.** `forecaster.py` uses `np.random` synthetic data + exponential smoothing; the "MILP" is actually `linprog` (LP). Normal for a hackathon — but **judges may read the repo.** Your `VERIFIED_RESULTS.md` already handles this honestly with a "current vs. roadmap" table. **Keep that table; soften the README headline claims to match it.** Overclaiming is the #1 way to lose credibility in Q&A.

---

## 2. The single biggest blocker (and why no-card hosting makes it urgent)

Your backend, as written, **cannot fit any no-card free tier.** Here's the *why* chain:

```
knowledge_base.py  →  sentence-transformers  →  torch (~1–2 GB)
                   →  downloads BAAI/bge-large-en-v1.5 (~1.3 GB model)
                   →  needs 1.5–2.5 GB RAM just to load the embedder
```

- **Total install: 3–5 GB. Runtime RAM: 1.5–2.5 GB.**
- The only free tiers big enough for that (Oracle 12 GB, HF 16 GB) **all now need a card or a paid plan.**
- The no-card survivors (Render, Vercel) give you **512 MB RAM** — so the torch stack is a non-starter.

**Conclusion: without a card, you *must* slim the backend.** Good news — it's easy, and you were already leaning this way.

### ✅ The fix, in two moves

**Move 1 — Offload embeddings to Gemini's free embedding API.** You already use Gemini. It also does **free embeddings** (`gemini-embedding-001`). Swap the local model → `torch` + `sentence-transformers` + the 1.3 GB model **all disappear.** Backend drops from ~4 GB → hundreds of MB.

**Move 2 — Drop ChromaDB, use a numpy cosine-similarity search.** ChromaDB still drags in ~300–500 MB of `onnxruntime`. With only **2 small PDFs** (a few thousand chunks), you don't need a vector database at all — store the Gemini vectors in a numpy array and do cosine similarity in-process. This shrinks the image to **~150 MB**, cuts cold-start time, and is *required* if you deploy on Vercel serverless (bundle size limit).

**Result: backend fits in 512 MB with room to spare, boots fast, and every no-card host works.** This is the highest-leverage work in this whole doc — do it first.

**Why safe:** 2 PDFs, embedded once at ingest, then 1 embedding call per user query — trivially within Gemini's free embedding limits (~100 req/min, ~1,000 req/day; confirm live in AI Studio). Numpy cosine over a few thousand vectors is instant.

---

## 3. Architecture after the fix

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│  Cloudflare Pages (CDN)  │  HTTPS │  FastAPI backend (tiny)       │
│  React/Vite static SPA   │───────▶│  Render free  (no card)       │
│  safesite.pages.dev      │  /api  │  - no torch, no local model   │
└─────────────────────────┘        │  - no ChromaDB (numpy search) │
                                    │  - vectors.npy built on boot  │
        cron-job.org ──ping /health─┘   └──────────┬───────────────┘
        every 10 min (no card)                     │ HTTPS
                                        ┌───────────▼───────────┐
                                        │  Google Gemini API     │
                                        │  - 2.5 Flash (vision)  │
                                        │  - embedding-001 (RAG) │
                                        └────────────────────────┘
```

Two things you host (frontend + backend) + two free Google APIs. No card, judge-legible, nothing exotic.

---

## 4. Code changes required (do these in order)

### 4.1 — Kill dead code
- **Delete** `backend/gemini_schemas.py`.

### 4.2 — Swap local embeddings → Gemini embeddings, and drop ChromaDB
Rewrite `backend/layer1_compliance/knowledge_base.py` so it:
1. Chunks the PDFs (keep your existing `chunk_text` logic — it's fine).
2. Embeds each chunk via Gemini and stores vectors + text in a numpy array on disk (`data/codes.npz`).
3. On query, embeds the query and does cosine similarity in numpy.

Core embedding call (new `google-genai` SDK):
```python
from google import genai
from google.genai import types

client = genai.Client(api_key=config.GEMINI_API_KEY)

def embed_texts(texts, task_type):  # "RETRIEVAL_DOCUMENT" for chunks, "RETRIEVAL_QUERY" for queries
    r = client.models.embed_content(
        model="gemini-embedding-001",
        contents=texts,
        config=types.EmbedContentConfig(task_type=task_type, output_dimensionality=768),
    )
    import numpy as np
    v = np.array([e.values for e in r.embeddings], dtype="float32")
    return v / np.linalg.norm(v, axis=1, keepdims=True)  # L2-normalize (needed when dim<3072)
```
Numpy cosine search (replaces `collection.query`):
```python
import numpy as np
def query(self, query_text, n_results=5):
    q = embed_texts([query_text], "RETRIEVAL_QUERY")[0]
    scores = self._vectors @ q            # cosine (both normalized)
    top = np.argsort(-scores)[:n_results]
    return [{**self._meta[i], "relevance_score": float(scores[i])} for i in top]
```

> **Simpler alternative if you'd rather not rewrite:** keep ChromaDB but replace only the embedding function with `embedding_functions.GoogleGeminiEmbeddingFunction(api_key=..., model_name="gemini-embedding-001", task_type="RETRIEVAL_DOCUMENT")`. This still removes torch (the big win) but keeps the ~300–500 MB `onnxruntime`. **Fine for Render; will NOT fit Vercel serverless.** For maximum portability and speed, prefer the numpy path above.

### 4.3 — Trim `requirements.txt`
**Remove:**
```
sentence-transformers>=3.0.0     # ← pulls in torch, the whole problem
chromadb>=0.5.0                  # ← drop if you take the numpy path (recommended)
```
**Add:**
```
google-genai>=0.3.0              # new SDK for Gemini embeddings
```
Keep `google-generativeai` (still used by the VLM calls), `pymupdf`, `numpy`, `pandas`, `scipy`, `fpdf2`, `fastapi`, `uvicorn`, `python-multipart`, `pydantic`, `python-dotenv`.

### 4.4 — Fix the hardcoded `localhost` in the frontend (deploy blocker)
Three files hardcode `http://localhost:8000` — this **breaks the moment it's hosted**:
- `frontendv1/src/pages/ComplianceEngine.jsx:14`
- `frontendv1/src/pages/ForesightEngine.jsx:15`
- `frontendv1/src/pages/VisionEngine.jsx:14`

Replace all three with:
```js
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
```
Set `VITE_API_BASE=https://<your-render-url>` in Cloudflare Pages build settings. Local dev still works via the fallback.

### 4.5 — Build the code index at deploy (it's gitignored)
The vector index won't exist on a fresh server. Build it on boot. Two options:
- **Simplest for Render:** in `main.py` startup, if `data/codes.npz` is missing, run the ingest once (embeds 2 PDFs via Gemini — takes a few seconds). This makes the first boot self-healing.
- **Or** run `python -m backend.ingest_codes ...` as a build/start step.

### 4.6 — Make FastAPI API-only (don't serve the frontend from it)
`main.py` currently mounts raw `frontendv1/` as static files — that serves un-built JSX and won't work. **Decision: frontend goes on Cloudflare Pages; FastAPI is API-only.** Remove the `StaticFiles` mount + root redirect. CORS `allow_origins` is `["*"]` (fine for demo; tighten to your Pages URL if you have time).

---

## 5. Frontend deploy — Cloudflare Pages (no card)

**Why Cloudflare Pages:** unlimited bandwidth (won't die if judges hammer it), global CDN, 500 builds/month, **no credit card**, free forever. (Vercel Hobby also works with no card but forbids commercial use; Netlify's new credit model caps ~15 GB/mo. Cloudflare is the safest no-card pick.)

**Steps:**
1. Push repo to GitHub.
2. Cloudflare Dashboard → Workers & Pages → Create → Pages → connect the repo.
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `frontendv1`
   - **Env var:** `VITE_API_BASE = https://<your-render-url>`
4. Deploy → `https://safesite-ai.pages.dev`.

> ⚠️ Your `Assets/` folder has large `.mp4` background videos. Cloudflare Pages caps single assets at **25 MiB** (20,000 files/site). Check the mp4 sizes; compress any that are big — they also hurt first-paint. Compress for the demo regardless.

---

## 6. Backend deploy — pick ONE (both no-card)

### Option A (recommended): Render free web service
**Why:** No credit card required (Render's own docs reference the "no payment method" case). Native FastAPI, 512 MB RAM (comfortable now that torch is gone), 750 free instance-hours/month (≈ enough to keep one service effectively always-up). Simple GitHub-connected deploys.

**Steps:**
1. render.com → New → Web Service → connect GitHub repo.
2. Settings:
   - **Root directory:** repo root (so `Info on construction/` PDFs are present)
   - **Build command:** `pip install -r backend/requirements.txt`
   - **Start command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Env var:** `GEMINI_API_KEY = <your key>`
3. Deploy → get `https://safesite-ai.onrender.com`.

**The one catch:** free services **spin down after 15 min idle**, and cold start is **~1 min** (plus your PDF-embed on first boot). **Fix with the keep-alive in §7**, and manually warm it right before presenting.

### Option B: Vercel Hobby (Python serverless, no card)
**Why:** Truly no card, officially supports FastAPI as a serverless function, and there's **no sleep/cold-start config to babysit** (it autoscales). Same Google ecosystem for your Gemini key.

**Trade-offs:** Stateless + short execution + a ~250 MB function-bundle limit → **you MUST use the numpy path (no ChromaDB)**, and you should **bake the `codes.npz` embeddings into the repo** (commit the small vector file) rather than rebuild per cold start. Great if you make the backend stateless; more refactor than Render.

> **Which to pick?** **Render** is the least-effort path that keeps your current server-style code — start there. Use **Vercel** only if Render's cold start annoys you and you're willing to go fully stateless. (Northflank Sandbox is "always-on, no sleep" but may ask for a card for verification — so it's excluded under your no-card constraint unless it lets you in cardless.)

---

## 7. Keep-alive — cron-job.org (no card)

**Why:** Render free spins down after 15 min idle. A periodic ping to your existing `/api/health` endpoint keeps it warm so the demo never hits a cold start.

**Setup:** cron-job.org (free, no card, 1-min intervals possible) → new cronjob → URL `https://<render-url>/api/health` → every **10 minutes**.

- **cron-job.org over UptimeRobot:** allows tighter intervals (UptimeRobot free floor is 5 min); either works, neither needs a card.
- Pinging **one** service every 10 min stays within Render's 750 hr/month.
- **Don't use GitHub Actions cron** — scheduled runs are delayed under load and auto-disable after 60 days of repo inactivity.
- **~15 min before you present**, manually hit the health URL (or drop the cron to 2 min) to guarantee a hot instance. Belt and suspenders.

---

## 8. Secrets & safety
- **Never commit `GEMINI_API_KEY`.** `.env` is already gitignored — good. Set the key as a Render/Vercel env var and a Cloudflare build var.
- There's a `.token` file in the parent `Kaya/` folder (46 bytes) — ensure it's **not** inside the repo / not pushed. Verify before `git push`.
- Tighten CORS `allow_origins` from `["*"]` to your Pages URL if you have time (not critical for a demo).

---

## 9. Go-live checklist (in order)

- [ ] Delete `backend/gemini_schemas.py`
- [ ] Rewrite `knowledge_base.py`: Gemini embeddings + numpy cosine search (drop ChromaDB)
- [ ] Edit `requirements.txt`: remove `sentence-transformers` (+ `chromadb`), add `google-genai`
- [ ] Replace `localhost:8000` → `import.meta.env.VITE_API_BASE` in the 3 JSX pages
- [ ] Make `main.py` API-only (remove `StaticFiles` mount); ensure index builds on boot
- [ ] Confirm `.token` and `.env` are NOT in the repo about to be pushed
- [ ] Push to GitHub
- [ ] Deploy backend to **Render** + set `GEMINI_API_KEY`
- [ ] Smoke-test: `curl https://<render-url>/api/health` → `{"status":"ok"}`
- [ ] Deploy frontend to **Cloudflare Pages** with `VITE_API_BASE` = Render URL
- [ ] Compress/verify `Assets/*.mp4` under 25 MiB
- [ ] End-to-end test: upload `sample_floor_plan_blueprint.png` + `demo_site_photo_worker_on_scaffold.jpg` through the live UI, watch the feedback loop move the on-time %
- [ ] Set cron-job.org ping on `/api/health` every 10 min
- [ ] Soften README overclaims to match `VERIFIED_RESULTS.md`
- [ ] ~15 min pre-demo: manually warm the backend

---

## 10. Risks & gotchas (researched — the 2 AM stuff)

| Risk | Impact | Mitigation |
|---|---|---|
| **Render 15-min spin-down + ~1-min cold start** | First judge click is slow / times out | cron-job.org ping every 10 min; manually warm before demo |
| **Gemini free-tier limits** (~1,000 req/day) | Testing + judges could hit the cap | Embed PDFs once (not per request); pin `DEMO_SEED=42`; keep a backup API key; demo on fresh quota |
| **First-boot embedding on Render** | First deploy slow while it embeds 2 PDFs | Self-healing startup check; or commit prebuilt `codes.npz` |
| **Large mp4 assets** | Slow first paint / Cloudflare 25 MiB limit | Compress videos before deploy |
| **CORS blocked** | Frontend can't reach backend | `allow_origins` includes Pages URL (currently `*`, so OK) |
| **`google-genai` vs `google-generativeai`** | Two SDKs coexist | Fine — VLM uses the old one, embeddings use the new one; both installed |
| **No-card hosts shrinking** | A host changes terms before the event | Render + Vercel are the two survivors; have both configs ready |

---

## 11. Why this wins (pitch framing)

- **It's genuinely live, free, and card-free** — judges can use it on their own phone during Q&A. A working public URL is a credibility multiplier over the usual localhost-only demos.
- **The interconnected feedback loop is your differentiator** — real, verified, visually dramatic (100% → 1.5%). Lead with it.
- **Radical honesty (VLM-now / fine-tuned-later)** reads as engineering maturity. Overclaiming YOLO/Prophet/MILP when the repo shows otherwise is how you *lose* Q&A — so we trimmed those claims.
- **Zero infra cost, no credit card, small fast backend** — because we deleted the one heavy dependency (`torch`) everyone else leaves in and then fails to deploy.

**Bottom line:** One focused code session (embedding swap + numpy search + `localhost` fix + dead-code delete), then Cloudflare Pages + Render + a cron pinger — **no credit card at any step.** Free, fast, honest, renders flawlessly. Go win it. 🏆
