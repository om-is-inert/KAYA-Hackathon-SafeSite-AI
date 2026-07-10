"""
SafeSite AI — Configuration & Environment Variables
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend directory or project root
_backend_dir = Path(__file__).resolve().parent
_project_root = _backend_dir.parent

load_dotenv(_backend_dir / ".env")
load_dotenv(_project_root / ".env")


# ── API Keys ────────────────────────────────────────────────────────
GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

# ── Model Configuration ────────────────────────────────────────────
VLM_MODEL: str = os.getenv("VLM_MODEL", "gemini-3.5-flash")
GEMINI_MODEL_NAME: str = VLM_MODEL
EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "BAAI/bge-large-en-v1.5")

# Chunking params for code PDFs
CHUNK_SIZE_TOKENS: int = 500
CHUNK_OVERLAP_TOKENS: int = 100
RAG_TOP_K: int = 5
CHROMA_COLLECTION_NAME: str = "building_codes"

# Fallback rule-based cost/hours estimates by severity, used INSTEAD of
# trusting the LLM's own guess (more defensible than an LLM-hallucinated number)
SEVERITY_REWORK_ESTIMATES = {
    "CRITICAL": {"hours": 40, "cost": 80000},
    "HIGH": {"hours": 20, "cost": 35000},
    "MEDIUM": {"hours": 8, "cost": 12000},
    "LOW": {"hours": 2, "cost": 3000},
}

# ── Paths ───────────────────────────────────────────────────────────
CHROMA_PERSIST_DIR: str = os.getenv(
    "CHROMA_PERSIST_DIR",
    str(_project_root / "data" / "chroma_db"),
)

BUILDING_CODES_DIR: Path = _project_root / "Info on construction"
UPLOAD_DIR: Path = _project_root / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

SAMPLE_BLUEPRINTS_DIR: Path = _project_root / "data" / "sample_blueprints"
SAMPLE_SITE_PHOTOS_DIR: Path = _project_root / "data" / "sample_site_photos"
SYNTHETIC_COST_DATA_DIR: Path = _project_root / "data" / "synthetic_cost_data"

# ── Server ──────────────────────────────────────────────────────────
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))
DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

# ── Layer 3 — Foresight defaults ───────────────────────────────────
MONTE_CARLO_ITERATIONS: int = int(os.getenv("MONTE_CARLO_ITERATIONS", "10000"))
