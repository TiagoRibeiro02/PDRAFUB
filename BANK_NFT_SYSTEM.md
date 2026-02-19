# DID-Based NFT System - Bank Model Integration Guide

This document explains the integrated DID NFT system where:
- **ZeroID Entity** (Bank Interface) - Bank purchases NFTs for users
- **ZeroID Wallet** (User Interface) - Users view their NFT assets
- **DIDs** are the NFT owners
- **MetaMask** facilitates Ethereum transactions

## Architecture Overview

```
┌──────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  NFT Contract    │◄──────┤  Bank Interface │       │  User Wallet    │
│  (Blockchain)    │       │ (ZeroID Entity) │       │(ZeroID Wallet)  │
└────────┬─────────┘       └─────────────────┘       └────────┬────────┘
         │                                                     │
         │  Bank purchases NFT for user's DID                 │
         │  contract.purchaseNFT(tokenId, userDID)            │
         │                                                     │
         │                   User views NFTs by DID ──────────┘
         │                   contract.tokensOfDID(userDID)
```

## **Flow**

1. **User comes to Bank** (zeroid-entity)
2. **User provides their DID** to bank operator
3. **Bank purchases NFT** using MetaMask and enters  user's DID
4. **Contract links NFT** to user's DID
5. **User views NFT** in their ZeroID Wallet

## Setup Instructions

### 1. Deploy NFT Contract

```bash
cd nfts

# Install dependencies
npm install

# Start local Hardhat node (Terminal 1 - keep running)
npx hardhat node

#Terminal 2: Deploy and mint NFTs
npm run deploy
npm run mint
```

Contract files are saved to `nfts/frontend/src/contracts/`.

### 2. Configure Bank Interface (ZeroID Entity)

```bash
cd zeroid-entity

# Install dependencies (including ethers.js)
npm install

# Start the bank interface
npm run dev
```

Then:
1. Open http://localhost:5173 (or the port shown)
2. Click "NFT Bank" tab
3. Click "Set Contract Address"
4. Enter contract address from `nfts/frontend/src/contracts/contract-address.json`
5. Click "Load Contract ABI"
6. Select `nfts/frontend/src/contracts/MyNFT.json`
7. Connect with MetaMask (use the bank owner's wallet from Hardhat)

### 3. Configure User Wallet (ZeroID Wallet)

```bash
cd zeroid-wallet

# Make sure dependencies are installed
npm install

# Start backend if using DID features (see backend/README.md)

# Start wallet
npm run dev
```

Then:
1. Open http://localhost:5174 (or the port shown)
2. Register/Login
3. Create DID if you haven't
4. Click "Identity" tab
5. Configure NFT contract (same address and ABI as bank)

## Usage Guide

### Bank Operations (ZeroID Entity)

**Available NFTs Section:**
- Shows NFTs that have prices set and are ready for purchase
- Each NFT displays: name, image, description, price
- Button: "Purchase for User"
- Button: "Update Price"

**Purchased NFTs Section:**
- Shows NFTs that have been assigned to user DIDs
- Displays the owner's DID for each NFT
- Read-only view of sold inventory

**Purchasing Flow:**
1. Bank operator clicks "Purchase for User" on an NFT
2. Popup asks for user's DID
3. Bank operator enters: `did:zeroid:12345678-1234-1234-1234-123456789abc`
4. Confirmation dialog shows NFT details and user DID
5. MetaMask opens for bank to pay
6. Transaction confirms
7. NFT is linked to user's DID
8. User can now see it in their wallet

### User Experience (ZeroID Wallet)

**Identity Tab:**
- View DID and DID Document
- Configure NFT contract address and ABI
- Security information about private keys

**My NFTs Tab:**
- Automatic display of NFTs owned by user's DID
- Shows: name, image, description, token ID, owner DID
- Informational message about how to get NFTs (via bank)
- No purchase functionality (users go to bank for that)

## Contract Functions

### Bank Functions

```solidity
// Purchase NFT and assign to user's DID
function purchaseNFT(uint256 tokenId, string memory buyerDID) payable

// Set price for NFT (only owner)
function setPrice(uint256 tokenId, uint256 newPrice)

// Get available NFTs and their prices
function getAvailableNFTs() returns (uint256[] memory, uint256[] memory)
```

### User/Wallet Functions

```solidity
// Get NFTs owned by a DID
function tokensOfDID(string memory did) returns (uint256[] memory)

// Get DID owner of an NFT
function getDidOwner(uint256 tokenId) returns (string memory)

// Get NFT metadata
function tokenURI(uint256 tokenId) returns (string memory)
```

## MetaMask Configuration

### Add Local Hardhat Network

1. MetaMask → Networks → Add Network
2. Settings:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 1337
   - Currency: ETH

### Import Bank Account

When you run `npx hardhat node`, it shows test accounts. Import Account #0 (the deployer):

1. Copy private key from Hardhat output (Account #0)
2. MetaMask → Import Account → Paste private key
3. This account is the contract owner (bank)

**⚠️ NEVER use Hardhat accounts on real networks!**

## Security Model

### Trust Architecture

- **Bank is Trusted**: Users trust the bank to purchase NFTs honestly
- **DID Verification**: In production, add proof that user owns the DID
- **Centralized Purchase**: Bank pays gas fees, simplifies user experience
- **Decentralized Ownership**: DIDs provably own NFTs on-chain

### For Production

1. **Add DID Signature Verification**
   ```solidity
   function purchaseNFT(
       uint256 tokenId,
       string memory buyerDID,
       bytes memory didSignature
   ) payable {
       require(verifyDIDSignature(buyerDID, didSignature), "Invalid DID proof");
       // ... rest of function
   }
   ```

2. **Implement Access Control**
   - Bank operator authentication
   - Rate limiting
   - Audit logs

3. **Use IPFS for Metadata**
   - Upload images to IPFS
   - Use IPFS CIDs as tokenURI
   - Permanent, decentralized storage

4. **Add Events Monitoring**
   - Listen for NFTPurchased events
   - Auto-refresh wallet UI
   - Notification system

## Troubleshooting

### Bank Interface

**"Access Denied - not bank owner"**
→ Connect with the account that deployed the contract (Hardhat Account #0)

**"Contract not configured"**
→ Set contract address and load ABI in the header section

**"Purchase failed: Invalid DID"**
→ Ensure DID starts with "did:" and is correctly formatted

### User Wallet

**"No NFTs shown"**
→ Check that:
- Contract configured correctly
- User's DID has been used to purchase NFTs
- Blockchain node is running

**"Contract not configured"**
→ Set contract address and load ABI in Identity tab

## Advanced Features (Future)

- **Batch Purchases**: Buy multiple NFTs for a user at once
- **QR Code DID Input**: Scan user's DID with QR code
- **DID Verification**: Require users to prove DID ownership
- **Purchase History**: Track all purchases by DID
- **Refunds/Returns**: Transfer  NFTs back to bank inventory
- **Secondary Market**: Allow DID-to-DID transfers
- **Collection Management**: Organize NFTs into collections

## File Structure

```
zeroid-entity/
  src/
    App.tsx              # Main app with tabs (NFT Bank + ZK Issuer)
    BankNFTManager.tsx   # Bank NFT interface component
    issuer.tsx           # ZK proof utilities

zeroid-wallet/
  src/
    Wallet.tsx           # Main wallet with tabs (Identity + NFTs)
    components/
      NFTGallery.tsx     # Display user's NFTs

nfts/
  contracts/
    MyNFT.sol            # NFT contract with DID ownership
  scripts/
    deploy.ts            # Contract deployment
    mint.ts              # Mint NFTs to bank with prices
  frontend/src/contracts/
    contract-address.json  # Contract address
    MyNFT.json           # Contract ABI
```

## Quick Commands

```bash
# Terminal 1: Blockchain
cd nfts && npx hardhat node

# Terminal 2: Deploy & Mint
cd nfts && npm run deploy && npm run mint

# Terminal 3: Bank Interface
cd zeroid-entity && npm run dev

# Terminal 4: User Wallet  
cd zeroid-wallet && npm run dev

# Terminal 5: Backend (optional, for DID features)
cd zeroid-wallet/backend && php -S localhost:8000
```

## Support

- Contract events visible in Hardhat terminal
- MetaMask activity tab for transaction debugging
- Browser console for frontend errors
- Check DID format: `did:zeroid:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
