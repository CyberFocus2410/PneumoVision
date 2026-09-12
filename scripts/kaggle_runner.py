#!/usr/bin/env python
"""
PneumoVision Kaggle Remote GPU Runner

Automates running deep learning training jobs directly on Kaggle GPUs:
1. Configures authentication using the local kaggle.json token.
2. Stages the training script and bundles required modules (src/).
3. Pushes the kernel to Kaggle via Kaggle API / CLI with GPU enabled.
4. Polls status (queued -> running -> complete / error) with live progress.
5. Pulls output artifacts (checkpoints, logs, metrics) back into models/checkpoints/.
"""

import argparse
import json
import os
import shutil
import sys
import time
from pathlib import Path
from typing import List, Optional, Tuple

WORKSPACE_ROOT = Path(__file__).resolve().parent.parent


def get_default_kaggle_json_path() -> Optional[Path]:
    """Find kaggle.json in workspace or standard ~/.kaggle path."""
    candidates = [
        WORKSPACE_ROOT / "kaggle.json",
        Path.home() / ".kaggle" / "kaggle.json",
        Path(os.environ.get("KAGGLE_CONFIG_DIR", "")) / "kaggle.json"
        if os.environ.get("KAGGLE_CONFIG_DIR")
        else None,
    ]
    for p in candidates:
        if p and p.is_file():
            return p
    return None


def setup_kaggle_credentials(token_path: Optional[Path] = None) -> Tuple[bool, str, str]:
    """
    Ensures KAGGLE_CONFIG_DIR / credentials are setup.
    Returns (success, username, error_message).
    """
    target_token = token_path or get_default_kaggle_json_path()

    if not target_token or not target_token.is_file():
        return (
            False,
            "",
            f"Kaggle token not found. Checked default locations and workspace: {WORKSPACE_ROOT / 'kaggle.json'}",
        )

    try:
        with open(target_token, "r", encoding="utf-8") as f:
            data = json.load(f)
            username = data.get("username", "")
            key = data.get("key", "")
            if not username or not key:
                return False, "", f"Invalid kaggle.json format in {target_token}."
    except Exception as e:
        return False, "", f"Error reading {target_token}: {e}"

    os.environ["KAGGLE_CONFIG_DIR"] = str(target_token.parent)
    os.environ["KAGGLE_USERNAME"] = username
    os.environ["KAGGLE_KEY"] = key

    return True, username, ""


def get_kaggle_api():
    """Initializes and authenticates KaggleApi instance."""
    from kaggle.api.kaggle_api_extended import KaggleApi

    api = KaggleApi()
    api.authenticate()
    return api


def test_connectivity(token_path: Optional[Path] = None) -> bool:
    """Tests connectivity and authentication with api.kaggle.com."""
    print("=" * 65)
    print("  KAGGLE CONNECTIVITY & AUTHENTICATION TEST")
    print("=" * 65)

    success, username, err = setup_kaggle_credentials(token_path)
    if not success:
        print(f"[ERROR] Credential setup failed: {err}")
        return False

    print(f"[*] Found credentials for user: '{username}'")
    print("[*] Connecting to api.kaggle.com ...")

    try:
        api = get_kaggle_api()
        kernels = api.kernels_list(page=1, page_size=5, mine=True)
        print(f"[SUCCESS] Successfully authenticated with Kaggle API!")
        print(f"[*] Accessible remote user: '{username}'")
        print(f"[*] Existing user kernels found: {len(kernels)}")
        print("=" * 65)
        return True
    except Exception as e:
        print(f"\n[NETWORK/AUTH ERROR] Could not reach or authenticate with api.kaggle.com:")
        print(f"Details: {e}\n")
        print("Please check your internet connection, proxy settings, or token validity.")
        print("=" * 65)
        return False


def stage_kernel_bundle(
    staging_dir: Path,
    script_path: Path,
    kernel_slug: str,
    title: str,
    datasets: List[str],
    enable_gpu: bool = True,
    enable_internet: bool = True,
    is_private: bool = True,
    extra_files: Optional[List[Path]] = None,
) -> Path:
    """
    Prepares a clean staging directory with the code file, metadata, and dependencies (src/).
    """
    if staging_dir.exists():
        shutil.rmtree(staging_dir)
    staging_dir.mkdir(parents=True, exist_ok=True)

    # Copy primary script
    dest_script_name = script_path.name
    dest_script_path = staging_dir / dest_script_name
    shutil.copy2(script_path, dest_script_path)

    # Copy extra files or source directory (e.g. src/)
    if extra_files:
        for f in extra_files:
            if f.is_file():
                shutil.copy2(f, staging_dir / f.name)
            elif f.is_dir():
                shutil.copytree(f, staging_dir / f.name, dirs_exist_ok=True)

    # Write kernel-metadata.json
    metadata = {
        "id": kernel_slug,
        "title": title,
        "code_file": dest_script_name,
        "language": "python",
        "kernel_type": "script",
        "is_private": bool(is_private),
        "enable_gpu": bool(enable_gpu),
        "enable_tpu": False,
        "enable_internet": bool(enable_internet),
        "machine_shape": "NvidiaTeslaT4" if enable_gpu else None,
        "dataset_sources": datasets,
        "competition_sources": [],
        "kernel_sources": [],
        "model_sources": [],
    }

    metadata_file = staging_dir / "kernel-metadata.json"
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"[*] Staging prepared at: {staging_dir}")
    print(f"    - Code file: {dest_script_name}")
    print(f"    - Kernel ID: {kernel_slug}")
    print(f"    - GPU: {enable_gpu} (machine_shape: {'NvidiaTeslaT4' if enable_gpu else 'None'}) | Internet: {enable_internet}")
    print(f"    - Datasets: {datasets}")
    return staging_dir


def push_kernel(api, staging_dir: Path, accelerator: Optional[str] = "NvidiaTeslaT4") -> bool:
    """Pushes kernel to Kaggle using KaggleApi."""
    print(f"\n[*] Pushing kernel from {staging_dir} to Kaggle (accelerator: {accelerator})...")
    try:
        res = api.kernels_push(str(staging_dir), acc=accelerator)
        if res is None:
            print("[ERROR] Kernel push returned None.")
            return False
        if res.error:
            print(f"[ERROR] Failed to push kernel: {res.error}")
            return False

        print(f"[SUCCESS] Kernel pushed successfully!")
        if hasattr(res, "url") and res.url:
            print(f"[*] Kernel URL: {res.url}")
        if hasattr(res, "versionNumber") and res.versionNumber:
            print(f"[*] Version: {res.versionNumber}")
        return True
    except Exception as e:
        print(f"[ERROR] Exception during kernel push: {e}")
        return False


def poll_kernel_status(
    api,
    kernel_slug: str,
    poll_interval: int = 20,
    timeout: int = 7200,
) -> Tuple[str, Optional[str]]:
    """
    Polls kernel execution status until terminal state ('complete', 'error', 'cancelAck', etc.).
    Returns (final_status, failure_message).
    """
    print(f"\n[*] Polling execution status for '{kernel_slug}' (interval={poll_interval}s, timeout={timeout}s)...")
    start_time = time.time()
    last_status = None

    while True:
        elapsed = int(time.time() - start_time)
        if elapsed > timeout:
            print(f"\n[TIMEOUT] Kernel execution exceeded timeout of {timeout}s.")
            return "timeout", f"Execution exceeded {timeout}s timeout"

        try:
            status_obj = api.kernels_status(kernel_slug)
            status = getattr(status_obj, "status", str(status_obj)).lower()
            failure_message = getattr(status_obj, "failure_message", None)

            if status != last_status:
                print(f"[{time.strftime('%H:%M:%S')}] Status change -> {status.upper()} (elapsed: {elapsed}s)")
                last_status = status
            else:
                print(f"[{time.strftime('%H:%M:%S')}] Status: {status.upper()} (elapsed: {elapsed}s)...", end="\r", flush=True)

            if status == "complete":
                print(f"\n[SUCCESS] Kernel '{kernel_slug}' completed successfully in {elapsed}s!")
                return "complete", None

            if "error" in status or status in ("failed", "cancelack", "cancelled"):
                print(f"\n[FAILED] Kernel '{kernel_slug}' ended with status: {status}")
                if failure_message:
                    print(f"Failure message: {failure_message}")
                return status, failure_message

        except Exception as e:
            print(f"\n[WARNING] Error querying kernel status: {e}. Retrying in {poll_interval}s...")

        time.sleep(poll_interval)


def pull_kernel_output(
    api,
    kernel_slug: str,
    output_dir: Path,
    target_checkpoints_dir: Optional[Path] = None,
    force: bool = True,
) -> bool:
    """Pulls kernel output artifacts to local directory and moves checkpoints if needed."""
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n[*] Pulling output files for '{kernel_slug}' into '{output_dir}'...")
    try:
        api.kernels_output(kernel_slug, path=str(output_dir), force=force)
        print(f"[SUCCESS] Downloaded output files to {output_dir}:")
        downloaded_files = list(output_dir.glob("**/*"))
        for item in downloaded_files:
            if item.is_file():
                print(f"  - {item.relative_to(output_dir)} ({item.stat().st_size} bytes)")

        # If a target checkpoint directory is specified, copy checkpoints into it
        if target_checkpoints_dir:
            target_checkpoints_dir.mkdir(parents=True, exist_ok=True)
            for f in output_dir.rglob("*.pt"):
                shutil.copy2(f, target_checkpoints_dir / f.name)
                print(f"[+] Synced checkpoint: {f.name} -> {target_checkpoints_dir / f.name}")
            for f in output_dir.rglob("*.json"):
                if "model_metadata" in f.name:
                    shutil.copy2(f, target_checkpoints_dir / f.name)
                    print(f"[+] Synced metadata: {f.name} -> {target_checkpoints_dir / f.name}")

        return True
    except Exception as e:
        print(f"[ERROR] Failed to pull kernel output: {e}")
        return False


def parse_args():
    parser = argparse.ArgumentParser(
        description="PneumoVision Kaggle Remote GPU Runner",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--test-connection",
        action="store_true",
        help="Test connectivity and authentication with api.kaggle.com, then exit.",
    )
    parser.add_argument(
        "--token",
        type=Path,
        default=WORKSPACE_ROOT / "kaggle.json",
        help="Path to kaggle.json token file.",
    )
    parser.add_argument(
        "--script",
        type=Path,
        default=WORKSPACE_ROOT / "scripts" / "train_model.py",
        help="Path to Python script to execute on Kaggle GPU.",
    )
    parser.add_argument(
        "--kernel-slug",
        type=str,
        default=None,
        help="Kaggle kernel slug in format <username>/<slug>. Defaults to <username>/pneumovision-gpu-training.",
    )
    parser.add_argument(
        "--title",
        type=str,
        default="PneumoVision GPU Training",
        help="Title for the Kaggle Kernel.",
    )
    parser.add_argument(
        "--dataset",
        type=str,
        action="append",
        dest="datasets",
        help="Dataset slug(s) to attach (can be specified multiple times).",
    )
    parser.add_argument(
        "--no-gpu",
        action="store_true",
        help="Disable GPU accelerator.",
    )
    parser.add_argument(
        "--no-internet",
        action="store_true",
        help="Disable internet access in kernel.",
    )
    parser.add_argument(
        "--public",
        action="store_true",
        help="Make kernel public (default is private).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=WORKSPACE_ROOT / "models" / "kaggle_output",
        help="Local directory to pull kernel artifacts into.",
    )
    parser.add_argument(
        "--checkpoint-dir",
        type=Path,
        default=WORKSPACE_ROOT / "models" / "checkpoints",
        help="Destination directory for model checkpoints.",
    )
    parser.add_argument(
        "--poll-interval",
        type=int,
        default=20,
        help="Polling interval in seconds while monitoring kernel status.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=7200,
        help="Maximum timeout in seconds for kernel execution.",
    )
    parser.add_argument(
        "--push-only",
        action="store_true",
        help="Push the kernel and exit immediately without polling or pulling outputs.",
    )
    parser.add_argument(
        "--status-only",
        action="store_true",
        help="Check the status of an existing kernel run and exit.",
    )
    parser.add_argument(
        "--pull-only",
        action="store_true",
        help="Pull output files from an existing kernel and exit.",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    # If user just wants a connectivity test
    if args.test_connection:
        ok = test_connectivity(args.token)
        sys.exit(0 if ok else 1)

    # Initialize credentials
    setup_ok, username, err = setup_kaggle_credentials(args.token)
    if not setup_ok:
        print(f"[ERROR] {err}")
        sys.exit(1)

    try:
        api = get_kaggle_api()
    except Exception as e:
        print(f"[ERROR] Could not authenticate with Kaggle API: {e}")
        sys.exit(1)

    # Resolve kernel slug
    kernel_slug = args.kernel_slug
    if not kernel_slug:
        kernel_slug = f"{username}/pneumovision-gpu-training"
    elif "/" not in kernel_slug:
        kernel_slug = f"{username}/{kernel_slug}"

    # Handle status-only
    if args.status_only:
        print(f"[*] Checking status for kernel: {kernel_slug}")
        try:
            status_obj = api.kernels_status(kernel_slug)
            print(f"Status: {getattr(status_obj, 'status', status_obj)}")
            if getattr(status_obj, "failure_message", None):
                print(f"Failure message: {status_obj.failure_message}")
            sys.exit(0)
        except Exception as e:
            print(f"[ERROR] Failed to get status: {e}")
            sys.exit(1)

    # Handle pull-only
    if args.pull_only:
        ok = pull_kernel_output(api, kernel_slug, args.output_dir, args.checkpoint_dir)
        sys.exit(0 if ok else 1)

    # Validate script path
    if not args.script.is_file():
        print(f"[ERROR] Script not found: {args.script}")
        sys.exit(1)

    # Datasets
    datasets = args.datasets or ["paultimothymooney/chest-xray-pneumonia"]

    # Bundle staging directory with dependencies (src/ & scripts/ helpers)
    staging_dir = WORKSPACE_ROOT / ".kaggle_staging"
    extra_files = [WORKSPACE_ROOT / "src", WORKSPACE_ROOT / "scripts"]
    stage_kernel_bundle(
        staging_dir=staging_dir,
        script_path=args.script,
        kernel_slug=kernel_slug,
        title=args.title,
        datasets=datasets,
        enable_gpu=not args.no_gpu,
        enable_internet=not args.no_internet,
        is_private=not args.public,
        extra_files=extra_files,
    )

    # Push kernel
    if not push_kernel(api, staging_dir, accelerator="NvidiaTeslaT4" if not args.no_gpu else None):
        sys.exit(1)

    if args.push_only:
        print(f"[*] --push-only enabled. Check status with: python scripts/kaggle_runner.py --status-only --kernel-slug {kernel_slug}")
        sys.exit(0)

    # Poll status
    status, failure_message = poll_kernel_status(
        api=api,
        kernel_slug=kernel_slug,
        poll_interval=args.poll_interval,
        timeout=args.timeout,
    )

    # Pull outputs / logs
    pull_ok = pull_kernel_output(api, kernel_slug, args.output_dir, args.checkpoint_dir)

    # Check for log files and display them
    log_files = list(args.output_dir.glob("*.log")) + list(args.output_dir.glob("*.txt"))
    for log_file in log_files:
        print(f"\n--- [LOG: {log_file.name}] ---")
        try:
            print(log_file.read_text(encoding="utf-8", errors="replace"))
        except Exception as e:
            print(f"Could not read log file: {e}")

    if status != "complete":
        print(f"\n[ERROR] Kernel run did not complete successfully (Status: {status}).")
        if failure_message:
            print(f"Reason: {failure_message}")
        sys.exit(1)

    print("\n" + "=" * 65)
    print("  KAGGLE REMOTE GPU EXECUTION COMPLETE")
    print("=" * 65)


if __name__ == "__main__":
    main()
