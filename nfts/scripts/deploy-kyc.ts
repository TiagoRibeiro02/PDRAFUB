import { ethers } from "hardhat";
import hre from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Deploying KYC Compliance System...\n");

  // Get the deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. Deploy PlonkVerifierAdapter
  console.log("Deploying PlonkVerifierAdapter...");
  const PlonkVerifierAdapter = await ethers.getContractFactory("PlonkVerifierAdapter");
  const adapter = await PlonkVerifierAdapter.deploy();
  await adapter.waitForDeployment();
  const adapterAddress = await adapter.getAddress();
  console.log("PlonkVerifierAdapter deployed to:", adapterAddress);

  // 2. Deploy KYCCompliance
  console.log("\n Deploying KYCCompliance...");
  const KYCCompliance = await ethers.getContractFactory("KYCCompliance");
  const kyc = await KYCCompliance.deploy(adapterAddress);
  await kyc.waitForDeployment();
  const kycAddress = await kyc.getAddress();
  console.log("KYCCompliance deployed to:", kycAddress);

  // Save deployment info
  const deploymentInfo = {
    PlonkVerifierAdapter: adapterAddress,
    KYCCompliance: kycAddress,
    network: "localhost",
    chainId: 1337,
    deployer: deployer.address,
    deployedAt: new Date().toISOString()
  };

  // Save to both NFTs and zeroid-entity projects
  const nftsPath = path.join(__dirname, "../artifacts/kyc-deployment.json");
  const entityPath = path.join(__dirname, "../../zeroid-entity/src/contracts/kyc-deployment.json");

  // Ensure directories exist
  const entityDir = path.dirname(entityPath);
  if (!fs.existsSync(entityDir)) {
    fs.mkdirSync(entityDir, { recursive: true });
  }

  fs.writeFileSync(nftsPath, JSON.stringify(deploymentInfo, null, 2));
  fs.writeFileSync(entityPath, JSON.stringify(deploymentInfo, null, 2));

  // Copy ABIs to zeroid-entity
  const adapterArtifact = await hre.artifacts.readArtifact("PlonkVerifierAdapter");
  const kycArtifact = await hre.artifacts.readArtifact("KYCCompliance");

  fs.writeFileSync(
    path.join(entityDir, "PlonkVerifierAdapter.json"),
    JSON.stringify(adapterArtifact, null, 2)
  );
  fs.writeFileSync(
    path.join(entityDir, "KYCCompliance.json"),
    JSON.stringify(kycArtifact, null, 2)
  );

  console.log("\n Deployment complete!");
  console.log("Deployment info saved to:");
  console.log("   -", nftsPath);
  console.log("   -", entityPath);
  console.log("\n Contract Addresses:");
  console.log("   PlonkVerifierAdapter:", adapterAddress);
  console.log("   KYCCompliance:", kycAddress);
  console.log("\n Use these addresses in your frontend to interact with the contracts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
