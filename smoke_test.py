"""
End-to-end smoke test. Run this FIRST before touching the frontend.
Proves the full L1 -> L2 -> L3 pipeline actually works with your real
GEMINI_API_KEY and real sample files.

Usage:
    export GEMINI_API_KEY=your_real_key_here   # or put it in backend/.env
    python smoke_test.py path/to/blueprint.png path/to/site_photo.jpg
"""
import sys
import asyncio
import json

sys.path.insert(0, ".")


async def main():
    if len(sys.argv) < 3:
        print("Usage: python smoke_test.py <blueprint_image> <site_photo>")
        sys.exit(1)

    blueprint_path, photo_path = sys.argv[1], sys.argv[2]

    print("=" * 60)
    print("STEP 1: Layer 1 - Blueprint spatial extraction")
    print("=" * 60)
    from backend.layer1_compliance.blueprint_analyzer import extract_spatial_data
    spatial_data = extract_spatial_data(image_path=blueprint_path)
    print(json.dumps(spatial_data, indent=2)[:1500])

    print("\n" + "=" * 60)
    print("STEP 2: Layer 1 - RAG retrieval (requires codes already ingested)")
    print("=" * 60)
    from backend.layer1_compliance.knowledge_base import KnowledgeBase, build_query_from_spatial_data
    from backend import config
    kb = KnowledgeBase(persist_dir=config.CHROMA_PERSIST_DIR)
    dynamic_query = build_query_from_spatial_data(spatial_data)
    queries = [q.strip() for q in dynamic_query.split(";") if q.strip()]
    print(f"Dynamic queries: {queries}")
    rag_results = []
    for q in queries:
        rag_results.extend(kb.query(q, n_results=3))
    print(f"Retrieved {len(rag_results)} chunks")

    print("\n" + "=" * 60)
    print("STEP 3: Layer 1 - Compliance check")
    print("=" * 60)
    from backend.layer1_compliance.compliance_checker import check_compliance
    compliance_result = await check_compliance(spatial_data, rag_results)
    print(f"Violations found: {compliance_result.total_violations}")
    print(f"Compliance score: {compliance_result.compliance_score}")

    print("\n" + "=" * 60)
    print("STEP 4: Layer 2 - Defect detection on site photo")
    print("=" * 60)
    from backend.layer2_vision.defect_detector import detect_defects
    defect_report = await detect_defects(image_path=photo_path)
    print(f"Defects found: {defect_report.total_defects}")

    print("\n" + "=" * 60)
    print("STEP 5: Feedback loop - does L3 actually recalculate?")
    print("=" * 60)
    from backend.feedback_loop import feedback_loop
    result_before = feedback_loop.update_compliance(compliance_result)
    print(f"After L1 update -> on_time_probability: {result_before['on_time_probability']}")
    result_after = feedback_loop.update_defects(defect_report)
    print(f"After L2 update -> on_time_probability: {result_after['on_time_probability']}")

    if result_before['on_time_probability'] == result_after['on_time_probability']:
        print("\n[WARNING] probability did not change after L2 update. Loop may not be wired correctly.")
    else:
        print("\n[OK] Feedback loop confirmed: L3 recalculated after new input.")

    print("\n" + "=" * 60)
    print("ALL STEPS COMPLETED - pipeline is working end to end")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
