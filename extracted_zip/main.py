"""
FastAPI entry point - Layer 1 Compliance Engine.

Run with:
    uvicorn backend.main:app --reload --port 8000
"""
import os
import shutil
import uuid

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from backend.layer1_compliance.blueprint_analyzer import extract_spatial_data, check_compliance
from backend.layer1_compliance.knowledge_base import retrieve_relevant_codes, build_query_from_spatial_data

app = FastAPI(title="SafeSite AI - Layer 1 Compliance Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for real deployment; fine for a hackathon demo
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "./data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Shared in-memory state. Layer 3 reads this to know what to recalculate.
# Swap for SQLite/redis if you need persistence across restarts, but for a
# hackathon demo this is all you need - keep it simple.
SHARED_STATE = {
    "violations": [],
    "defects": [],  # populated by Layer 2
}


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


@app.post("/api/v1/compliance/analyze")
async def analyze_blueprint(file: UploadFile = File(...)):
    # 1. save upload
    ext = os.path.splitext(file.filename)[1] or ".png"
    saved_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}{ext}")
    with open(saved_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # 2. VLM spatial extraction
    spatial_data = extract_spatial_data(saved_path)

    # 3. RAG retrieval, query built from what was actually extracted
    rag_query = build_query_from_spatial_data(spatial_data)
    rag_results = retrieve_relevant_codes(rag_query)

    # 4. compliance cross-reference
    compliance_result = check_compliance(spatial_data, rag_results)

    # 5. write to shared state so Layer 3 can pick it up on its next call
    SHARED_STATE["violations"] = compliance_result.get("violations", [])

    return {
        "spatial_data": spatial_data,
        "rag_query_used": rag_query,
        "violations": compliance_result.get("violations", []),
        "summary": compliance_result.get("summary", {}),
    }


@app.get("/api/v1/project/shared-state")
def get_shared_state():
    """Layer 3 (or the frontend) polls this to see current violations + defects."""
    return SHARED_STATE
