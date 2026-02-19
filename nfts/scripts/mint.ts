import { ethers } from "hardhat";

// Sample NFT metadata (normally this would be hosted on IPFS)
const nftMetadata = [
  {
    name: "Cool Cat #1",
    description: "A very cool cat NFT",
    image: "https://placehold.co/400x400/orange/white?text=Cool+Cat+1",
    price: "0.01" // ETH
  },
  {
    name: "Cool Dog #1",
    description: "A very cool dog NFT",
    image: "https://placehold.co/400x400/blue/white?text=Cool+Dog+1",
    price: "0.02"
  },
  {
    name: "Cool Bird #1",
    description: "A very cool bird NFT",
    image: "https://placehold.co/400x400/green/white?text=Cool+Bird+1",
    price: "0.015"
  },
  {
    name: "Cool Fish #1",
    description: "A very cool fish NFT",
    image: "https://placehold.co/400x400/purple/white?text=Cool+Fish+1",
    price: "0.025"
  },
  {
    name: "Cool Monkey #1",
    description: "A very cool monkey NFT",
    image: "https://placehold.co/400x400/red/white?text=Cool+Monkey+1",
    price: "0.05"
  }
];

async function main() {
  console.log("Loading contract address...");
  
  const fs = require("fs");
  const contractAddressPath = __dirname + "/../frontend/src/contracts/contract-address.json";
  
  if (!fs.existsSync(contractAddressPath)) {
    console.error("Contract address file not found. Please deploy the contract first!");
    process.exit(1);
  }

  const { MyNFT: contractAddress } = JSON.parse(fs.readFileSync(contractAddressPath, "utf8"));
  console.log("MyNFT contract address:", contractAddress);

  const MyNFT = await ethers.getContractFactory("MyNFT");
  const nft = MyNFT.attach(contractAddress);

  const [owner] = await ethers.getSigners();
  console.log("Minting NFTs to bank (owner):", owner.address);

  // Create a mock metadata server (in production, use IPFS)
  for (let i = 0; i < nftMetadata.length; i++) {
    const metadata = nftMetadata[i];
    const { price, ...metadataWithoutPrice } = metadata;
    
    // In a real scenario, this would be an IPFS URI
    const tokenURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadataWithoutPrice)).toString('base64')}`;
    const priceInWei = ethers.parseEther(price);
    
    console.log(`\nMinting NFT #${i}: ${metadata.name} - Price: ${price} ETH`);
    const tx = await nft.mintNFT(tokenURI, priceInWei);
    await tx.wait();
    console.log(`✓ Minted token #${i} to bank`);
  }

  const totalSupply = await nft.totalSupply();
  console.log(`\nTotal NFTs minted: ${totalSupply}`);
  
  const [availableTokens, prices] = await nft.getAvailableNFTs();
  console.log(`\nAvailable NFTs in bank: ${availableTokens.length}`);
  availableTokens.forEach((tokenId: bigint, index: number) => {
    console.log(`  Token #${tokenId}: ${ethers.formatEther(prices[index])} ETH`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
