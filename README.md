# PDRAFUB - Decentralized Identity & NFT System

A blockchain-based platform for physical asset traceability using Decentralized Identifiers (DIDs) and NFTs, with a bank-intermediated purchase model and **zero-knowledge proof KYC/AML compliance verification**.

## 🌟 Highlights

- **Privacy-First Compliance** - Prove KYC/AML compliance without revealing personal data
- **Zero-Knowledge Proofs** - PLONK proofs verified on-chain using snarkjs and circom
- **DID-Based Ownership** - Decentralized identifiers link users to their NFTs
- **Bank-Intermediated Model** - Banks purchase NFTs on behalf of users, simplifying UX
- **Public Verification** - Anyone can verify if a DID is compliant (but not see personal data)
- **On-Chain Transparency** - All compliance proofs permanently stored on blockchain


## Components

- **zeroid-entity** - Bank interface for purchasing NFTs on behalf of users and issuing KYC compliance proofs
- **zeroid-wallet** - User wallet for viewing DID-owned NFTs with compliance status
- **zeroid-3P** - Third party viewer for searching and viewing all NFTs in the system
- **nfts** - NFT smart contract with DID ownership tracking and KYC compliance verification
- **hardhat-example** - Example Hardhat project

## Features

- 🏦 **Bank-Intermediated NFT Purchases** - Banks purchase NFTs on behalf of users
- 🆔 **Decentralized Identity (DID)** - User ownership tracked via DIDs
- ✅ **KYC/AML Compliance** - Zero-knowledge proof verification of compliance
- 🔐 **Privacy-Preserving** - ZK proofs verify compliance without revealing personal data
- 📜 **On-Chain Verification** - All compliance proofs verified on blockchain
- 🔍 **Public Transparency** - Anyone can verify if a DID is KYC compliant

## Quick Start Guide

### Automated Setup (Recommended)

The easiest way to get started:

```bash
./start-all.sh
```

This script will:
1. Install all dependencies
2. Start Hardhat blockchain node
3. Deploy NFT contracts and mint NFTs
4. Deploy KYC Compliance contracts
5. Copy contract files to all interfaces
6. Start Bank Interface (http://localhost:5173)
7. Start User Wallet (http://localhost:5174)
8. Start PHP Backend (http://localhost:8000)
9. Start Third Party Viewer (http://localhost:5175)

Press `Ctrl+C` to stop all services, or run `./stop-all.sh`

### Manual Setup

If you prefer to run each step manually:

### Prerequisites

- Node.js (v18+)
- MetaMask browser extension
- Git

### 1. Start Local Blockchain

```bash
cd nfts
npm install
npx hardhat node  # Keep this running in Terminal 1
```

### 2. Deploy Contracts & Mint NFTs

In a new terminal:
```bash
cd nfts
npm run deploy      # Deploy NFT contract
npm run mint        # Mint initial NFTs
npm run deploy:kyc  # Deploy KYC Compliance contracts
```

The contract addresses and ABIs are saved to:
- NFT: `nfts/frontend/src/contracts/`
- KYC: `nfts/artifacts/kyc-deployment.json` (auto-copied to zeroid-entity)

### 3. Copy Contract Files

Contract files need to be available to both bank and wallet interfaces:

```bash
# Copy to zeroid-entity (Bank Interface)
cp nfts/frontend/src/contracts/MyNFT.json zeroid-entity/src/contracts/

# Copy to zeroid-wallet (User Wallet)
cp nfts/frontend/src/contracts/MyNFT.json zeroid-wallet/src/contracts/
```

Files are already created:
- `zeroid-entity/src/contracts/contract-address.json` ✓
- `zeroid-wallet/src/contracts/contract-address.json` ✓

### 4. Start Bank Interface

```bash
cd zeroid-entity
npm install
npm run dev
```

Open http://localhost:5173
- Click "NFT Bank" tab
- Click "Connect Wallet"
- Connect MetaMask (use Hardhat Account #0 - the deployer)

### 5. Start User Wallet

```bash
cd zeroid-wallet
npm install
npm run dev

cd backend
php -S localhost:8000
```

Open http://localhost:5174
- Register/Login
- Create your DID
- Go to "My NFTs" tab

### 6. Start Third Party Viewer (Optional)

```bash
cd zeroid-3P
npm install
npm run dev
```

Open http://localhost:5175
- View all NFTs in the system
- Search by DID or other identifiers
- Click on NFTs to see details

## MetaMask Configuration

### Add Hardhat Network

1. Open MetaMask → Networks → Add Network
2. Configure:
   - **Network Name**: Hardhat Local
   - **RPC URL**: http://127.0.0.1:8545
   - **Chain ID**: 1337
   - **Currency Symbol**: ETH

### Import Bank Account

Import Hardhat Account #0 (the deployer/bank owner):

1. When you run `npx hardhat node`, copy the private key for Account #0
2. MetaMask → Import Account → Paste private key
3. This account owns the contract and can manage NFTs

## Usage Guide

### Bank Operations (ZeroID Entity)

1. Open bank interface at http://localhost:5173
2. Connect with MetaMask (Account #0)
3. Click "NFT Bank" tab

**Available NFTs Section:**
- Shows NFTs ready for purchase with their prices
- Click "Purchase for User" button
- Enter customer's DID: `did:zeroid:12345678-1234-1234-1234-123456789abc`
- Confirm transaction in MetaMask
- NFT is linked to the user's DID

**Purchased NFTs Section:**
- View all NFTs assigned to user DIDs
- See which DID owns each NFT

### User Experience (ZeroID Wallet)

1. Open wallet at http://localhost:5174
2. Register and create your DID

**Identity Tab:**
- View your DID and DID Document
- Your DID looks like: `did:zeroid:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Copy your DID to provide to the bank

**My NFTs Tab:**
- Automatically displays NFTs owned by your DID
- Shows NFT image, name, description, and token ID
- **✅ KYC/AML Compliance Badge** - Shows if the DID is verified
- Refreshes automatically when new NFTs are purchased

### KYC Compliance System (ZeroID Entity)

1. Open bank interface at http://localhost:5173
2. Click "ZK Proof Issuer" tab
3. Generate and submit compliance proofs:

**Generate Zero-Knowledge Proof:**
- Enter user's DID (e.g., `did:zeroid:12345...`)
- Click "Generate PLONK ZK Proof"
- Proof is created showing compliance without revealing personal data

**Submit to Blockchain:**
- Click "Submit to Blockchain"
- Proof is verified on-chain via PLONK verifier
- If valid, DID is marked as KYC/AML compliant
- Timestamp and commitment are stored permanently

**View Compliance Status:**
- Go to "NFT Bank" tab → "Purchased NFTs"
- Each NFT shows compliance badge:
  - ✅ Green = KYC/AML Compliant (with verification date)
  - ⚠️ Warning = Not Verified

**Key Features:**
- **Privacy-Preserving**: No personal data revealed, only compliance status
- **Cryptographically Verified**: Zero-knowledge proofs proven on-chain
- **Publicly Auditable**: Anyone can check if a DID is compliant
- **Issuer-Controlled**: Only authorized entities can submit proofs

## How It Works

### Purchase Flow

1. **User visits Bank** - Provides their DID to bank operator
2. **Bank purchases NFT** - Using zeroid-entity interface and MetaMask
3. **Bank enters user's DID** - Links NFT to user's decentralized identity
4. **Contract records ownership** - Blockchain stores DID → NFT mapping
5. **User views NFT** - Automatically appears in zeroid-wallet

### Ownership Model

```javascript
// Before Purchase
Ethereum Owner: Bank Address (0xf39f...)
DID Owner: "" (empty)

// After Bank Purchases for User
Ethereum Owner: Bank Address (unchanged)
DID Owner: "did:zeroid:12345..." (user's DID)

// User's Wallet Shows
NFTs where DID Owner == user's DID
```

### Smart Contract Functions

**NFT Contract - Bank Functions:**
```solidity
purchaseNFT(uint256 tokenId, string memory buyerDID) payable
setPrice(uint256 tokenId, uint256 newPrice)
getAvailableNFTs() returns (uint256[], uint256[])
```

**NFT Contract - User/Wallet Functions:**
```solidity
tokensOfDID(string memory did) returns (uint256[])
getDidOwner(uint256 tokenId) returns (string)
tokenURI(uint256 tokenId) returns (string)
```

**KYC Compliance Contract:**
```solidity
// Submit zero-knowledge proof (issuer only)
submitComplianceProof(string did, string commitment, bytes proof, uint[] publicSignals)

// Check compliance status (public)
checkCompliance(string did) returns (bool isCompliant, uint256 timestamp, string commitment)
isCompliant(string did) returns (bool)

// Revoke compliance (issuer only)
revokeCompliance(string did)
```

## Technologies

- **Blockchain**: Hardhat, Solidity, Ethereum
- **Smart Contracts**: OpenZeppelin, ethers.js
- **Frontend**: React, TypeScript, Vite
- **Identity**: DIDs, Web Crypto API, ECDSA
- **Zero-Knowledge**: snarkjs, circom, PLONK
- **Authentication**: SCRAM-SHA-256
- **Backend**: PHP (for wallet authentication)

## Troubleshooting

### "Access Denied - not bank owner"
→ Connect MetaMask with Hardhat Account #0 (the deployer)

### "Contract files not found"
→ Copy `MyNFT.json` from `nfts/frontend/src/contracts/` to both:
  - `zeroid-entity/src/contracts/`
  - `zeroid-wallet/src/contracts/`

### "User can't see purchased NFT"
→ Verify DID matches exactly (case-sensitive)  
→ Refresh the wallet page  
→ Check contract is deployed and running

### "Please install MetaMask"
→ Install MetaMask browser extension  
→ Add Hardhat network (Chain ID: 1337)

### Contract redeployment
If you redeploy the contract, update `contract-address.json` in:
- `nfts/frontend/src/contracts/`
- `zeroid-entity/src/contracts/`
- `zeroid-wallet/src/contracts/`

And update `kyc-deployment.json` in:
- `zeroid-entity/src/contracts/`

### "KYC contract not deployed" error
→ Run `npm run deploy:kyc` from the nfts directory  
→ Ensure Hardhat node is running  
→ Check that `kyc-deployment.json` exists in `zeroid-entity/src/contracts/`

### Compliance badge not showing
→ Ensure KYC contracts are deployed  
→ Generate and submit a proof for the DID in "ZK Proof Issuer" tab  
→ Check browser console for errors
## Third Party Viewer (zeroid-3P)

The Third Party Viewer at http://localhost:5175 provides a public interface for viewing all NFTs:

### Features
- **View All NFTs**: Grid display of all minted NFTs in the system
- **Search Functionality**: Search by DID, name, token ID, or wallet address
- **Detail Panel**: Click any NFT to see complete information including:
  - Identity information (name, DID, nationality)
  - Document details (type, number, issuer)
  - NFT details (token ID, owner address, status)
  - Issue and expiration dates
  - KYC compliance status
- **Responsive Design**: Works on desktop and mobile devices
- **Dark/Light Mode**: Automatically adapts to system preferences

### Use Cases
- **Regulatory Compliance**: Government agencies can search and verify NFTs
- **Audit Trail**: Third parties can view all issued NFTs
- **Verification**: Businesses can verify customer DIDs and compliance status
- **Transparency**: Public can see all NFTs without needing MetaMask
## Security Considerations

### Current Model (Development)
- **Trust-based**: Users trust the bank to purchase honestly
- **Centralized purchases**: Bank pays gas fees, simplifies UX
- **Decentralized ownership**: DIDs provably own NFTs on-chain

### Production Recommendations
1. **Add DID signature verification** - Prove user owns the DID
2. **Implement access controls** - Multi-sig or DAO for bank operations
3. **Add audit logging** - Track all purchases and price changes
4. **Use real IPFS** - Decentralized NFT metadata storage
5. **Deploy to testnet** - Test on Goerli or Sepolia before mainnet

## Next Steps

- [x] Zero-knowledge proof KYC/AML compliance verification
- [x] Privacy-preserving compliance status display
- [ ] Deploy to Ethereum testnet (Sepolia, Goerli)
- [ ] Add DID signature verification to prove ownership
- [ ] Implement QR code scanning for DID input
- [ ] Create batch purchase functionality
- [ ] Add purchase history and analytics
- [ ] Integrate real IPFS for NFT metadata
- [ ] Implement event-based wallet auto-refresh
- [ ] Add multi-language support
- [ ] Support for multiple issuer entities
- [ ] Compliance expiration dates
- [ ] Different compliance levels (basic, enhanced, etc.)

## License

[Add your license here]

## Contributing

[Add contributing guidelines]
