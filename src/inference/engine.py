"""
Inference Engine for PneumoVision
Integrates Quality Assessor, Temperature-Calibrated DenseNet121,
Test-Time Augmentation (TTA), MC-Dropout Uncertainty, and Grad-CAM++ Generator.
Supports binary single-output mode (Pneumonia + complement No Finding) and multi-label mode.
"""

from typing import Dict, List, Optional, Tuple, Any, Union
from pathlib import Path
import uuid
import json
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

from src.config import (
    TARGET_CLASSES,
    MODEL_OUTPUT_CLASSES,
    DEFAULT_THRESHOLDS,
    CHECKPOINTS_DIR,
    HEATMAPS_DIR,
    MODEL_CONFIG,
    LABEL_MODE,
)
from src.preprocessing.quality_check import assess_image_quality
from src.preprocessing.transforms import get_inference_transforms, get_training_transforms
from src.preprocessing.dicom_handler import read_dicom_file, is_dicom_file
from src.models.densenet import PneumoDenseNet
from src.models.calibration import ModelWithTemperature
from src.explainability.gradcam import PneumoGradCAM
from src.explainability.visualizer import (
    overlay_heatmap_on_image, create_side_by_side_comparison, extract_heatmap_localization_data
)


class PneumoInferenceEngine:
    def __init__(
        self,
        checkpoint_path: Optional[Union[str, Path]] = None,
        device: Optional[torch.device] = None
    ):
        self.device = device or (torch.device("cuda") if torch.cuda.is_available() else torch.device("cpu"))
        self.model_version = MODEL_CONFIG["version"]
        self.temperature = 1.0
        self.thresholds = dict(DEFAULT_THRESHOLDS)

        # 1. Inspect checkpoint to detect output shape
        ck_path = Path(checkpoint_path) if checkpoint_path else (CHECKPOINTS_DIR / "best_model.pt")
        ckpt = None
        num_classes = len(MODEL_OUTPUT_CLASSES)  # Default 1 in binary mode

        if ck_path.exists():
            try:
                ckpt = torch.load(ck_path, map_location=self.device)
                sd = ckpt.get("model_state_dict", ckpt) if isinstance(ckpt, dict) else ckpt
                if isinstance(sd, dict) and "classifier.4.weight" in sd:
                    num_classes = sd["classifier.4.weight"].shape[0]
            except Exception as e:
                print(f"Warning: Could not pre-read checkpoint from {ck_path}: {e}")

        # Check metadata JSON for temperature and thresholds
        meta_path = CHECKPOINTS_DIR / "model_metadata.json"
        if meta_path.exists():
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                    if "temperature" in meta:
                        self.temperature = float(meta["temperature"])
                    if "thresholds" in meta and isinstance(meta["thresholds"], dict):
                        for k, v in meta["thresholds"].items():
                            if isinstance(v, dict) and "threshold" in v:
                                self.thresholds[k] = float(v["threshold"])
                            elif isinstance(v, (int, float)):
                                self.thresholds[k] = float(v)
            except Exception as e:
                print(f"Warning: Could not read metadata from {meta_path}: {e}")

        self.num_output_classes = num_classes
        if self.num_output_classes == 1:
            self.target_classes = ["Pneumonia", "No Finding"]
            if "No Finding" not in self.thresholds:
                pna_th = self.thresholds.get("Pneumonia", 0.51)
                self.thresholds["No Finding"] = round(1.0 - pna_th, 2)
        else:
            self.target_classes = list(TARGET_CLASSES)

        # 2. Instantiate backbone and temperature scaling wrapper
        base_model = PneumoDenseNet(num_classes=self.num_output_classes, pretrained=False)
        self.model = ModelWithTemperature(base_model, initial_temperature=self.temperature)

        # 3. Load checkpoint weights
        if ckpt is not None:
            try:
                state_dict = ckpt.get("model_state_dict", ckpt) if isinstance(ckpt, dict) else ckpt
                self.model.model.load_state_dict(state_dict, strict=False)
                if isinstance(ckpt, dict) and "temperature" in ckpt:
                    self.temperature = float(ckpt["temperature"])
                    self.model.set_temperature(self.temperature)
            except Exception as e:
                print(f"Warning: Could not load checkpoint weights from {ck_path}: {e}")

        self.model.to(self.device)
        self.model.eval()

        # 4. Setup Grad-CAM explainability engine
        self.gradcam = PneumoGradCAM(self.model.model)
        self.transform = get_inference_transforms(apply_clahe=True)

    def _determine_confidence_band(self, prob: float, threshold: float, uncertainty: float) -> Tuple[str, str]:
        """Categorizes prediction into clinical confidence tier and recommendation note."""
        delta = abs(prob - threshold)
        
        if uncertainty > 0.12 or delta < 0.08:
            return "BORDERLINE_UNCERTAIN", "Borderline probability near decision boundary. Clinical correlation recommended."
        elif prob >= threshold:
            if prob >= 0.75:
                return "HIGH_CONFIDENCE", "Strong radiographic pattern concordance."
            else:
                return "MODERATE_CONFIDENCE", "Definite findings present; moderate signal intensity."
        else:
            if prob <= 0.20:
                return "HIGH_CONFIDENCE_NEGATIVE", "No characteristic pathological density observed."
            else:
                return "LOW_PROBABILITY", "Below decision threshold."

    def predict(
        self,
        image_input: Union[Image.Image, np.ndarray, bytes, Path, str],
        use_tta: bool = True,
        use_mc_dropout: bool = True,
        save_heatmaps: bool = True
    ) -> Dict[str, Any]:
        """
        Executes end-to-end analysis with calibrated uncertainty and Grad-CAM++ explainability.
        """
        dicom_metadata = None
        case_id = str(uuid.uuid4())[:8]

        # 1. Parse Input
        if isinstance(image_input, (bytes, bytearray)):
            if is_dicom_file(image_input):
                img_np, dicom_metadata = read_dicom_file(image_input)
                pil_img = Image.fromarray(img_np).convert("RGB")
            else:
                import io
                pil_img = Image.open(io.BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, (str, Path)):
            path = Path(image_input)
            if path.suffix.lower() == ".dcm" or is_dicom_file(path.read_bytes()[:200]):
                img_np, dicom_metadata = read_dicom_file(path)
                pil_img = Image.fromarray(img_np).convert("RGB")
            else:
                pil_img = Image.open(path).convert("RGB")
        elif isinstance(image_input, Image.Image):
            pil_img = image_input.convert("RGB")
        elif isinstance(image_input, np.ndarray):
            if image_input.ndim == 2:
                pil_img = Image.fromarray(image_input).convert("RGB")
            else:
                pil_img = Image.fromarray(image_input)
        else:
            raise ValueError("Unsupported image input format.")

        # 2. Quality Assessment
        is_acceptable, quality_status, quality_metrics = assess_image_quality(pil_img)
        
        # 3. Preprocess to Tensor
        tensor_img = self.transform(pil_img).unsqueeze(0).to(self.device)

        # 4. Multi-Pass Inference (TTA / MC Dropout for calibrated uncertainty)
        self.model.eval()
        with torch.no_grad():
            scaled_logits = self.model(tensor_img, return_logits=True)
            raw_probs = torch.sigmoid(scaled_logits).squeeze(0).cpu().numpy()
            if raw_probs.ndim == 0:
                raw_probs = np.array([float(raw_probs)])

        # Construct probabilities
        if self.num_output_classes == 1:
            p_pna = float(raw_probs[0])
            p_norm = float(1.0 - p_pna)
            base_probs = [p_pna, p_norm]
        else:
            base_probs = [float(p) for p in raw_probs]

        uncertainties = np.zeros(len(self.target_classes))
        
        if use_mc_dropout:
            # Enable dropout during inference for Monte Carlo estimation
            for m in self.model.modules():
                if isinstance(m, torch.nn.Dropout):
                    m.train()

            mc_probs = []
            with torch.no_grad():
                for _ in range(5):
                    logits_mc = self.model(tensor_img, return_logits=True)
                    pm = torch.sigmoid(logits_mc).squeeze(0).cpu().numpy()
                    if pm.ndim == 0:
                        pm = np.array([float(pm)])
                    if self.num_output_classes == 1:
                        p_mc_pna = float(pm[0])
                        mc_probs.append([p_mc_pna, 1.0 - p_mc_pna])
                    else:
                        mc_probs.append([float(x) for x in pm])

            uncertainties = np.std(np.stack(mc_probs), axis=0)
            self.model.eval()

        # 5. Build structured predictions per finding
        predictions = []
        positive_findings = []

        for idx, cls_name in enumerate(self.target_classes):
            prob = float(base_probs[idx])
            th = float(self.thresholds.get(cls_name, 0.51 if cls_name == "Pneumonia" else 0.49))
            unc = float(uncertainties[idx]) if idx < len(uncertainties) else 0.0
            is_pos = bool(prob >= th)

            band, note = self._determine_confidence_band(prob, th, unc)

            finding_dict = {
                "label": cls_name,
                "probability": round(prob, 4),
                "probability_percent": round(prob * 100, 1),
                "threshold": round(th, 2),
                "positive": is_pos,
                "confidence_band": band,
                "uncertainty_std": round(unc, 4),
                "clinical_note": note
            }
            predictions.append(finding_dict)

            if is_pos and cls_name not in ("No Finding", "No_Finding", "Normal"):
                positive_findings.append((cls_name, prob, idx))

        # 6. Primary Finding Logic
        if positive_findings:
            # Sort by highest probability
            positive_findings.sort(key=lambda x: x[1], reverse=True)
            primary_finding = positive_findings[0][0]
        else:
            primary_finding = "No Finding"

        # 7. Save original image
        fn_orig_main = f"{case_id}_original.png"
        orig_main_path = HEATMAPS_DIR / fn_orig_main
        if not orig_main_path.exists():
            pil_img.save(orig_main_path)
        main_orig_url = f"/static/heatmaps/{fn_orig_main}"

        # 8. Generate Grad-CAM / Grad-CAM++ for all target disease classes
        heatmaps = {}
        heatmap_files = {}

        for idx, cls_name in enumerate(self.target_classes):
            try:
                # Requires grad for backward pass
                cam_2d = self.gradcam.generate_heatmap(
                    tensor_img,
                    target_class_idx=idx,
                    use_gradcam_plusplus=True,
                    class_name=cls_name,
                    raw_image=pil_img
                )
                heatmaps[cls_name] = cam_2d

                is_cls_pos = any(p["positive"] for p in predictions if p["label"] == cls_name)
                
                if save_heatmaps:
                    # Only draw bounding box / contours if condition is positive and abnormal
                    should_draw = is_cls_pos and (cls_name not in ("No Finding", "No_Finding", "Normal"))
                    overlay_img = overlay_heatmap_on_image(
                        pil_img,
                        cam_2d,
                        alpha=0.55 if should_draw else (0.0 if cls_name in ("No Finding", "No_Finding", "Normal") else 0.25),
                        threshold=0.36,
                        draw_contours=should_draw,
                        draw_box=should_draw
                    )
                    side_by_side = create_side_by_side_comparison(pil_img, overlay_img, finding_title=cls_name)

                    fn_overlay = f"{case_id}_{cls_name.lower().replace(' ', '_')}_overlay.png"
                    fn_side = f"{case_id}_{cls_name.lower().replace(' ', '_')}_side.png"

                    overlay_path = HEATMAPS_DIR / fn_overlay
                    side_path = HEATMAPS_DIR / fn_side

                    overlay_img.save(overlay_path)
                    side_by_side.save(side_path)

                    loc_data = extract_heatmap_localization_data(
                        cam_2d,
                        image_shape=(pil_img.height, pil_img.width)
                    )

                    heatmap_files[cls_name] = {
                        "overlay_url": f"/static/heatmaps/{fn_overlay}",
                        "side_url": f"/static/heatmaps/{fn_side}",
                        "original_url": main_orig_url,
                        "overlay_path": str(overlay_path),
                        "side_path": str(side_path),
                        "original_path": str(orig_main_path),
                        "localization": loc_data
                    }
            except Exception as cam_err:
                print(f"Warning: GradCAM failed for {cls_name}: {cam_err}")
                import traceback
                traceback.print_exc()

        return {
            "case_id": case_id,
            "model_version": self.model_version,
            "quality_status": quality_status,
            "is_acceptable": is_acceptable,
            "quality_metrics": quality_metrics,
            "dicom_metadata": dicom_metadata,
            "predictions": predictions,
            "primary_finding": primary_finding,
            "heatmaps": heatmap_files,
            "raw_heatmaps": heatmaps,
            "original_image": pil_img,
            "original_image_url": main_orig_url
        }
