"""
Run this FIRST, before touching FastAPI. Proves the VLM extraction works
on a real blueprint image. Usage:

    python -m backend.test_extract path/to/blueprint.png
"""
import sys
import json

from backend.layer1_compliance.blueprint_analyzer import extract_spatial_data

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m backend.test_extract path/to/blueprint.png")
        sys.exit(1)

    image_path = sys.argv[1]
    print(f"[test_extract] Sending {image_path} to Gemini 2.5 Flash...")

    result = extract_spatial_data(image_path)
    print(json.dumps(result, indent=2))
