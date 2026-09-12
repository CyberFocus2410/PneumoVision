"""
Off-Chain Medical Data Store & Cryptographic Hash Verifier.
Stores full clinical report payloads off-chain and verifies on-chain tamper-evidence.
"""

import hashlib
import json
from pathlib import Path
from typing import Any, Dict, Optional, Tuple
from eth_utils import keccak

from src.config import DATA_DIR

RECORDS_DB_DIR = DATA_DIR / "records_db"
RECORDS_DB_DIR.mkdir(parents=True, exist_ok=True)


def canonical_json_bytes(data: Any) -> bytes:
    """Produces deterministic canonical JSON serialization for hashing."""
    return json.dumps(data, sort_keys=True, separators=(',', ':')).encode('utf-8')


def compute_content_hash(data: Any) -> str:
    """Computes Keccak-256 cryptographic digest of data as 0x-prefixed 64-character hex."""
    if isinstance(data, (dict, list)):
        raw_bytes = canonical_json_bytes(data)
    elif isinstance(data, str):
        raw_bytes = data.encode('utf-8')
    elif isinstance(data, (bytes, bytearray)):
        raw_bytes = bytes(data)
    else:
        raw_bytes = str(data).encode('utf-8')

    digest = keccak(raw_bytes)
    return "0x" + digest.hex()


def save_offchain_record(offchain_ref: str, payload: Dict[str, Any]) -> str:
    """Persists medical record payload off-chain and returns offchain_ref."""
    safe_name = offchain_ref.replace("/", "_").replace("\\", "_")
    if not safe_name.endswith(".json"):
        safe_name += ".json"
    
    file_path = RECORDS_DB_DIR / safe_name
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    
    return offchain_ref


def load_offchain_record(offchain_ref: str) -> Optional[Dict[str, Any]]:
    """Loads medical record payload from off-chain storage."""
    safe_name = offchain_ref.replace("/", "_").replace("\\", "_")
    if not safe_name.endswith(".json"):
        safe_name += ".json"
    
    file_path = RECORDS_DB_DIR / safe_name
    if not file_path.exists():
        return None
    
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


def verify_record_integrity(
    on_chain_content_hash: str,
    offchain_ref: str
) -> Dict[str, Any]:
    """
    Verifies that the off-chain clinical payload exactly matches the on-chain cryptographic digest.
    Returns audit status and tamper warning on any discrepancy.
    """
    offchain_data = load_offchain_record(offchain_ref)
    
    if offchain_data is None:
        return {
            "is_valid": False,
            "tamper_detected": True,
            "offchain_ref": offchain_ref,
            "on_chain_hash": on_chain_content_hash,
            "computed_hash": None,
            "tamper_warning": f"CRITICAL: Off-chain medical record payload for '{offchain_ref}' is MISSING from database.",
            "payload": None
        }
    
    computed_hash = compute_content_hash(offchain_data)
    
    # Normalize hex comparisons
    norm_onchain = on_chain_content_hash.lower()
    norm_computed = computed_hash.lower()
    
    if not norm_onchain.startswith("0x"):
        norm_onchain = "0x" + norm_onchain
    if not norm_computed.startswith("0x"):
        norm_computed = "0x" + norm_computed

    is_intact = (norm_onchain == norm_computed)
    
    warning = None
    if not is_intact:
        warning = (
            f"SECURITY ALERT: Tamper detected! On-chain cryptographic digest ({on_chain_content_hash}) "
            f"does not match computed off-chain digest ({computed_hash}). Off-chain medical data has been altered!"
        )

    return {
        "is_valid": is_intact,
        "tamper_detected": not is_intact,
        "offchain_ref": offchain_ref,
        "on_chain_hash": on_chain_content_hash,
        "computed_hash": computed_hash,
        "tamper_warning": warning,
        "payload": offchain_data
    }
