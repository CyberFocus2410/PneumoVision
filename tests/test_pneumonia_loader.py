"""
Unit tests for Kaggle Pneumonia Binary Dataset Loader and patient ID extraction.
"""

import logging
from pathlib import Path
import pytest
import pandas as pd

from src.preprocessing.pneumonia_binary_loader import (
    load_pneumonia_binary_dataset,
    extract_patient_id,
    resolve_chest_xray_root,
    EXPECTED_COLUMNS,
)

FIXTURES_ROOT = Path(__file__).resolve().parent / "fixtures" / "chest_xray"


def test_extract_patient_id():
    # Matches personXXXX pattern
    pid1, reliable1 = extract_patient_id("person1946_bacteria_4874.jpeg")
    assert reliable1 is True
    assert pid1 == "person1946"

    pid2, reliable2 = extract_patient_id("person42_virus_11.jpeg")
    assert reliable2 is True
    assert pid2 == "person42"

    # Fallback to image_id
    pid_norm, reliable_norm = extract_patient_id("NORMAL2-IM-1427-0001.jpeg")
    assert reliable_norm is False
    assert pid_norm == "NORMAL2-IM-1427-0001.jpeg"


def test_resolve_chest_xray_root():
    # Direct path with train/test/val
    resolved = resolve_chest_xray_root(FIXTURES_ROOT)
    assert resolved == FIXTURES_ROOT

    # Parent path containing chest_xray folder
    parent_resolved = resolve_chest_xray_root(FIXTURES_ROOT.parent)
    assert parent_resolved == FIXTURES_ROOT


def test_loader_schema_and_columns():
    df = load_pneumonia_binary_dataset(FIXTURES_ROOT)

    # Check columns
    assert list(df.columns) == EXPECTED_COLUMNS

    # Check total records: 5 train + 2 test + 2 val = 9 images
    assert len(df) == 9


def test_patient_id_grouping_and_fallback():
    df = load_pneumonia_binary_dataset(FIXTURES_ROOT)

    # person1946 has 2 images in train fixture
    person1946_rows = df[df["patient_id"] == "person1946"]
    assert len(person1946_rows) == 2
    assert all(person1946_rows["Pneumonia"] == 1)

    # Normal images fallback to their filename
    normal_rows = df[df["Pneumonia"] == 0]
    for _, row in normal_rows.iterrows():
        assert row["patient_id"] == row["image_id"]
        assert row["No_Finding"] == 1


def test_inverse_finding_and_source_dataset():
    df = load_pneumonia_binary_dataset(FIXTURES_ROOT)

    # Ensure source_dataset is set
    assert (df["source_dataset"] == "kaggle_pneumonia_binary").all()

    # Ensure Pneumonia and No_Finding are mutually exclusive / inverse
    assert (df["Pneumonia"] + df["No_Finding"] == 1).all()

    # Check split column
    assert set(df["original_split"].unique()) == {"train", "test", "val"}


def test_loader_logging(caplog):
    with caplog.at_level(logging.INFO):
        df = load_pneumonia_binary_dataset(FIXTURES_ROOT)
        assert len(df) == 9

    # Verify log messages captured patient counts
    assert "Pneumonia Binary Dataset loaded" in caplog.text
    assert "Fallback (image_id) patient IDs" in caplog.text
