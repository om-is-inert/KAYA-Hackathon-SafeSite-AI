"""
SafeSite AI — Layer 1 — RAG Knowledge Base
Parses NBC 2016 / IS 456 PDFs → section-aware chunks → numpy vector store with
Gemini `gemini-embedding-001` embeddings.
"""

from __future__ import annotations

import hashlib
import logging
import re
import time
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
import numpy as np
from google import genai
from google.genai import types
from google.genai.errors import ClientError

from backend.config import GEMINI_API_KEY

logger = logging.getLogger(__name__)

_genai_client = genai.Client(api_key=GEMINI_API_KEY)


def _embed(texts: list[str], task: str, max_retries: int = 5) -> np.ndarray:
    """Call Gemini embedding API. task = RETRIEVAL_DOCUMENT or RETRIEVAL_QUERY.

    Free-tier embedding quota is tight (~100 req/min) — retry with backoff on 429s
    instead of failing the whole ingest/query.
    """
    for attempt in range(max_retries):
        try:
            r = _genai_client.models.embed_content(
                model="gemini-embedding-001",
                contents=texts,
                config=types.EmbedContentConfig(task_type=task, output_dimensionality=768),
            )
            vecs = np.array([e.values for e in r.embeddings], dtype="float32")
            norms = np.linalg.norm(vecs, axis=1, keepdims=True)
            return vecs / np.where(norms == 0, 1, norms)  # L2-normalize
        except ClientError as e:
            if e.code != 429 or attempt == max_retries - 1:
                raise
            wait = 20 * (attempt + 1)
            logger.warning("Gemini embedding rate-limited, retrying in %ds (attempt %d/%d)", wait, attempt + 1, max_retries)
            time.sleep(wait)
    raise RuntimeError("unreachable")


# ── PDF Parsing ─────────────────────────────────────────────────────

def extract_text_from_pdf(pdf_path: str | Path) -> list[dict]:
    """Extract text from a PDF with page-level metadata."""
    pdf_path = Path(pdf_path)
    doc = fitz.open(str(pdf_path))
    pages = []
    for page_num, page in enumerate(doc, 1):
        text = page.get_text("text")
        if text.strip():
            pages.append({
                "text": text,
                "page": page_num,
                "source": pdf_path.name,
            })
    doc.close()
    return pages


# ── Section-Aware Chunking ──────────────────────────────────────────

SECTION_PATTERNS = [
    r"(?:^|\n)((?:Clause|Section|CLAUSE|SECTION)\s+[\d.]+)",
    r"(?:^|\n)(§\s*[\d.]+)",
    r"(?:^|\n)(\d+\.\d+(?:\.\d+)*)\s+[A-Z]",
    r"(?:^|\n)((?:PART|Part|Chapter|CHAPTER)\s+[IVXLCDM\d]+)",
]


def _find_section_header(text: str) -> Optional[str]:
    """Try to extract a section header from the beginning of a chunk."""
    for pattern in SECTION_PATTERNS:
        match = re.search(pattern, text[:200])
        if match:
            return match.group(1).strip()
    return None


def chunk_text(
    text: str,
    chunk_size: int = 500,
    overlap: int = 100,
    source: str = "",
    page: int = 0,
) -> list[dict]:
    """Split text into overlapping chunks, preserving section context."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk_words = words[i : i + chunk_size]
        chunk_text_str = " ".join(chunk_words)

        section = _find_section_header(chunk_text_str)
        category = _categorize_chunk(chunk_text_str)

        chunk_id = hashlib.md5(
            f"{source}:{page}:{i}".encode()
        ).hexdigest()[:12]

        chunks.append({
            "id": chunk_id,
            "text": chunk_text_str,
            "source": source,
            "page": page,
            "section": section or "General",
            "category": category,
        })

        i += chunk_size - overlap

    return chunks


def _categorize_chunk(text: str) -> str:
    """Categorize a chunk based on keywords."""
    text_lower = text.lower()
    categories = {
        "fire_safety": ["fire", "escape", "egress", "smoke", "alarm", "sprinkler", "extinguish"],
        "structural": ["column", "beam", "slab", "rebar", "reinforcement", "concrete", "load", "stress"],
        "dimensional": ["width", "height", "area", "dimension", "clearance", "setback", "corridor"],
        "ventilation": ["ventilation", "window", "air", "opening", "exhaust"],
        "plumbing": ["plumbing", "drainage", "water", "sewage", "pipe"],
        "electrical": ["electrical", "wiring", "earthing", "grounding"],
        "accessibility": ["ramp", "handrail", "wheelchair", "accessible", "disability"],
    }
    for cat, keywords in categories.items():
        if any(kw in text_lower for kw in keywords):
            return cat
    return "general"


# ── numpy Knowledge Base ────────────────────────────────────────────

class KnowledgeBase:
    """RAG knowledge base backed by a numpy vector store + Gemini embeddings."""

    def __init__(
        self,
        persist_dir: str = "./data/chroma_db",
        collection_name: str = "building_codes",
    ):
        self.persist_dir = persist_dir
        self.collection_name = collection_name
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

    def _save(self):
        self._index_path.parent.mkdir(parents=True, exist_ok=True)
        np.savez(str(self._index_path), vectors=self._vectors, meta=np.array(self._meta, dtype=object))

    def ingest_pdf(self, pdf_path: str | Path) -> int:
        """Parse a building code PDF and add chunks to the vector store."""
        pdf_path = Path(pdf_path)
        logger.info("Ingesting PDF: %s", pdf_path.name)

        pages = extract_text_from_pdf(pdf_path)
        all_chunks = []
        for page_data in pages:
            chunks = chunk_text(
                text=page_data["text"],
                source=page_data["source"],
                page=page_data["page"],
            )
            all_chunks.extend(chunks)

        if not all_chunks:
            logger.warning("No chunks extracted from %s", pdf_path.name)
            return 0

        texts = [c["text"] for c in all_chunks]
        vecs = []
        batch_size = 20  # free-tier embedding quota is token-based; long code chunks need a smaller batch than short text
        for i in range(0, len(texts), batch_size):
            vecs.append(_embed(texts[i : i + batch_size], "RETRIEVAL_DOCUMENT"))
            time.sleep(2)  # stay under requests-per-minute limit across batches
        new_vecs = np.vstack(vecs)

        self._vectors = np.vstack([self._vectors, new_vecs]) if self._vectors is not None else new_vecs
        self._meta.extend(all_chunks)
        self._save()

        logger.info(
            "Ingested %d chunks from %s (total in index: %d)",
            len(all_chunks),
            pdf_path.name,
            len(self._meta),
        )
        return len(all_chunks)

    def ingest_directory(self, directory: str | Path) -> int:
        """Ingest all PDFs in a directory."""
        directory = Path(directory)
        total = 0
        for pdf_file in directory.glob("*.pdf"):
            total += self.ingest_pdf(pdf_file)
        return total

    def query(
        self,
        query_text: str,
        n_results: int = 5,
        category_filter: Optional[str] = None,
        **_,
    ) -> list[dict]:
        """Retrieve relevant code sections for a compliance query."""
        if self._vectors is None or len(self._meta) == 0:
            return []

        q = _embed([query_text], "RETRIEVAL_QUERY")[0]
        scores = self._vectors @ q

        candidates = np.argsort(-scores)
        if category_filter:
            candidates = [i for i in candidates if self._meta[i].get("category") == category_filter]
        top = candidates[:n_results]

        retrieved = []
        for i in top:
            m = self._meta[i]
            retrieved.append({
                "text": m["text"],
                "source": m.get("source", ""),
                "page": m.get("page", 0),
                "section": m.get("section", ""),
                "category": m.get("category", ""),
                "relevance_score": round(float(scores[i]), 4),
            })
        return retrieved

    @property
    def doc_count(self) -> int:
        return len(self._meta)


# ── Standalone Module-level Functions (For Test Scripts & Teammate Integration) ──

_default_kb = KnowledgeBase()


def ingest_pdf(pdf_path: str | Path, source_doc: str = "") -> int:
    """Chunk a code PDF and add it to the index. Run this once at setup time per PDF."""
    return _default_kb.ingest_pdf(pdf_path)


def retrieve_relevant_codes(query: str, top_k: int = 5) -> str:
    """
    Query the knowledge base and return a formatted string of the top-k
    relevant code excerpts, each tagged with its source + section for citation.
    """
    results = _default_kb.query(query_text=query, n_results=top_k)
    if not results:
        return "No relevant code excerpts found."

    formatted = []
    for r in results:
        formatted.append(
            f"[Source: {r['source']}, Section: {r['section']}, Page: {r['page']}]\n{r['text']}"
        )
    return "\n\n---\n\n".join(formatted)


def build_query_from_spatial_data(spatial_data: dict) -> str:
    """
    Turn extracted measurements into a retrieval query so RAG pulls the
    most relevant clauses (hallway widths, exits, staircases, etc.)
    rather than a generic search.
    """
    terms = []
    if spatial_data.get("rooms"):
        terms.append("minimum room area ventilation window requirements")
    if spatial_data.get("hallways"):
        terms.append("minimum corridor and hallway width fire escape requirements")
    if spatial_data.get("staircases"):
        terms.append("minimum staircase width and riser height requirements")
    if spatial_data.get("exits"):
        terms.append("minimum number of exits and maximum exit travel distance")
    if spatial_data.get("doors"):
        terms.append("exit door swing direction requirements")
    if spatial_data.get("windows"):
        terms.append("minimum window opening area ventilation natural lighting requirements")
    if spatial_data.get("structural_elements"):
        terms.append("minimum wall and column thickness structural requirements")
    if not terms:
        terms.append("general fire and life safety requirements")
    return "; ".join(terms)
