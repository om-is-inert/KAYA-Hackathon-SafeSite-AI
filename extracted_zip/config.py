"""
Config & settings for the Layer 1 Compliance Engine.
Loads GEMINI_API_KEY and other env vars from backend/.env
"""
import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL_NAME = "gemini-2.5-flash"

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma_db")
CHROMA_COLLECTION_NAME = "building_codes"

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-large-en-v1.5")

# Chunking params for code PDFs
CHUNK_SIZE_TOKENS = 500
CHUNK_OVERLAP_TOKENS = 100

# How many code chunks to retrieve per query
RAG_TOP_K = 5

# Fallback rule-based cost/hours estimates by severity, used INSTEAD of
# trusting the LLM's own guess (more defensible than an LLM-hallucinated number)
SEVERITY_REWORK_ESTIMATES = {
    "CRITICAL": {"hours": 40, "cost": 80000},
    "HIGH": {"hours": 20, "cost": 35000},
    "MEDIUM": {"hours": 8, "cost": 12000},
    "LOW": {"hours": 2, "cost": 3000},
}

if not GEMINI_API_KEY:
    print("[config] WARNING: GEMINI_API_KEY is not set. Create backend/.env with GEMINI_API_KEY=your_key")
