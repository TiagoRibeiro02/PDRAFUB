import { ethers } from "hardhat";

// Sample NFT metadata (normally this would be hosted on IPFS)
// The top-level `issuer` field holds the issuer's DID and is used by the
// ZeroID Issuer portal (zeroid-issuer) to filter assets by issuer.
//
// NFTs are split between two issuers:
//   - Diamond House  (did:zeroid:diamond-house)  — tokens 0-2
//   - Gem Gallery    (did:zeroid:gem-gallery)    — tokens 3-4
const nftMetadata = [
  // ── Diamond House ──────────────────────────────────────────────────────
  {
    name: "Diamond Solitaire Ring",
    description: "1.2 ct round-cut D/VS1 diamond set in 18 k white gold.",
    image: "https://placehold.co/400x400/e0e0e0/333?text=Diamond+Ring",
    issuer: "did:zeroid:diamond-house",
    issuer_name: "Diamond House",
    price: "0.50",
    attributes: [
      { trait_type: "Asset Type",    value: "Diamond Ring" },
      { trait_type: "Carat Weight",  value: "1.2 ct" },
      { trait_type: "Cut",           value: "Round Brilliant" },
      { trait_type: "Colour",        value: "D" },
      { trait_type: "Clarity",       value: "VS1" },
      { trait_type: "Metal",         value: "18k White Gold" },
      { trait_type: "Certificate",   value: "GIA-2021-123456" },
      { trait_type: "Issuer",        value: "Diamond House" }
    ]
  },
  {
    name: "Diamond Tennis Bracelet",
    description: "Eternity bracelet with 3.5 ct total weight of F/SI1 round diamonds.",
    image: "https://placehold.co/400x400/d4d4d4/333?text=Tennis+Bracelet",
    issuer: "did:zeroid:diamond-house",
    issuer_name: "Diamond House",
    price: "0.80",
    attributes: [
      { trait_type: "Asset Type",    value: "Diamond Bracelet" },
      { trait_type: "Total Carat",   value: "3.5 ct" },
      { trait_type: "Colour",        value: "F" },
      { trait_type: "Clarity",       value: "SI1" },
      { trait_type: "Metal",         value: "18k Yellow Gold" },
      { trait_type: "Certificate",   value: "GIA-2022-789012" },
      { trait_type: "Issuer",        value: "Diamond House" }
    ]
  },
  {
    name: "Princess-Cut Diamond Pendant",
    description: "0.75 ct princess-cut E/VS2 diamond pendant on a platinum chain.",
    image: "https://placehold.co/400x400/c8c8c8/333?text=Diamond+Pendant",
    issuer: "did:zeroid:diamond-house",
    issuer_name: "Diamond House",
    price: "0.35",
    attributes: [
      { trait_type: "Asset Type",    value: "Diamond Pendant" },
      { trait_type: "Carat Weight",  value: "0.75 ct" },
      { trait_type: "Cut",           value: "Princess" },
      { trait_type: "Colour",        value: "E" },
      { trait_type: "Clarity",       value: "VS2" },
      { trait_type: "Metal",         value: "Platinum" },
      { trait_type: "Certificate",   value: "GIA-2023-345678" },
      { trait_type: "Issuer",        value: "Diamond House" }
    ]
  },
  {
    name: "Diamond Pendant 3D",
    description: "0.90 ct princess-cut E/VS2 diamond pendant 3D on a platinum chain.",
    image: "https://placehold.co/400x400/c8c8c8/333?text=Diamond+Pendant+3D",
    issuer: "did:zeroid:diamond-house",
    issuer_name: "Diamond House",
    price: "6.0",
    attributes: [
      { trait_type: "Asset Type",    value: "Diamond Pendant" },
      { trait_type: "Carat Weight",  value: "0.90 ct" },
      { trait_type: "Cut",           value: "Princess" },
      { trait_type: "Colour",        value: "E" },
      { trait_type: "Clarity",       value: "VS2" },
      { trait_type: "Metal",         value: "Platinum" },
      { trait_type: "Certificate",   value: "GIA-2023-345678" },
      { trait_type: "Issuer",        value: "Diamond House" }
    ]
  },

  // ── Gem Gallery ────────────────────────────────────────────────────────
  {
    name: "Burmese Ruby Ring",
    description: "2.1 ct unheated Burmese ruby set in 18 k rose gold with diamond halo.",
    image: "https://placehold.co/400x400/c0392b/white?text=Ruby+Ring",
    issuer: "did:zeroid:gem-gallery",
    issuer_name: "Gem Gallery",
    price: "1.20",
    attributes: [
      { trait_type: "Asset Type",    value: "Ruby Ring" },
      { trait_type: "Carat Weight",  value: "2.1 ct" },
      { trait_type: "Origin",        value: "Burma (Myanmar)" },
      { trait_type: "Treatment",     value: "Unheated" },
      { trait_type: "Metal",         value: "18k Rose Gold" },
      { trait_type: "Certificate",   value: "GRS-2023-RB001" },
      { trait_type: "Issuer",        value: "Gem Gallery" }
    ]
  },
  {
    name: "Colombian Emerald Necklace",
    description: "1.8 ct Colombian emerald drop necklace in 18 k yellow gold with minor oil treatment.",
    image: "https://placehold.co/400x400/27ae60/white?text=Emerald+Necklace",
    issuer: "did:zeroid:gem-gallery",
    issuer_name: "Gem Gallery",
    price: "0.90",
    attributes: [
      { trait_type: "Asset Type",    value: "Emerald Necklace" },
      { trait_type: "Carat Weight",  value: "1.8 ct" },
      { trait_type: "Origin",        value: "Colombia" },
      { trait_type: "Treatment",     value: "Minor Oil" },
      { trait_type: "Metal",         value: "18k Yellow Gold" },
      { trait_type: "Certificate",   value: "GRS-2024-EM002" },
      { trait_type: "Issuer",        value: "Gem Gallery" }
    ]
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
