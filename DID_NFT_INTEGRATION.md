# DID-Based NFT System Integration Guide

This document explains how to use the integrated DID NFT system where:
- **DIDs** (Decentralized Identifiers) are the NFT owners
- **ZeroID Wallet** displays and purchases NFTs
- **NFT Frontend** acts as the "bank" for managing NFT inventory
- **MetaMask** facilitates Ethereum transactions

## Architecture Overview

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│  NFT Contract   │◄──────┤   NFT Bank UI    │       │  ZeroID Wallet  │
│   (Blockchain)  │       │  (Bank Owner)    │       │   (Customers)   │
└────────┬────────┘       └──────────────────┘       └────────┬────────┘
         │                                                     │
         │  - Tracks DID ownership                            │
         │  - Stores NFT metadata                             │
         │  - Manages pricing                                  │
         │                                                     │
         │◄────────────────────────────────────────────────────┘
                   purchaseNFT(tokenId, userDID)
```

## Setup Instructions

### 1. Deploy and Configure NFT Contract

```bash
cd nfts

# Install dependencies
npm install

# Start local Hardhat node (in a separate terminal)
npx hardhat node

# Deploy the contract (in another terminal)
npm run deploy

# Mint NFTs to the bank with prices
npm run mint
```

The contract address and ABI will be saved to `nfts/frontend/src/contracts/`.

### 2. Start the NFT Bank Interface

```bash
cd nfts/frontend

# Install dependencies
npm install

# Start the bank management interface
npm run dev
```

- Open http://localhost:5173
- Connect with MetaMask (use the bank owner's wallet from Hardhat)
- Set prices for NFTs to make them available in the marketplace

### 3. Configure ZeroID Wallet

```bash
cd zeroid-wallet

# Install dependencies (including ethers.js)
npm install

# Make sure backend is running (if using DID features)
# See backend/README.md for PHP backend setup

# Start the wallet application
npm run dev
```

- Open http://localhost:5174 (or the port shown)
- Login or register an account
- Create your DID if you haven't already

### 4. Connect NFT Contract to ZeroID Wallet

In the ZeroID Wallet:

1. Go to the **Identity** tab
2. Click "Set Contract Address"
3. Enter the NFT contract address from step 1 (found in `nfts/frontend/src/contracts/contract-address.json`)
4. Click "Load Contract ABI"
5. Select the file: `nfts/frontend/src/contracts/MyNFT.json`

### 5. Purchase NFTs

In the ZeroID Wallet:

1. Go to the **Marketplace** tab
2. Browse available NFTs
3. Click "Buy Now" on any NFT
4. MetaMask will popup:
   - Confirm the transaction
   - Pay the price in ETH
   - The NFT will be linked to your DID
5. Check the **My NFTs** tab to see your purchased NFTs

## How It Works

### Bank Operations (NFT Frontend)

The bank owner (contract deployer) uses the NFT Frontend to:
- Mint new NFTs to the bank inventory
- Set prices for NFTs (making them available for purchase)
- Update prices
- View inventory statistics

### Customer Purchases (ZeroID Wallet)

Users purchase NFTs through the ZeroID Wallet:
1. User browses marketplace
2. Clicks "Buy Now" → MetaMask opens
3. User pays with ETH from MetaMask
4. Contract records the user's DID as the owner
5. NFT appears in user's "My NFTs" tab

### DID Ownership

NFTs track ownership in two ways:
1. **Ethereum Address** (ERC721 standard)
   - Bank's address holds unsold NFTs
   - Stays with bank even after DID purchase (custodial model)
2. **DID String** (custom mapping)
   - Empty string = owned by bank
   - Valid DID = owned by that user
   - Shown as the "real" owner

```solidity
mapping(uint256 => string) private _didOwners;

function purchaseNFT(uint256 tokenId, string memory buyerDID) {
    // ... payment logic ...
    _didOwners[tokenId] = buyerDID;  // Record DID ownership
}

function tokensOfDID(string memory did) public view returns (uint256[] memory) {
    // Returns all NFTs owned by this DID
}
```

## MetaMask Configuration

### Connect to Local Hardhat Network

1. Open MetaMask
2. Click network dropdown → Add Network
3. Enter:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 1337
   - Currency Symbol: ETH

### Import Hardhat Test Accounts

When you run `npx hardhat node`, it prints 20 test accounts with private keys. Import one:

1. MetaMask → Account icon → Import Account
2. Paste the private key from Hardhat output
3. This account has test ETH

**⚠️ NEVER use Hardhat test accounts on real networks!**

## Contract Functions Reference

### For Bank Owner

```solidity
// Mint NFT to bank with price
function mintNFT(string memory tokenURI, uint256 price) returns (uint256)

// Set/update price for NFT (0 = not for sale)
function setPrice(uint256 tokenId, uint256 newPrice)

// Get all NFTs in bank
function tokensOfOwner(address owner) returns (uint256[] memory)

// Get NFTs available for sale
function getAvailableNFTs() returns (uint256[] memory, uint256[] memory)
```

### For Customers

```solidity
// Purchase NFT with DID
function purchaseNFT(uint256 tokenId, string memory buyerDID) payable

// Get NFTs owned by DID
function tokensOfDID(string memory did) returns (uint256[] memory)

// Get DID owner of NFT
function getDidOwner(uint256 tokenId) returns (string memory)

// Get price of NFT
function getPrice(uint256 tokenId) returns (uint256)
```

## Troubleshooting

### "Contract not configured"
- Make sure you've set the contract address and loaded the ABI in the Identity tab

### "NFT not available from bank"
- The NFT has already been purchased
- Check the marketplace for other available NFTs

### "Insufficient payment"
- Make sure your MetaMask account has enough ETH
- Check the price of the NFT

### MetaMask not popup
- Make sure MetaMask is installed
- Check that you're on the correct network (Hardhat Local)
- Refresh the page and try again

### NFTs not showing in wallet
- Make sure the contract address and ABI are configured correctly
- Check that your DID has purchased NFTs
- Try refreshing the page

## Security Considerations

### For Production

1. **Smart Contract Auditing**
   - Get the contract audited before mainnet deployment
   - Test extensively on testnets

2. **DID Verification**
   - Add signature verification to prove DID ownership
   - Prevent users from purchasing with someone else's DID

3. **HTTPS**
   - Always use HTTPS in production
   - Secure the backend PHP API

4. **Private Key Storage**
   - Never store private keys in the browser
   - Use hardware wallets for significant assets

5. **Price Oracle**
   - Consider adding price oracles for dynamic pricing
   - Implement anti-front-running measures

## Advanced Features (Future)

- **DID-to-DID Transfers**: Transfer NFTs between DIDs
- **Zero-Knowledge Proofs**: Prove NFT ownership without revealing DID
- **Royalties**: Add royalty payments to original creators
- **Fractional Ownership**: Allow multiple DIDs to own portions of an NFT
- **Lending/Staking**: Use NFTs as collateral while maintaining DID ownership

## Support

For questions or issues:
- Check the contract events in Hardhat logs
- Use MetaMask's activity tab to debug transactions
- Review console logs in browser developer tools
