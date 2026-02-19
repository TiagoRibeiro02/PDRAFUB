#!/bin/bash

# Quick setup script for DID-Based NFT System
# This script helps you configure the ZeroID wallet with the NFT contract

set -e

echo "========================================="
echo "DID NFT System Configuration"
echo "========================================="
echo ""

# Check if contract address file exists
CONTRACT_FILE="nfts/frontend/src/contracts/contract-address.json"
ABI_FILE="nfts/frontend/src/contracts/MyNFT.json"

if [ ! -f "$CONTRACT_FILE" ]; then
    echo "❌ Contract address file not found!"
    echo "   Please deploy the NFT contract first:"
    echo "   cd nfts && npm run deploy && npm run mint"
    exit 1
fi

if [ ! -f "$ABI_FILE" ]; then
    echo "❌ Contract ABI file not found!"
    echo "   Please deploy the NFT contract first:"
    echo "   cd nfts && npm run deploy"
    exit 1
fi

echo "✓ Found contract files"
echo ""

# Extract contract address
CONTRACT_ADDRESS=$(node -e "console.log(require('./$CONTRACT_FILE').MyNFT)")
echo "NFT Contract Address: $CONTRACT_ADDRESS"
echo ""

# Copy ABI to a temporary location for easy access
mkdir -p tmp
cp "$ABI_FILE" tmp/MyNFT.json

echo "========================================="
echo "Next Steps:"
echo "========================================="
echo ""
echo "1. Open ZeroID Wallet: http://localhost:5174"
echo ""
echo "2. Login/Register and create your DID"
echo ""
echo "3. Go to the Identity tab"
echo ""
echo "4. Click 'Set Contract Address' and enter:"
echo "   $CONTRACT_ADDRESS"
echo ""
echo "5. Click 'Load Contract ABI' and select:"
echo "   $(pwd)/tmp/MyNFT.json"
echo ""
echo "6. Go to the Marketplace tab to purchase NFTs!"
echo ""
echo "========================================="
echo "Quick Copy (Contract Address):"
echo "$CONTRACT_ADDRESS" | tee /dev/tty | pbcopy 2>/dev/null || xclip -selection clipboard 2>/dev/null || true
echo "========================================="
echo ""
