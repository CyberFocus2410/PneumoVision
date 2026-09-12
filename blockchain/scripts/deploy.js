const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=================================================");
  console.log("Deploying PneumoVision PatientRecords Smart Contract");
  console.log("Network:", hre.network.name);
  console.log("=================================================");

  const signers = await hre.ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error(
      "No deployer signer configured! Please provide PRIVATE_KEY in your environment or .env file."
    );
  }
  const deployer = signers[0];
  console.log("Deployer Address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const networkSymbol = hre.network.name === "mstTestnet" ? "tMSTC" : "ETH";
  console.log(`Account Balance: ${hre.ethers.formatEther(balance)} ${networkSymbol}`);

  if (balance === 0n && hre.network.name !== "hardhat") {
    console.warn("\n[WARNING] Deployer balance is 0! If deploying to MST Testnet, please claim test tokens from https://faucet.mstblockchain.com");
  }

  const PatientRecords = await hre.ethers.getContractFactory("PatientRecords");
  const contract = await PatientRecords.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  const txHash = contract.deploymentTransaction()?.hash;

  console.log("\n[SUCCESS] PatientRecords deployed to:", contractAddress);
  console.log("Transaction Hash:", txHash);

  if (hre.network.name === "mstTestnet") {
    console.log("View Contract on MSTScan: https://testnet.mstscan.com/address/" + contractAddress);
    console.log("View Tx on MSTScan:       https://testnet.mstscan.com/tx/" + txHash);
  }

  // Persist deployment to deployments.json
  const deploymentsPath = path.join(__dirname, "..", "deployments.json");
  let deployments = {};
  if (fs.existsSync(deploymentsPath)) {
    try {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf-8"));
    } catch (e) {
      deployments = {};
    }
  }

  deployments[hre.network.name] = {
    contractAddress,
    transactionHash: txHash,
    deployer: deployer.address,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployedAt: new Date().toISOString(),
    features: [
      "Patient Identity Registration (registerPatient)",
      "Provider Authorization Lifecycle (authorizeProvider, revokeProvider)",
      "Consent Management (grantAccess, revokeAccess, hasAccess)",
      "Tamper-evident Care Timeline (addRecord, getRecords, getRecordCount)"
    ]
  };

  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2), "utf-8");
  console.log("Deployment record saved to:", deploymentsPath);

  return contractAddress;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("\n[DEPLOYMENT ERROR]:", error.message || error);
      process.exit(1);
    });
}

module.exports = main;

