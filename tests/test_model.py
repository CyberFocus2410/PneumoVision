"""
Unit tests for DenseNet Architecture, Calibration, and Loss Functions.
"""

import pytest
import numpy as np
import torch

from src.models.densenet import PneumoDenseNet
from src.models.calibration import ModelWithTemperature, compute_binary_ece, evaluate_multilabel_calibration
from src.training.losses import MultiLabelFocalLoss, WeightedBCEWithLogitsLoss
from src.config import TARGET_CLASSES

def test_densenet_forward():
    model = PneumoDenseNet(num_classes=5, pretrained=False)
    x = torch.randn(2, 3, 320, 320)
    
    # Test raw logits
    logits = model(x, return_logits=True)
    assert logits.shape == (2, 5)
    
    # Test sigmoid probabilities
    probs = model(x, return_logits=False)
    assert probs.shape == (2, 5)
    assert (probs >= 0.0).all() and (probs <= 1.0).all()

def test_temperature_scaling():
    base_model = PneumoDenseNet(num_classes=5, pretrained=False)
    calibrated = ModelWithTemperature(base_model, initial_temperature=1.5)
    
    x = torch.randn(2, 3, 320, 320)
    probs = calibrated(x, return_logits=False)
    assert probs.shape == (2, 5)
    assert calibrated.temperature.item() == pytest.approx(1.5, rel=1e-3)

def test_compute_binary_ece():
    probs = np.array([0.1, 0.2, 0.8, 0.9, 0.7, 0.3])
    labels = np.array([0, 0, 1, 1, 1, 0])
    ece, stats = compute_binary_ece(probs, labels, n_bins=5)
    assert ece >= 0.0
    assert ece <= 1.0
    assert len(stats["bin_sizes"]) == 5

def test_focal_loss():
    loss_fn = MultiLabelFocalLoss(gamma=2.0)
    logits = torch.randn(4, 5, requires_grad=True)
    targets = torch.randint(0, 2, (4, 5)).float()
    
    loss = loss_fn(logits, targets)
    assert loss.item() >= 0.0
    loss.backward()
    assert logits.grad is not None
