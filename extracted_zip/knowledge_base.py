"""
Layer 1 - RAG knowledge base for building codes.

Pipeline: PDF (PyMuPDF) -> section-aware chunks -> bge-large-en-v1.5 embeddings -> ChromaDB
"""
import re
import fitz  # PyMuPDF
import chromadb
from sentence_transformers import SentenceTransformer

from backend import config

_embedder = None
_client = None
_collection = None


def _get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer(config.EMBEDDING_MODEL)
    return _embedder


def _get_collection():
    global _client, _collection
    if _collection is None:
        _client = chromadb.PersistentClient(path=config.CHROMA_PERSIST_DIR)
        _collection = _client.get_or_create_collection(name=config.CHROMA_COLLECTION_NAME)
    return _collection


def _chunk_pdf_text(pdf_path: str, source_doc: str) -> list[dict]:
    """
    Section-aware chunking: split on section/clause headers where possible,
    fall back to fixed-size chunks with overlap. Keeps section_number + page
    as metadata so every retrieved chunk carries a citation.
    """
    doc = fitz.open(pdf_path)
    chunks = []
    section_header_re = re.compile(r"^(§?\s?\d+(\.\d+)*\.?\s+[A-Z].{0,80})", re.MULTILINE)

    for page_num, page in enumerate(doc, start=1):
        text = page.get_text()
        if not text.strip():
            continue

        headers = list(section_header_re.finditer(text))
        if headers:
            for i, match in enumerate(headers):
                start = match.start()
                end = headers[i + 1].start() if i + 1 < len(headers) else len(text)
                section_text = text[start:end].strip()
                section_title = match.group(1).strip()
                if len(section_text) > 30:
                    chunks.append({
                        "text": section_text[:2000],  # cap chunk length
                        "source_doc": source_doc,
                        "section_title": section_title,
                        "page": page_num,
                    })
        else:
            # fallback: fixed-size chunk for pages with no detected headers
            words = text.split()
            step = config.CHUNK_SIZE_TOKENS - config.CHUNK_OVERLAP_TOKENS
            for i in range(0, len(words), step):
                chunk_words = words[i:i + config.CHUNK_SIZE_TOKENS]
                if chunk_words:
                    chunks.append({
                        "text": " ".join(chunk_words),
                        "source_doc": source_doc,
                        "section_title": "unlabeled",
                        "page": page_num,
                    })
    return chunks


def ingest_pdf(pdf_path: str, source_doc: str):
    """Chunk a code PDF and add it to ChromaDB. Run this once at setup time per PDF."""
    collection = _get_collection()
    embedder = _get_embedder()

    chunks = _chunk_pdf_text(pdf_path, source_doc)
    if not chunks:
        print(f"[knowledge_base] WARNING: no text extracted from {pdf_path}")
        return

    texts = [c["text"] for c in chunks]
    embeddings = embedder.encode(texts, show_progress_bar=True, normalize_embeddings=True).tolist()
    ids = [f"{source_doc}_p{c['page']}_{i}" for i, c in enumerate(chunks)]
    metadatas = [{"source_doc": c["source_doc"], "section_title": c["section_title"], "page": c["page"]} for c in chunks]

    collection.add(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
    print(f"[knowledge_base] Ingested {len(chunks)} chunks from {source_doc}")


def retrieve_relevant_codes(query: str, top_k: int = None) -> str:
    """
    Query the knowledge base and return a formatted string of the top-k
    relevant code excerpts, each tagged with its source + section for citation.
    """
    top_k = top_k or config.RAG_TOP_K
    collection = _get_collection()
    embedder = _get_embedder()

    query_embedding = embedder.encode([query], normalize_embeddings=True).tolist()
    results = collection.query(query_embeddings=query_embedding, n_results=top_k)

    if not results["documents"] or not results["documents"][0]:
        return "No relevant code excerpts found."

    formatted = []
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        formatted.append(
            f"[Source: {meta['source_doc']}, Section: {meta['section_title']}, Page: {meta['page']}]\n{doc}"
        )
    return "\n\n---\n\n".join(formatted)


def build_query_from_spatial_data(spatial_data: dict) -> str:
    """
    Turn extracted measurements into a retrieval query so RAG pulls the
    most relevant clauses (hallway widths, exits, staircases, etc.)
    rather than a generic search.
    """
    terms = []
    if spatial_data.get("hallways"):
        terms.append("minimum corridor and hallway width fire escape requirements")
    if spatial_data.get("staircases"):
        terms.append("minimum staircase width and riser height requirements")
    if spatial_data.get("exits"):
        terms.append("minimum number of exits and maximum exit travel distance")
    if spatial_data.get("doors"):
        terms.append("exit door swing direction requirements")
    if spatial_data.get("structural_elements"):
        terms.append("minimum wall and column thickness structural requirements")
    if not terms:
        terms.append("general fire and life safety requirements")
    return "; ".join(terms)
