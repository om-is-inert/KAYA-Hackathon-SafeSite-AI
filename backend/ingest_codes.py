"""
Run this ONCE to build the RAG knowledge base from your code PDFs, before
running the API. Usage:

    python -m backend.ingest_codes "Info on construction/NBC2016-Part-IV.pdf" NBC2016
    python -m backend.ingest_codes "Info on construction/is.456.2000.pdf" IS456
"""
import sys

from backend.layer1_compliance.knowledge_base import ingest_pdf, retrieve_relevant_codes

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print('Usage: python -m backend.ingest_codes "path/to/code.pdf" SOURCE_LABEL')
        sys.exit(1)

    pdf_path, source_label = sys.argv[1], sys.argv[2]
    ingest_pdf(pdf_path, source_label)

    # quick sanity check
    print("\n--- Sanity check retrieval ---")
    results = retrieve_relevant_codes("minimum hallway width for fire escape corridor", top_k=2)
    # Encode to ASCII to avoid Windows cp1252 errors from PDF Unicode chars
    print(results.encode("ascii", errors="replace").decode("ascii"))
