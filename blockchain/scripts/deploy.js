const hre = require("hardhat");

async function main() {
  console.log("=================================================");
  console.log("Deploying PneumoVision PatientRecords Smart Contract");
  console.log("Network:", hre.network.name);
  console.log("=================================================");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer Address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account Balance:", hre.ethers.formatEther(balance), "ETH");

  const PatientRecords = await hre.ethers.getContractFactory("PatientRecords");
  const contract = await PatientRecords.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("\n[SUCCESS] PatientRecords deployed to:", contractAddress);
  console.log("Transaction Hash:", contract.deploymentTransaction()?.hash);

  return contractAddress;
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
