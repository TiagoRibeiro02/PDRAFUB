import { ethers } from "hardhat";
import hre from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Deploying KYC Compliance System...\n");

  const ENTITY_ADDRESSES = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Bank1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Bank2
  ];

  // Get the deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 1. Deploy FflonkVerifierAdapter
  console.log("Deploying FflonkVerifierAdapter...");
  const FflonkVerifierAdapter = await ethers.getContractFactory("FflonkVerifierAdapter");
  const adapter = await FflonkVerifierAdapter.deploy();
  await adapter.waitForDeployment();
  const adapterAddress = await adapter.getAddress();
  console.log("FflonkVerifierAdapter deployed to:", adapterAddress);

  // 2. Deploy KYCCompliance
  console.log("\n Deploying KYCCompliance...");
  const KYCCompliance = await ethers.getContractFactory("KYCCompliance");
  const kyc = await KYCCompliance.deploy(adapterAddress);
  await kyc.waitForDeployment();
  const kycAddress = await kyc.getAddress();
  console.log("KYCCompliance deployed to:", kycAddress);

  for (const entity of ENTITY_ADDRESSES) {
    try {
      const tx = await kyc.setIssuerAuthorization(entity, true);
      await tx.wait();
      console.log(`Authorized issuer wallet: ${entity}`);
    } catch (error) {
      console.warn(`Failed to authorize issuer ${entity}:`, error);
    }
  }

  // Save deployment info
  const deploymentInfo = {
    FflonkVerifierAdapter: adapterAddress,
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
  const adapterArtifact = await hre.artifacts.readArtifact("FflonkVerifierAdapter");
  const kycArtifact = await hre.artifacts.readArtifact("KYCCompliance");

  fs.writeFileSync(
    path.join(entityDir, "FflonkVerifierAdapter.json"),
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
  console.log("   FflonkVerifierAdapter:", adapterAddress);
  console.log("   KYCCompliance:", kycAddress);
  console.log("\n Use these addresses in your frontend to interact with the contracts");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
