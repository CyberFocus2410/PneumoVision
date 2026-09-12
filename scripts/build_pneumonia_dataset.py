#!/usr/bin/env python
"""
CLI Script to scan and build structured metadata CSV for the Kaggle Pneumonia dataset.

Usage:
  python scripts/build_pneumonia_dataset.py --data-root /path/to/chest_xray --output data/processed/kaggle_pneumonia.csv
"""

import argparse
import logging
import sys
from pathlib import Path

# Ensure root workspace is in sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

from src.preprocessing.pneumonia_binary_loader import load_pneumonia_binary_dataset

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("build_pneumonia_dataset")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Build structured metadata CSV from Kaggle Pneumonia dataset.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--data-root",
        type=Path,
        required=True,
        help="Path to root of chest_xray directory (containing train/, test/, val/).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=WORKSPACE_ROOT / "data" / "processed" / "kaggle_pneumonia.csv",
        help="Destination path for output metadata CSV.",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    if not args.data_root.exists():
        logger.error(f"Provided data-root does not exist: {args.data_root}")
        sys.exit(1)

    logger.info(f"Loading dataset from: {args.data_root}")
    df = load_pneumonia_binary_dataset(args.data_root)

    if df.empty:
        logger.error("No images found. Please verify the folder structure.")
        sys.exit(1)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.output, index=False)
    logger.info(f"Saved metadata CSV ({len(df)} records) to: {args.output}")

    # Display dataset breakdown
    print("\n" + "=" * 60)
    print("  KAGGLE PNEUMONIA DATASET SUMMARY")
    print("=" * 60)
    print(f"Total Images:          {len(df)}")
    print(f"Unique Patient IDs:    {df['patient_id'].nunique()}")
    print(f"Pneumonia Cases:       {(df['Pneumonia'] == 1).sum()}")
    print(f"Normal Cases:          {(df['No_Finding'] == 1).sum()}")
    print("\nBreakdown by Original Split:")
    print(df.groupby(["original_split", "Pneumonia"]).size().unstack(fill_value=0).rename(columns={0: "NORMAL", 1: "PNEUMONIA"}))
    print("=" * 60)


if __name__ == "__main__":
    main()
