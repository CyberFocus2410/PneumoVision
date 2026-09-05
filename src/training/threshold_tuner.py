"""
Validation-Set Threshold Optimization for Multi-Label Findings.
Sweeps decision thresholds per class to maximize F1 score and clinical recall.
"""

from typing import Dict, List, Tuple
import numpy as np
from sklearn.metrics import precision_recall_curve, f1_score

def optimize_decision_thresholds(
    probs: np.ndarray,
    labels: np.ndarray,
    class_names: List[str],
    min_threshold: float = 0.10,
    max_threshold: float = 0.90,
    num_steps: int = 81
) -> Dict[str, Dict[str, float]]:
    """
    Performs grid sweep on validation probabilities to determine optimal operating threshold.
    
    Returns:
        {
            "Pneumonia": {"threshold": 0.38, "f1": 0.84, "precision": 0.82, "recall": 0.86},
            ...
        }
    """
    threshold_grid = np.linspace(min_threshold, max_threshold, num_steps)
    optimal_results = {}

    for i, cls_name in enumerate(class_names):
        cls_probs = probs[:, i]
        cls_labels = labels[:, i]

        best_th = 0.5
        best_f1 = -1.0
        best_prec = 0.0
        best_rec = 0.0

        for th in threshold_grid:
            preds = (cls_probs >= th).astype(int)
            
            tp = np.sum((preds == 1) & (cls_labels == 1))
            fp = np.sum((preds == 1) & (cls_labels == 0))
            fn = np.sum((preds == 0) & (cls_labels == 1))

            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            
            if (precision + recall) > 0:
                f1 = 2 * (precision * recall) / (precision + recall)
            else:
                f1 = 0.0

            if f1 > best_f1:
                best_f1 = f1
                best_th = th
                best_prec = precision
                best_rec = recall

        optimal_results[cls_name] = {
            "threshold": round(float(best_th), 2),
            "f1": round(float(best_f1), 4),
            "precision": round(float(best_prec), 4),
            "recall": round(float(best_rec), 4)
        }

    return optimal_results
