# Quick Start Guide: DID-Based NFT System (Bank Model)

## What You Have Now

✅ **Smart Contract** with DID ownership tracking  
✅ **Bank Interface** (ZeroID Entity) for purchasing NFTs for users  
✅ **User Wallet** (ZeroID Wallet) for viewing owned NFTs  
✅ **Automated purchase flow** where bank links DIDs to NFTs

## Quick Start (5 minutes)

### Terminal 1: Start Blockchain
```bash
cd nfts
npx hardhat node
```
Leave this running!

### Terminal 2: Deploy Contract & Mint NFTs
```bash
cd nfts
npm install  # if you haven't already
npm run deploy
npm run mint
```

### Terminal 3: Start Bank Interface (ZeroID Entity)
```bash
cd zeroid-entity
npm install  # this will now include ethers.js
npm run dev
```

### Terminal 4: Start User Wallet (ZeroID Wallet)
```bash
cd zeroid-wallet
npm install
npm run dev
```

## Configuration

### Bank Interface (ZeroID Entity)
1. Open http://localhost:5173
2. Click "NFT Bank" tab
3. Click "Set Contract Address" → Enter from `nfts/frontend/src/contracts/contract-address.json`
4. Click "Load Contract ABI" → Select `nfts/frontend/src/contracts/MyNFT.json`
5. Connect MetaMask with bank owner account (Hardhat Account #0)

### User Wallet (ZeroID Wallet)
1. Open http://localhost:5174
2. Register/Login and create DID
3. Identity tab → Configure same contract address and ABI
4. Go to "My NFTs" tab

## Usage Flow

### As Bank Operator (ZeroID Entity)
1. View available NFTs in "Available NFTs" section
2. Customer provides their DID: `did:zeroid:12345...`
3. Click "Purchase for User" on desired NFT
4. Enter customer's DID in popup
5. Confirm transaction in MetaMask
6. NFT is linked to customer's DID
7. View in "Purchased NFTs" section

### As Customer (ZeroID Wallet)
1. Visit bank and provide your DID
2. Bank purchases NFT for you
3. Open wallet → "My NFTs" tab
4. See your newly purchased NFT!

## Key Concepts

### Bank = Trusted Intermediary
- Operates ZeroID Entity interface
- Pays for NFTs with MetaMask
- Enters user's DID during purchase
- Maintains inventory and pricing

### User = DID Owner
- Has ZeroID Wallet
- Provides DID to bank
- Views NFTs in wallet
- No direct purchasing (goes through bank)

### Ownership Model
```
Before Purchase:
  Ethereum Owner: Bank Address
  DID Owner: "" (empty)

After Bank Purchases for User:
  Ethereum Owner: Bank Address (unchanged)
  DID Owner: "did:zeroid:12345..." (user's DID)
  
User's Wallet Shows: NFTs where DID Owner = their DID
```

## File Locations

- **Bank Interface**: `zeroid-entity/src/BankNFTManager.tsx`
- **User Wallet**: `zeroid-wallet/src/Wallet.tsx`
- **NFT Gallery**: `zeroid-wallet/src/components/NFTGallery.tsx`
- **Contract**: `nfts/contracts/MyNFT.sol`
- **Contract Address**: `nfts/frontend/src/contracts/contract-address.json`
- **Contract ABI**: `nfts/frontend/src/contracts/MyNFT.json`

## Troubleshooting

### Issue: "Access Denied" in Bank Interface
→ Connect with Hardhat Account #0 (contract owner/deployer)

### Issue: "Contract not configured"
→ Set contract address and load ABI in the interface

### Issue: User can't see purchased NFT
→ Check DID matches exactly what bank entered
→ Refresh the page
→ Verify contract is configured in wallet

### Issue: "Please install MetaMask"
→ Install MetaMask browser extension
→ Add Hardhat network (Chain ID: 1337, RPC: http://127.0.0.1:8545)

## What Makes This Special

🎯 **Bank-Mediated Purchases**: Bank buys NFTs for users, simplifying UX  
🎯 **DID-centric Ownership**: NFTs owned by DIDs, not Ethereum addresses  
🎯 **Decentralized Identity**: ZeroID system with SCRAM authentication  
🎯 **Dual Interface**: Bank management + User viewing  
🎯 **Trust Model**: Users trust bank to purchase honestly  

## Next Steps

- [ ] Deploy to testnet (Goerli, Sepolia)
- [ ] Add DID signature verification (prove user owns DID)
- [ ] Implement purchase history tracking
- [ ] Add QR code scanning for DIDs
- [ ] Create batch purchase functionality
- [ ] Add real IPFS image hosting
- [ ] Implement event-based wallet refreshing

## Full Documentation

See [BANK_NFT_SYSTEM.md](BANK_NFT_SYSTEM.md) for complete details.
