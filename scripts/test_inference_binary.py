import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent if Path(__file__).resolve().parent.name == "scripts" else Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

import torch
from src.inference.engine import PneumoInferenceEngine
from PIL import Image


def main():
    print("=== Testing PneumoInferenceEngine Binary Mode ===")
    engine = PneumoInferenceEngine()
    print("Target classes:", engine.target_classes)
    print("Num output classes:", engine.num_output_classes)
    print("Thresholds:", engine.thresholds)
    print("Temperature:", engine.temperature)

    # Test with sample image
    sample_img = Path("tests/fixtures/chest_xray/train/PNEUMONIA/person1946_bacteria_4874.jpeg")
    if not sample_img.exists():
        sample_img = Path("data/samples/sample_pneumonia.png")

    print(f"\n[*] Running inference on: {sample_img}")
    results = engine.predict(sample_img, use_tta=True, use_mc_dropout=True, save_heatmaps=True)

    print("\n--- Diagnostic Results ---")
    print(f"Primary Finding: {results['primary_finding']}")
    print(f"Quality Status:  {results['quality_status']}")
    print("Predictions:")
    for p in results["predictions"]:
        print(f"  - {p['label']:<15}: {p['probability_percent']:>5.1f}% (threshold: {p['threshold']*100:.0f}%, positive: {p['positive']}, band: {p['confidence_band']})")

    print("\nHeatmaps:")
    for k, v in results["heatmaps"].items():
        print(f"  - {k}: {v['overlay_url']}")

    print("\n[SUCCESS] Grad-CAM and binary inference passed!")

if __name__ == "__main__":
    main()
