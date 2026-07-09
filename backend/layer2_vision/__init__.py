"""
SafeSite AI — Layer 2 — Vision Engine
Integrates:
  1. Structural Defect Detector (VLM / YOLOv11)
  2. SH17 PPE Safety Detector (YOLOv10 / VLM)
  3. BD3 Building Defect Classifier (ViT-patch16 / VLM)
  4. LTTM Scan-to-BIM Bridge (HePIC Point Cloud / BIM-Net++)
"""

from backend.layer2_vision.defect_detector import detect_defects
from backend.layer2_vision.ppe_detector import detect_ppe, SH17_CLASSES, MANDATORY_PPE
from backend.layer2_vision.defect_classifier import classify_building_defects, BD3_CLASSES, BD3_SEVERITY
from backend.layer2_vision.scan_to_bim import scan_to_bim, ScanToBIMBridge, DeviationReport, BIMElement

__all__ = [
    "detect_defects",
    "detect_ppe",
    "SH17_CLASSES",
    "MANDATORY_PPE",
    "classify_building_defects",
    "BD3_CLASSES",
    "BD3_SEVERITY",
    "scan_to_bim",
    "ScanToBIMBridge",
    "DeviationReport",
    "BIMElement",
]
