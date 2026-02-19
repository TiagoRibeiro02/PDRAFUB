# PDRAFUB - Decentralized Identity & NFT System

A blockchain-based platform for physical asset traceability using Decentralized Identifiers (DIDs) and NFTs, with a bank-intermediated purchase model.


## Components

- **zeroid-entity** - Bank interface for purchasing NFTs on behalf of users
- **zeroid-wallet** - User wallet for viewing DID-owned NFTs
- **nfts** - NFT smart contract with DID ownership tracking
- **hardhat-example** - Example Hardhat project

## Quick Start Guide

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

### 2. Deploy Contract & Mint NFTs

In a new terminal:
```bash
cd nfts
npm run deploy
npm run mint
```

The contract address and ABI are saved to `nfts/frontend/src/contracts/`.

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
- Refreshes automatically when new NFTs are purchased

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

**Bank Functions:**
```solidity
purchaseNFT(uint256 tokenId, string memory buyerDID) payable
setPrice(uint256 tokenId, uint256 newPrice)
getAvailableNFTs() returns (uint256[], uint256[])
```

**User/Wallet Functions:**
```solidity
tokensOfDID(string memory did) returns (uint256[])
getDidOwner(uint256 tokenId) returns (string)
tokenURI(uint256 tokenId) returns (string)
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

- [ ] Deploy to Ethereum testnet (Sepolia, Goerli)
- [ ] Add DID signature verification to prove ownership
- [ ] Implement QR code scanning for DID input
- [ ] Create batch purchase functionality
- [ ] Add purchase history and analytics
- [ ] Integrate real IPFS for NFT metadata
- [ ] Implement event-based wallet auto-refresh
- [ ] Add multi-language support

## License

[Add your license here]

## Contributing

[Add contributing guidelines]
