"""
DICOM Parser and De-identification Handler for PneumoVision
Extracts calibrated image arrays and metadata while strictly stripping PHI.
"""

from typing import Dict, Any, Tuple, Optional
import numpy as np
from PIL import Image
import io

try:
    import pydicom
    from pydicom.pixel_data_handlers.util import apply_voi_lut
    HAS_PYDICOM = True
except ImportError:
    HAS_PYDICOM = False


def read_dicom_file(file_bytes_or_path) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Parses a DICOM file or in-memory bytes stream.
    Normalizes pixel intensities to 8-bit [0, 255] grayscale array,
    inverting MONOCHROME1 to standard MONOCHROME2 display presentation.
    Strips all Patient Identifiers (Name, ID, DOB, Address, Institution).
    """
    if not HAS_PYDICOM:
        raise ImportError("pydicom is required to parse DICOM files. Please install pydicom.")

    if isinstance(file_bytes_or_path, (bytes, bytearray)):
        ds = pydicom.dcmread(io.BytesIO(file_bytes_or_path), force=True)
    else:
        ds = pydicom.dcmread(str(file_bytes_or_path), force=True)

    # Extract pixel array with VOI LUT if available
    try:
        pixel_array = apply_voi_lut(ds.pixel_array, ds)
    except Exception:
        pixel_array = ds.pixel_array.astype(float)

    # Photometric interpretation check (MONOCHROME1 has 0 as bright white, needs inversion)
    photometric = getattr(ds, "PhotometricInterpretation", "MONOCHROME2")
    if photometric == "MONOCHROME1":
        pixel_array = np.amax(pixel_array) - pixel_array

    # Min-max normalization to [0, 255] uint8
    p_min = np.min(pixel_array)
    p_max = np.max(pixel_array)
    if p_max > p_min:
        norm_array = ((pixel_array - p_min) / (p_max - p_min) * 255.0).astype(np.uint8)
    else:
        norm_array = np.zeros_like(pixel_array, dtype=np.uint8)

    # Extract safe acquisition metadata (NO PHI)
    metadata: Dict[str, Any] = {
        "modality": getattr(ds, "Modality", "CR/DX"),
        "view_position": getattr(ds, "ViewPosition", "PA"),
        "patient_orientation": getattr(ds, "PatientOrientation", "L/F"),
        "photometric_interpretation": photometric,
        "rows": getattr(ds, "Rows", norm_array.shape[0]),
        "columns": getattr(ds, "Columns", norm_array.shape[1]),
        "kvp": getattr(ds, "KVP", None),
        "exposure_time_ms": getattr(ds, "ExposureTime", None),
        "body_part_examined": getattr(ds, "BodyPartExamined", "CHEST"),
        "has_phi_stripped": True
    }

    return norm_array, metadata


def is_dicom_file(data_bytes: bytes) -> bool:
    """Checks if the initial byte buffer matches DICOM preamble or magic header."""
    if len(data_bytes) < 132:
        return False
    return data_bytes[128:132] == b"DICM"
