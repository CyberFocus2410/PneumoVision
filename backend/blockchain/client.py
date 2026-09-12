"""
PneumoVision Blockchain Client.
Web3.py wrapper for PatientRecords.sol smart contract supporting:
- Pseudonymous patient registration
- Consent-gated access control (grant / revoke)
- Doctor/Hospital tamper-evident medical record appending (Diagnosis, Treatment, Medication, Outcome)
- Access-controlled record retrieval with fallback support for local and tester providers.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from eth_utils import keccak, to_bytes, to_hex
from web3 import Web3
from web3.exceptions import ContractCustomError, ContractLogicError

from src.config import BASE_DIR

CONTRACT_ARTIFACT_PATH = (
    BASE_DIR / "blockchain" / "artifacts" / "contracts" / "PatientRecords.sol" / "PatientRecords.json"
)

# RecordType Enum mapping
RECORD_TYPES = {
    "Diagnosis": 0,
    "Treatment": 1,
    "Medication": 2,
    "Outcome": 3,
    0: "Diagnosis",
    1: "Treatment",
    2: "Medication",
    3: "Outcome",
}


def to_bytes32(val: Union[str, bytes]) -> bytes:
    """Converts a string, hex string, or bytes to a 32-byte bytes object."""
    if isinstance(val, bytes):
        if len(val) == 32:
            return val
        elif len(val) < 32:
            return val.ljust(32, b'\x00')
        else:
            return val[:32]
    
    val_str = str(val).strip()
    if val_str.startswith("0x") and len(val_str) == 66:
        try:
            return bytes.fromhex(val_str[2:])
        except ValueError:
            pass
    
    # Otherwise, compute keccak256 of the UTF-8 representation
    return keccak(val_str.encode("utf-8"))


def to_hex_bytes32(val: Union[str, bytes]) -> str:
    """Returns 0x-prefixed 64-char hex string."""
    b = to_bytes32(val)
    return "0x" + b.hex()


class PatientRecordsClient:
    def __init__(
        self,
        rpc_url: Optional[str] = None,
        contract_address: Optional[str] = None,
        contract_json_path: Optional[Path] = None,
        auto_deploy: bool = True
    ):
        self.rpc_url = rpc_url or os.environ.get("BLOCKCHAIN_RPC_URL", "http://127.0.0.1:8545")
        self.artifact_path = contract_json_path or CONTRACT_ARTIFACT_PATH
        
        # 1. Initialize Web3 connection
        self.w3 = self._init_web3()
        
        # 2. Load ABI and Bytecode
        self.abi, self.bytecode = self._load_artifact()
        
        # 3. Setup Accounts
        self.accounts = list(self.w3.eth.accounts) if hasattr(self.w3.eth, "accounts") and self.w3.eth.accounts else []
        if not self.accounts:
            # Generate local dev account if needed
            acct = self.w3.eth.account.create()
            self.accounts = [acct.address]
            self.default_account = acct.address
        else:
            self.default_account = self.accounts[0]

        self.w3.eth.default_account = self.default_account
        self.admin_account = self.accounts[0]
        self.default_doctor = self.accounts[1] if len(self.accounts) > 1 else self.accounts[0]
        self.default_patient = self.accounts[2] if len(self.accounts) > 2 else self.accounts[0]

        # 4. Bind or Deploy Contract
        self.contract_address = contract_address or os.environ.get("PATIENT_RECORDS_CONTRACT_ADDRESS")
        self.contract = None
        
        if self.contract_address and Web3.is_address(self.contract_address):
            self.contract = self.w3.eth.contract(address=self.contract_address, abi=self.abi)
        elif auto_deploy:
            self._deploy_contract()

    def _init_web3(self) -> Web3:
        """Initializes Web3 with HTTPProvider or in-memory EthereumTesterProvider."""
        w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        if w3.is_connected():
            return w3
        
        # Fallback to EthereumTesterProvider for isolated in-process testing
        try:
            from web3.providers.eth_tester import EthereumTesterProvider
            return Web3(EthereumTesterProvider())
        except Exception:
            return w3

    def _load_artifact(self) -> Tuple[List[Dict[str, Any]], str]:
        """Loads compiled smart contract ABI and Bytecode."""
        if not self.artifact_path.exists():
            raise FileNotFoundError(f"Contract artifact not found at {self.artifact_path}. Please run hardhat compile.")
        
        with open(self.artifact_path, "r", encoding="utf-8") as f:
            artifact = json.load(f)
        return artifact["abi"], artifact["bytecode"]

    def _deploy_contract(self):
        """Deploys a fresh instance of PatientRecords."""
        factory = self.w3.eth.contract(abi=self.abi, bytecode=self.bytecode)
        tx_hash = factory.constructor().transact({"from": self.admin_account})
        tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        self.contract_address = tx_receipt.contractAddress
        self.contract = self.w3.eth.contract(address=self.contract_address, abi=self.abi)
        
        # Authorize default doctor
        if len(self.accounts) > 1:
            try:
                self.authorize_provider(self.default_doctor, "PneumoVision AI Clinical Screener", caller=self.admin_account)
            except Exception:
                pass

    def authorize_provider(self, provider_address: str, name: str, caller: Optional[str] = None) -> str:
        """Authorizes a doctor or hospital address on-chain."""
        sender = caller or self.admin_account
        tx_hash = self.contract.functions.authorizeProvider(
            Web3.to_checksum_address(provider_address),
            name
        ).transact({"from": sender})
        self.w3.eth.wait_for_transaction_receipt(tx_hash)
        return tx_hash.hex()

    def register_patient(
        self,
        patient_id: Union[str, bytes],
        patient_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Registers a pseudonymous patient identity mapped to the patient's wallet.
        """
        p_bytes = to_bytes32(patient_id)
        sender = patient_address or self.default_patient

        # Check if already registered
        profile = self.contract.functions.patients(p_bytes).call()
        if profile[1]:  # isRegistered
            return {
                "status": "ALREADY_REGISTERED",
                "patient_id": to_hex_bytes32(patient_id),
                "patient_address": profile[0]
            }

        tx_hash = self.contract.functions.registerPatient(p_bytes).transact({"from": sender})
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

        return {
            "status": "REGISTERED",
            "patient_id": to_hex_bytes32(patient_id),
            "patient_address": sender,
            "tx_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber
        }

    def add_record(
        self,
        patient_id: Union[str, bytes],
        record_type: Union[int, str],
        content_hash: Union[str, bytes],
        off_chain_ref: str,
        provider_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Appends a tamper-evident medical record on-chain. Callable by authorized providers.
        """
        p_bytes = to_bytes32(patient_id)
        c_bytes = to_bytes32(content_hash)
        sender = provider_address or self.default_doctor

        # Resolve record type int
        if isinstance(record_type, str):
            r_type = RECORD_TYPES.get(record_type, 0)
        else:
            r_type = int(record_type)

        # Auto-register patient if not registered yet
        profile = self.contract.functions.patients(p_bytes).call()
        if not profile[1]:
            self.register_patient(patient_id, patient_address=self.default_patient)

        # Ensure sender is authorized provider
        if not self.contract.functions.authorizedProviders(sender).call():
            self.authorize_provider(sender, "Authorized Healthcare Provider")

        tx_hash = self.contract.functions.addRecord(
            p_bytes,
            r_type,
            c_bytes,
            off_chain_ref
        ).transact({"from": sender})

        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

        # Parse RecordAdded event
        events = self.contract.events.RecordAdded().process_receipt(receipt)
        record_id = events[0]["args"]["recordId"] if events else None

        return {
            "status": "RECORD_COMMITTED",
            "patient_id": to_hex_bytes32(patient_id),
            "record_id": record_id,
            "record_type": RECORD_TYPES.get(r_type, "Unknown"),
            "content_hash": to_hex_bytes32(content_hash),
            "off_chain_ref": off_chain_ref,
            "provider_address": sender,
            "tx_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber,
            "contract_address": self.contract_address
        }

    def grant_access(
        self,
        patient_id: Union[str, bytes],
        hospital_or_doctor: str,
        patient_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Grants record view permission to a specified provider. Only callable by patient."""
        p_bytes = to_bytes32(patient_id)
        grantee = Web3.to_checksum_address(hospital_or_doctor)
        
        profile = self.contract.functions.patients(p_bytes).call()
        sender = patient_address or profile[0] or self.default_patient

        tx_hash = self.contract.functions.grantAccess(p_bytes, grantee).transact({"from": sender})
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

        return {
            "status": "ACCESS_GRANTED",
            "patient_id": to_hex_bytes32(patient_id),
            "grantee": grantee,
            "tx_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber
        }

    def revoke_access(
        self,
        patient_id: Union[str, bytes],
        hospital_or_doctor: str,
        patient_address: Optional[str] = None
    ) -> Dict[str, Any]:
        """Revokes record view permission from a provider. Only callable by patient."""
        p_bytes = to_bytes32(patient_id)
        grantee = Web3.to_checksum_address(hospital_or_doctor)
        
        profile = self.contract.functions.patients(p_bytes).call()
        sender = patient_address or profile[0] or self.default_patient

        tx_hash = self.contract.functions.revokeAccess(p_bytes, grantee).transact({"from": sender})
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

        return {
            "status": "ACCESS_REVOKED",
            "patient_id": to_hex_bytes32(patient_id),
            "grantee": grantee,
            "tx_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber
        }

    def has_access(self, patient_id: Union[str, bytes], caller_address: str) -> bool:
        """Checks if caller has permission to view patient's records."""
        p_bytes = to_bytes32(patient_id)
        caller = Web3.to_checksum_address(caller_address)
        return bool(self.contract.functions.hasAccess(p_bytes, caller).call())

    def get_records(
        self,
        patient_id: Union[str, bytes],
        caller_address: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves all on-chain medical records for a patient.
        Reverts with PermissionError if caller is not authorized.
        """
        p_bytes = to_bytes32(patient_id)
        caller = Web3.to_checksum_address(caller_address or self.default_patient)

        # Check access before calling
        if not self.has_access(p_bytes, caller):
            raise PermissionError(
                f"AccessDenied: Address {caller} does not have consent permission to access records for patient {to_hex_bytes32(patient_id)}."
            )

        raw_records = self.contract.functions.getRecords(p_bytes).call({"from": caller})
        formatted = []
        for r in raw_records:
            formatted.append({
                "record_id": int(r[0]),
                "record_type": RECORD_TYPES.get(r[1], "Unknown"),
                "record_type_id": int(r[1]),
                "content_hash": "0x" + r[2].hex(),
                "off_chain_ref": str(r[3]),
                "author_provider": str(r[4]),
                "timestamp": int(r[5])
            })
        return formatted


# Global singleton instance
_blockchain_client: Optional[PatientRecordsClient] = None

def get_blockchain_client() -> PatientRecordsClient:
    global _blockchain_client
    if _blockchain_client is None:
        _blockchain_client = PatientRecordsClient()
    return _blockchain_client
