"""
PneumoVision MST Testnet Contract Deployment Script
Deploys PatientRecords.sol to MST Testnet (Chain ID: 91562037)
"""

import os
import sys
import json
from pathlib import Path
from web3 import Web3
from eth_account import Account

ROOT_DIR = Path(__file__).parent.parent
ARTIFACT_PATH = ROOT_DIR / "blockchain" / "artifacts" / "contracts" / "PatientRecords.sol" / "PatientRecords.json"
DEPLOYMENTS_PATH = ROOT_DIR / "blockchain" / "deployments.json"

RPC_URL = os.environ.get("MST_TESTNET_RPC_URL", "https://testnetrpc.mstblockchain.com")
CHAIN_ID = 91562037

def deploy():
    print("=" * 60)
    print("Deploying PatientRecords.sol to MST Testnet")
    print(f"RPC Endpoint: {RPC_URL}")
    print(f"Chain ID:     {CHAIN_ID}")
    print("=" * 60)

    # 1. Check Artifact
    if not ARTIFACT_PATH.exists():
        print(f"[ERROR] Contract artifact not found at {ARTIFACT_PATH}")
        print("Run 'cd blockchain && npx hardhat compile' first.")
        sys.exit(1)

    with open(ARTIFACT_PATH, "r", encoding="utf-8") as f:
        artifact = json.load(f)

    abi = artifact["abi"]
    bytecode = artifact["bytecode"]

    # 2. Check Web3 Connection
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    if not w3.is_connected():
        print(f"[ERROR] Could not connect to MST Testnet RPC: {RPC_URL}")
        sys.exit(1)

    # 3. Resolve Private Key
    private_key = os.environ.get("PRIVATE_KEY") or os.environ.get("MST_TESTNET_PRIVATE_KEY")
    if not private_key:
        print("\n[ERROR] PRIVATE_KEY environment variable is not set!")
        print("To deploy to MST Testnet:")
        print("  1. Create a wallet or export your private key.")
        print("  2. Request free tMSTC from https://faucet.mstblockchain.com")
        print("  3. Set PRIVATE_KEY in .env or run:")
        print("     $env:PRIVATE_KEY=\"0x...\" ; python scripts/deploy_mst_testnet.py")
        sys.exit(1)

    if not private_key.startswith("0x"):
        private_key = f"0x{private_key}"

    account = Account.from_key(private_key)
    deployer_address = account.address
    print(f"Deployer Address: {deployer_address}")

    # 4. Check Balance
    balance_wei = w3.eth.get_balance(deployer_address)
    balance_mstc = w3.from_wei(balance_wei, "ether")
    print(f"Account Balance:  {balance_mstc} tMSTC")

    if balance_wei == 0:
        print("\n[ERROR] Deployer wallet balance is 0 tMSTC!")
        print(f"Please claim testnet coins for '{deployer_address}' from:")
        print("https://faucet.mstblockchain.com\n")
        sys.exit(1)

    # 5. Build and Send Deployment Transaction
    print("\nBroadcasting deployment transaction...")
    Contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    nonce = w3.eth.get_transaction_count(deployer_address)
    gas_price = w3.eth.gas_price

    construct_txn = Contract.constructor().build_transaction({
        "from": deployer_address,
        "nonce": nonce,
        "gasPrice": gas_price,
        "chainId": CHAIN_ID
    })

    try:
        gas_estimate = w3.eth.estimate_gas(construct_txn)
        construct_txn["gas"] = int(gas_estimate * 1.2)
    except Exception as e:
        print(f"Warning: Gas estimation fallback ({e})")
        construct_txn["gas"] = 3000000

    signed_txn = account.sign_transaction(construct_txn)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.raw_transaction)
    print(f"Transaction Hash: {tx_hash.hex()}")
    print("Waiting for transaction confirmation...")

    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    contract_address = receipt.contractAddress

    print("\n" + "=" * 60)
    print(f"[SUCCESS] PatientRecords deployed to MST Testnet!")
    print(f"Contract Address: {contract_address}")
    print(f"Tx Hash:          {tx_hash.hex()}")
    print(f"Block Number:     {receipt.blockNumber}")
    print(f"Gas Used:         {receipt.gasUsed}")
    print(f"MSTScan Contract: https://testnet.mstscan.com/address/{contract_address}")
    print(f"MSTScan Tx:       https://testnet.mstscan.com/tx/{tx_hash.hex()}")
    print("=" * 60)

    # 6. Save Deployment Info
    deployments = {}
    if DEPLOYMENTS_PATH.exists():
        try:
            with open(DEPLOYMENTS_PATH, "r", encoding="utf-8") as f:
                deployments = json.load(f)
        except Exception:
            deployments = {}

    deployments["mstTestnet"] = {
        "contractAddress": contract_address,
        "transactionHash": tx_hash.hex(),
        "deployer": deployer_address,
        "network": "mstTestnet",
        "chainId": CHAIN_ID,
        "deployedAt": str(receipt.blockNumber),
        "features": [
            "Patient Identity Registration (registerPatient)",
            "Provider Authorization Lifecycle (authorizeProvider, revokeProvider)",
            "Consent Management (grantAccess, revokeAccess, hasAccess)",
            "Tamper-evident Care Timeline (addRecord, getRecords, getRecordCount)"
        ]
    }

    with open(DEPLOYMENTS_PATH, "w", encoding="utf-8") as f:
        json.dump(deployments, f, indent=2)
    print(f"Saved deployment details to {DEPLOYMENTS_PATH}")

if __name__ == "__main__":
    deploy()
