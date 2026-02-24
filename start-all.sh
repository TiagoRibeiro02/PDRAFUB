#!/bin/bash

# PDRAFUB Quick Start - Automated Setup Script
# This script runs all commands from the Quick Start Guide

set -e  # Exit on error

echo "PDRAFUB Quick Start - Starting All Services"
echo "================================================"
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down all services..."
    
    # Kill background jobs
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # Kill any remaining processes on the ports
    lsof -ti:8545 | xargs -r kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs -r kill -9 2>/dev/null || true
    lsof -ti:5174 | xargs -r kill -9 2>/dev/null || true
    lsof -ti:8000 | xargs -r kill -9 2>/dev/null || true
    
    echo "All services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "Step 1: Installing dependencies..."
echo ""

# Install nfts dependencies if needed
if [ ! -d "nfts/node_modules" ]; then
    echo "Installing nfts dependencies..."
    cd nfts
    npm install
    cd ..
fi

# Install zeroid-entity dependencies if needed
if [ ! -d "zeroid-entity/node_modules" ]; then
    echo "Installing zeroid-entity dependencies..."
    cd zeroid-entity
    npm install
    cd ..
fi

# Install zeroid-wallet dependencies if needed
if [ ! -d "zeroid-wallet/node_modules" ]; then
    echo "Installing zeroid-wallet dependencies..."
    cd zeroid-wallet
    npm install
    cd ..
fi

echo "Dependencies installed"
echo ""

echo "Step 2: Starting Hardhat Node..."
cd nfts
npx hardhat node > /tmp/hardhat.log 2>&1 &
HARDHAT_PID=$!
cd ..

# Wait for Hardhat to be ready
echo "Waiting for blockchain to start..."
sleep 5

if ! kill -0 $HARDHAT_PID 2>/dev/null; then
    echo "X Hardhat node failed to start. Check /tmp/hardhat.log"
    exit 1
fi

echo "Hardhat node running (PID: $HARDHAT_PID)"
echo ""

echo "Step 3: Deploying Contract & Minting NFTs..."
cd nfts
npm run deploy
npm run mint
cd ..
echo "Contract deployed and NFTs minted"
echo ""

echo "Step 4: Copying Contract Files..."

# Copy to zeroid-entity
mkdir -p zeroid-entity/src/contracts
cp nfts/frontend/src/contracts/MyNFT.json zeroid-entity/src/contracts/
cp nfts/frontend/src/contracts/contract-address.json zeroid-entity/src/contracts/

# Copy to zeroid-wallet
mkdir -p zeroid-wallet/src/contracts
cp nfts/frontend/src/contracts/MyNFT.json zeroid-wallet/src/contracts/
cp nfts/frontend/src/contracts/contract-address.json zeroid-wallet/src/contracts/

echo "Contract files copied to both interfaces"
echo ""

echo "Step 5: Starting Bank Interface (zeroid-entity)...${NC}"
cd zeroid-entity
npm run dev > /tmp/zeroid-entity.log 2>&1 &
ENTITY_PID=$!
cd ..
sleep 3
echo "Bank interface running (PID: $ENTITY_PID)"
echo ""

echo "Step 6: Starting User Wallet (zeroid-wallet)..."
cd zeroid-wallet
npm run dev > /tmp/zeroid-wallet.log 2>&1 &
WALLET_PID=$!
cd ..
sleep 3

# Start PHP backend
echo "Step 7: Starting PHP Backend..."
cd zeroid-wallet/backend
php -S localhost:8000 > /tmp/php-backend.log 2>&1 &
PHP_PID=$!
cd ../..
sleep 2
echo "PHP backend running (PID: $PHP_PID)"
echo ""

echo "================================================"
echo "All services started successfully!"
echo "================================================"
echo ""
echo "Access Points:"
echo "  Bank Interface:  http://localhost:5173"
echo "  User Wallet:     http://localhost:5174"
echo "  Blockchain RPC:  http://127.0.0.1:8545"
echo "  PHP Backend:     http://localhost:8000"
echo ""
echo "Next Steps:"
echo "  1. Open http://localhost:5173"
echo "     - Click 'NFT Bank' tab"
echo "     - Connect MetaMask (use Hardhat Account #0)"
echo ""
echo "  2. Open http://localhost:5174"
echo "     - Register/Login"
echo "     - Create your DID"
echo "     - View 'My NFTs'"
echo ""
echo "Logs:"
echo "  Hardhat:      tail -f /tmp/hardhat.log"
echo "  Bank:         tail -f /tmp/zeroid-entity.log"
echo "  Wallet:       tail -f /tmp/zeroid-wallet.log"
echo "  PHP Backend:  tail -f /tmp/php-backend.log"
echo ""
echo "To stop all services:"
echo "  Press Ctrl+C or run: ./stop-all.sh"
echo ""
echo "Press Ctrl+C to stop all services..."
echo ""

# Keep script running
while true; do
    sleep 1
    
    # Check if services are still running
    if ! kill -0 $HARDHAT_PID 2>/dev/null; then
        echo "X Hardhat node stopped unexpectedly"
        cleanup
    fi
    
    if ! kill -0 $ENTITY_PID 2>/dev/null; then
        echo "X Bank interface stopped unexpectedly"
        cleanup
    fi
    
    if ! kill -0 $WALLET_PID 2>/dev/null; then
        echo "X User wallet stopped unexpectedly"
        cleanup
    fi
    
    if ! kill -0 $PHP_PID 2>/dev/null; then
        echo "X PHP backend stopped unexpectedly"
        cleanup
    fi
done
