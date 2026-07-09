"""
SafeSite AI — Layer 1 — RAG Knowledge Base
Parses NBC 2016 / IS 456 PDFs → section-aware chunks → ChromaDB with bge-large-en-v1.5 embeddings.
"""

from __future__ import annotations

import hashlib
import logging
import re
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF

logger = logging.getLogger(__name__)


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


# ── ChromaDB Knowledge Base ─────────────────────────────────────────

class KnowledgeBase:
    """RAG knowledge base backed by ChromaDB."""

    def __init__(
        self,
        persist_dir: str = "./data/chroma_db",
        collection_name: str = "building_codes",
    ):
        self.persist_dir = persist_dir
        self.collection_name = collection_name
        self._client = None
        self._collection = None
        self._embedding_fn = None
        self._initialized = False

    def _ensure_init(self):
        """Lazy initialization of ChromaDB + embedding function."""
        if self._initialized:
            return

        import chromadb
        from chromadb.utils import embedding_functions

        self._embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="BAAI/bge-large-en-v1.5",
        )

        self._client = chromadb.Client()  # In-memory for hackathon speed
        self._collection = self._client.get_or_create_collection(
            name=self.collection_name,
            embedding_function=self._embedding_fn,
            metadata={"hnsw:space": "cosine"},
        )
        self._initialized = True
        logger.info(
            "ChromaDB initialized: collection=%s, docs=%d",
            self.collection_name,
            self._collection.count(),
        )

    def ingest_pdf(self, pdf_path: str | Path) -> int:
        """Parse a building code PDF and add chunks to the vector store."""
        self._ensure_init()
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

        # Batch upsert (ChromaDB handles deduplication by ID)
        batch_size = 100
        for i in range(0, len(all_chunks), batch_size):
            batch = all_chunks[i : i + batch_size]
            self._collection.upsert(
                ids=[c["id"] for c in batch],
                documents=[c["text"] for c in batch],
                metadatas=[
                    {
                        "source": c["source"],
                        "page": c["page"],
                        "section": c["section"],
                        "category": c["category"],
                    }
                    for c in batch
                ],
            )

        logger.info(
            "Ingested %d chunks from %s (total in DB: %d)",
            len(all_chunks),
            pdf_path.name,
            self._collection.count(),
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
    ) -> list[dict]:
        """Retrieve relevant code sections for a compliance query."""
        self._ensure_init()

        where_filter = None
        if category_filter:
            where_filter = {"category": category_filter}

        results = self._collection.query(
            query_texts=[query_text],
            n_results=n_results,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        retrieved = []
        if results and results["documents"]:
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            ):
                retrieved.append({
                    "text": doc,
                    "source": meta.get("source", ""),
                    "page": meta.get("page", 0),
                    "section": meta.get("section", ""),
                    "category": meta.get("category", ""),
                    "relevance_score": round(1 - dist, 4),
                })

        return retrieved

    @property
    def doc_count(self) -> int:
        self._ensure_init()
        return self._collection.count()
