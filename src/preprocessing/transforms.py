"""
Image Transformations, CLAHE Enhancement, and PyTorch Tensor Preprocessing.
"""

from typing import Tuple, Optional
import numpy as np
import cv2
from PIL import Image
import torch
import torchvision.transforms as T
import torchvision.transforms.functional as TF

from src.config import IMG_SIZE, IMAGE_MEAN, IMAGE_STD

class CLAHETransform:
    """Applies Contrast Limited Adaptive Histogram Equalization for cross-scanner normalization."""
    def __init__(self, clip_limit: float = 2.0, tile_grid_size: Tuple[int, int] = (8, 8)):
        self.clip_limit = clip_limit
        self.tile_grid_size = tile_grid_size
        self.clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)

    def __call__(self, img: Image.Image) -> Image.Image:
        np_img = np.array(img.convert("L"))
        enhanced = self.clahe.apply(np_img)
        # Convert back to 3-channel RGB for standard CNN backbones
        rgb_enhanced = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2RGB)
        return Image.fromarray(rgb_enhanced)


def get_inference_transforms(apply_clahe: bool = True) -> T.Compose:
    """
    Deterministic preprocessing pipeline for validation, testing, and production inference.
    Resizes to 320x320, optionally applies CLAHE, converts to tensor, and applies ImageNet normalization.
    """
    transforms_list = []
    if apply_clahe:
        transforms_list.append(CLAHETransform(clip_limit=2.0))
    else:
        transforms_list.append(T.Lambda(lambda img: img.convert("RGB")))

    transforms_list.extend([
        T.Resize(IMG_SIZE, interpolation=T.InterpolationMode.BILINEAR),
        T.ToTensor(),
        T.Normalize(mean=IMAGE_MEAN, std=IMAGE_STD)
    ])
    return T.Compose(transforms_list)


def get_training_transforms(apply_clahe: bool = True) -> T.Compose:
    """
    Training augmentation pipeline:
    - Rotation ±7 degrees (mild to avoid extreme skew)
    - Translation ±5%
    - Brightness & Contrast jitter (±10%)
    - NO HORIZONTAL FLIP (preserves anatomical cardiac and hemithorax laterality)
    """
    transforms_list = []
    if apply_clahe:
        transforms_list.append(CLAHETransform(clip_limit=2.0))
    else:
        transforms_list.append(T.Lambda(lambda img: img.convert("RGB")))

    transforms_list.extend([
        T.Resize(IMG_SIZE, interpolation=T.InterpolationMode.BILINEAR),
        T.RandomAffine(
            degrees=(-7, 7),
            translate=(0.05, 0.05),
            scale=(0.95, 1.05),
            interpolation=T.InterpolationMode.BILINEAR
        ),
        T.ColorJitter(brightness=0.10, contrast=0.10),
        T.ToTensor(),
        T.Normalize(mean=IMAGE_MEAN, std=IMAGE_STD)
    ])
    return T.Compose(transforms_list)


def preprocess_pil_for_inference(pil_img: Image.Image, apply_clahe: bool = True) -> torch.Tensor:
    """Helper that returns a batch tensor [1, 3, 320, 320] ready for model input."""
    pipeline = get_inference_transforms(apply_clahe=apply_clahe)
    tensor = pipeline(pil_img)
    return tensor.unsqueeze(0)
