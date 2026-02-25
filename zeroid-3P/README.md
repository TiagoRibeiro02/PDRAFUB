# ZeroID Third Party NFT Viewer

A React application for third parties to view and search ZeroID NFTs with detailed information. This viewer displays all purchased NFTs from the blockchain and allows searching by DID, name, token ID, or wallet address.

## Features

- 📋 **Display all purchased NFTs** - Shows all NFTs that have been linked to DIDs
- 🔍 **Search by DID** - Search for specific DIDs to see their NFTs
- 🎯 **Click to view details** - Expandable detail panel on the right side
- ✅ **KYC Compliance status** - Shows which DIDs are verified and compliant
- 🖼️ **NFT Images** - Displays NFT images from metadata
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🌓 **Dark/Light Mode** - Automatically adapts to system preferences
- 🔄 **Live blockchain data** - Fetches real NFTs from the smart contract

## How It Works

The third party viewer connects to the blockchain and:
1. Reads all NFTs from the deployed contract
2. Filters to show only NFTs that have been purchased (have a DID owner)
3. Checks KYC compliance status for each DID
4. Displays NFTs in a searchable, interactive grid

**Note:** Only NFTs that have been purchased by the bank and linked to a DID will appear. This ensures the viewer only shows NFTs with actual owners.

## Getting Started

### Using the Automated Script

The easiest way is to run the main project's start script:

```bash
cd ..  # Go to PDRAFUB root
./start-all.sh
```

This automatically:
- Deploys contracts
- Copies contract files to zeroid-3P
- Starts the viewer on port 5175

### Manual Setup

If you want to run just this component:

```bash
# Install dependencies
npm install

# Make sure contract files are copied from nfts project
# The start-all.sh script does this automatically

# Start development server
npm run dev
```

Visit **http://localhost:5175**

## Usage

1. **Browse NFTs** - All purchased NFTs are displayed in the grid
2. **Search** - Use the search bar to filter by:
   - DID (e.g., `did:zeroid:12345...`)
   - Name (e.g., "John Doe")
   - Token ID (e.g., "1")
   - Wallet address
3. **View Details** - Click any NFT card to see complete information
4. **Check Compliance** - Green checkmark (✅) indicates KYC verified
5. **Refresh** - Click the refresh button to reload NFTs from blockchain

## What You'll See

- **NFT Image** - Visual representation of the identity NFT
- **Name** - The person's name from the NFT metadata
- **DID** - The decentralized identifier
- **Token ID** - The blockchain token number
- **Issue Date** - When the NFT was issued
- **Compliance Status** - Whether the DID is KYC/AML verified
- **Owner Address** - The Ethereum address that owns the NFT
- **Document Details** - Type, number, and issuing authority

## Use Cases

- **Government Agencies** - Verify identity NFTs and compliance
- **Businesses** - Check customer DIDs before providing services
- **Auditors** - Review all issued NFTs and their compliance status
- **Public Transparency** - Anyone can view NFTs without needing MetaMask
- **Regulatory Compliance** - Track which DIDs are verified

## Technical Details

- Built with React + TypeScript + Vite
- Uses ethers.js to read from blockchain
- Connects to local Hardhat network (port 8545)
- No wallet required - read-only access
- Falls back to RPC provider if MetaMask not available

## Notes

- This is a **read-only** viewer - no transactions or purchases
- Only shows NFTs that have been purchased and linked to a DID
- Automatically detects contract addresses from deployment
- KYC compliance data is read from the KYCCompliance smart contract
- No personal information is revealed, only compliance status
