import { ethers } from "hardhat";

async function main() {
  console.log("Deploying MyNFT contract...");

  const ENTITY_ADDRESSES = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Bank1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Bank2
  ];

  const MyNFT = await ethers.getContractFactory("MyNFT");
  const nft = await MyNFT.deploy();

  await nft.waitForDeployment();

  const contractAddress = await nft.getAddress();
  console.log("MyNFT deployed to:", contractAddress);

  for (const entity of ENTITY_ADDRESSES) {
    try {
      const tx = await nft.setEntityAuthorization(entity, true);
      await tx.wait();
      console.log(`Authorized entity wallet: ${entity}`);
    } catch (error) {
      console.warn(`Failed to authorize ${entity}:`, error);
    }
  }

  // Save the contract address to a file for the frontend
  const fs = require("fs");
  const contractsDir = __dirname + "/../frontend/src/contracts";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true });
  }

  fs.writeFileSync(
    contractsDir + "/contract-address.json",
    JSON.stringify({ MyNFT: contractAddress }, undefined, 2)
  );

  // Save the contract ABI
  const MyNFTArtifact = await import("../artifacts/contracts/MyNFT.sol/MyNFT.json");
  fs.writeFileSync(
    contractsDir + "/MyNFT.json",
    JSON.stringify(MyNFTArtifact, null, 2)
  );

  console.log("Contract address and ABI saved to frontend/src/contracts/");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
