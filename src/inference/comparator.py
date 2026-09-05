"""
Longitudinal Comparison Engine for PneumoVision
Compares baseline (prior) and follow-up (current) chest radiographs to assess disease progression.
"""

from typing import Dict, Any, List, Union
from PIL import Image
from src.inference.engine import PneumoInferenceEngine

class LongitudinalComparator:
    def __init__(self, engine: PneumoInferenceEngine):
        self.engine = engine

    def compare_studies(
        self,
        prior_image: Union[Image.Image, bytes, str],
        current_image: Union[Image.Image, bytes, str]
    ) -> Dict[str, Any]:
        """
        Runs dual inference and calculates finding-by-finding longitudinal progression.
        """
        prior_res = self.engine.predict(prior_image, save_heatmaps=True)
        current_res = self.engine.predict(current_image, save_heatmaps=True)

        prior_preds = {p["label"]: p for p in prior_res["predictions"]}
        current_preds = {p["label"]: p for p in current_res["predictions"]}

        comparison_findings = []

        for label in self.engine.target_classes:
            p_prior = prior_preds[label]["probability"]
            p_curr = current_preds[label]["probability"]
            delta = round(p_curr - p_prior, 4)
            delta_pct = round(delta * 100, 1)

            # Categorize longitudinal trajectory
            if label == "No Finding":
                if delta > 0.15:
                    trajectory = "CLEARING_TO_NORMAL"
                elif delta < -0.15:
                    trajectory = "DEVELOPING_PATHOLOGY"
                else:
                    trajectory = "STABLE"
            else:
                if delta >= 0.15:
                    trajectory = "MARKED_PROGRESSION" # worsening
                elif delta >= 0.06:
                    trajectory = "SLIGHT_INCREASE"
                elif delta <= -0.15:
                    trajectory = "MARKED_RESOLUTION" # improvement
                elif delta <= -0.06:
                    trajectory = "PARTIAL_IMPROVEMENT"
                else:
                    trajectory = "STABLE"

            comparison_findings.append({
                "label": label,
                "prior_probability": p_prior,
                "current_probability": p_curr,
                "delta": delta,
                "delta_percent": delta_pct,
                "trajectory": trajectory,
                "prior_positive": prior_preds[label]["positive"],
                "current_positive": current_preds[label]["positive"]
            })

        return {
            "comparison_id": f"comp_{prior_res['case_id']}_{current_res['case_id']}",
            "prior_case_id": prior_res["case_id"],
            "current_case_id": current_res["case_id"],
            "prior_primary": prior_res["primary_finding"],
            "current_primary": current_res["primary_finding"],
            "findings_comparison": comparison_findings,
            "prior_heatmaps": prior_res["heatmaps"],
            "current_heatmaps": current_res["heatmaps"]
        }
