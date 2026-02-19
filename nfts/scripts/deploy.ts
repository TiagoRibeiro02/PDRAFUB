import { ethers } from "hardhat";

async function main() {
  console.log("Deploying MyNFT contract...");

  const MyNFT = await ethers.getContractFactory("MyNFT");
  const nft = await MyNFT.deploy();

  await nft.waitForDeployment();

  const contractAddress = await nft.getAddress();
  console.log("MyNFT deployed to:", contractAddress);

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
