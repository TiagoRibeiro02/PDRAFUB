#!/bin/bash

# PDRAFUB Quick Start - Automated Setup Script
# This script runs all commands from the Quick Start Guide

set -e  # Exit on error

echo "Quick Start - Starting All Services"
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
    lsof -ti:5175 | xargs -r kill -9 2>/dev/null || true
    lsof -ti:5176 | xargs -r kill -9 2>/dev/null || true
    lsof -ti:8000 | xargs -r kill -9 2>/dev/null || true
    lsof -ti:8001 | xargs -r kill -9 2>/dev/null || true
    lsof -ti:8002 | xargs -r kill -9 2>/dev/null || true
    lsof -ti:8003 | xargs -r kill -9 2>/dev/null || true
    
    echo "All services stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "1: Installing dependencies..."
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
    echo "Installing Entity dependencies..."
    cd zeroid-entity
    npm install
    cd ..
fi

# Install zeroid-wallet dependencies if needed
if [ ! -d "zeroid-wallet/node_modules" ]; then
    echo "Installing Wallet dependencies..."
    cd zeroid-wallet
    npm install
    cd ..
fi

# Install zeroid-3P dependencies if needed
if [ ! -d "zeroid-3P/node_modules" ]; then
    echo "Installing 3Party dependencies..."
    cd zeroid-3P
    npm install
    cd ..
fi

# Install zeroid-issuer dependencies if needed
if [ ! -d "zeroid-issuer/node_modules" ]; then
    echo "Installing Issuer dependencies..."
    cd zeroid-issuer
    npm install
    cd ..
fi

echo "Dependencies installed"
echo ""

echo "2: Starting Hardhat Node..."
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

echo "3: Deploying NFT Contract & Minting..."
cd nfts
npm run deploy
npm run mint
cd ..
echo "NFT contract deployed and NFTs minted"
echo ""

echo "4: Deploying KYC Compliance Contracts..."
# Copy the PlonkVerifier to nfts contracts if it exists
if [ -f "zeroid-entity/Verifier.sol" ]; then
    echo "Copying PlonkVerifier from zeroid-entity..."
    cp zeroid-entity/Verifier.sol nfts/contracts/PlonkVerifier.sol
else
    echo "Warning: Verifier.sol not found in zeroid-entity. Using placeholder."
fi

cd nfts
npm run deploy:kyc
cd ..
echo "KYC Compliance contracts deployed"
echo ""

echo "5: Copying Contract Files..."

# Copy to zeroid-entity
mkdir -p zeroid-entity/src/contracts
cp nfts/frontend/src/contracts/MyNFT.json zeroid-entity/src/contracts/
cp nfts/frontend/src/contracts/contract-address.json zeroid-entity/src/contracts/

# Copy to zeroid-wallet
mkdir -p zeroid-wallet/src/contracts
cp nfts/frontend/src/contracts/MyNFT.json zeroid-wallet/src/contracts/
cp nfts/frontend/src/contracts/contract-address.json zeroid-wallet/src/contracts/

# Copy KYC contracts to zeroid-wallet
if [ -f "zeroid-entity/src/contracts/kyc-deployment.json" ]; then
    cp zeroid-entity/src/contracts/kyc-deployment.json zeroid-wallet/src/contracts/
    cp zeroid-entity/src/contracts/KYCCompliance.json zeroid-wallet/src/contracts/
fi

# Copy to zeroid-3P
mkdir -p zeroid-3P/src/contracts
cp nfts/frontend/src/contracts/MyNFT.json zeroid-3P/src/contracts/
cp nfts/frontend/src/contracts/contract-address.json zeroid-3P/src/contracts/

# Copy KYC contracts to zeroid-3P
if [ -f "zeroid-entity/src/contracts/kyc-deployment.json" ]; then
    cp zeroid-entity/src/contracts/kyc-deployment.json zeroid-3P/src/contracts/
    cp zeroid-entity/src/contracts/KYCCompliance.json zeroid-3P/src/contracts/
    cp zeroid-entity/src/contracts/PlonkVerifierAdapter.json zeroid-3P/src/contracts/
fi

# Copy to zeroid-issuer
mkdir -p zeroid-issuer/src/contracts
cp nfts/frontend/src/contracts/MyNFT.json zeroid-issuer/src/contracts/
cp nfts/frontend/src/contracts/contract-address.json zeroid-issuer/src/contracts/

# Copy KYC contracts to zeroid-issuer
if [ -f "zeroid-entity/src/contracts/kyc-deployment.json" ]; then
    cp zeroid-entity/src/contracts/kyc-deployment.json zeroid-issuer/src/contracts/
    cp zeroid-entity/src/contracts/KYCCompliance.json zeroid-issuer/src/contracts/
fi

echo "Contract files copied to all interfaces"
echo ""

echo "6: Starting Bank Interface..."
cd zeroid-entity
npm run dev > /tmp/zeroid-entity.log 2>&1 &
ENTITY_PID=$!
cd ..
sleep 3
echo "Bank interface running (PID: $ENTITY_PID)"
echo ""

echo "7: Starting User Wallet..."
cd zeroid-wallet
npm run dev > /tmp/zeroid-wallet.log 2>&1 &
WALLET_PID=$!
cd ..
sleep 3

# Start PHP backend
echo "8: Starting PHP Backend (Wallet)..."
cd zeroid-wallet/backend
php -S localhost:8000 > /tmp/php-backend.log 2>&1 &
PHP_PID=$!
cd ../..
sleep 2
echo "PHP wallet backend running (PID: $PHP_PID)"
echo ""

echo "8b: Starting PHP Backend (Entity)..."
cd zeroid-entity/backend
php -S localhost:8001 > /tmp/php-entity-backend.log 2>&1 &
PHP_ENTITY_PID=$!
cd ../..
sleep 2
echo "PHP entity backend running (PID: $PHP_ENTITY_PID)"
echo ""

echo "8c: Starting PHP Backend (Bank1 API)..."
cd zeroid-entity/backend
php -S localhost:8002 > /tmp/php-bank1-backend.log 2>&1 &
PHP_BANK1_PID=$!
cd ../..
sleep 2
echo "PHP Bank1 API running on :8002 (PID: $PHP_BANK1_PID)"
echo ""

echo "8d: Starting PHP Backend (Bank2 API)..."
cd zeroid-entity/backend
php -S localhost:8004 > /tmp/php-bank2-backend.log 2>&1 &
PHP_BANK2_PID=$!
cd ../..
sleep 2
echo "PHP Bank2 API running on :8004 (PID: $PHP_BANK2_PID)"
echo ""

echo "9: Starting Third Party Viewer..."
cd zeroid-3P
npm run dev > /tmp/zeroid-3p.log 2>&1 &
THIRDPARTY_PID=$!
cd ..
sleep 3
echo "Third Party Viewer running (PID: $THIRDPARTY_PID)"
echo ""

echo "10: Starting Issuer Interface..."
cd zeroid-issuer
npm run dev > /tmp/zeroid-issuer.log 2>&1 &
ISSUER_PID=$!
cd ..
sleep 3
echo "Issuer interface running (PID: $ISSUER_PID)"
echo ""

echo "10b: Starting PHP Backend (Issuer)..."
cd zeroid-issuer/backend
php -S localhost:8003 > /tmp/php-issuer-backend.log 2>&1 &
PHP_ISSUER_PID=$!
cd ../..
sleep 2
echo "PHP issuer backend running on :8003 (PID: $PHP_ISSUER_PID)"
echo ""

echo "================================================"
echo "All services started successfully!"
echo "================================================"
echo ""
echo "Deployed Contracts:"
echo "  MyNFT Contract:         See nfts/frontend/src/contracts/contract-address.json"
echo "  KYC Compliance System:  PlonkVerifierAdapter, KYCCompliance"
echo "                          See zeroid-entity/src/contracts/kyc-deployment.json"
echo ""
echo "Access Points:"
echo "  Bank Interface:       http://localhost:5173"
echo "  User Wallet:          http://localhost:5174"
echo "  Third Party Viewer:   http://localhost:5175"
echo "  Issuer Portal:        http://localhost:5176"
echo "  Blockchain RPC:       http://127.0.0.1:8545"
echo "  PHP Backend (Wallet): http://localhost:8000"
echo "  PHP Backend (Entity): http://localhost:8001"
echo "  PHP Backend (Bank1):  http://localhost:8002"
echo "  PHP Backend (Bank2):  http://localhost:8004"
echo "  PHP Backend (Issuer): http://localhost:8003"
echo ""
echo "Logs:"
echo "  Hardhat:               tail -f /tmp/hardhat.log"
echo "  Bank:                  tail -f /tmp/zeroid-entity.log"
echo "  Wallet:                tail -f /tmp/zeroid-wallet.log"
echo "  Third Party:           tail -f /tmp/zeroid-3p.log"
echo "  Issuer:                tail -f /tmp/zeroid-issuer.log"
echo "  PHP Backend (Wallet):  tail -f /tmp/php-backend.log"
echo "  PHP Backend (Entity):  tail -f /tmp/php-entity-backend.log"
echo "  PHP Backend (Bank1):   tail -f /tmp/php-bank1-backend.log"
echo "  PHP Backend (Bank2):   tail -f /tmp/php-bank2-backend.log"
echo "  PHP Backend (Issuer):  tail -f /tmp/php-issuer-backend.log"
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
        echo "X PHP wallet backend stopped unexpectedly"
        cleanup
    fi

    if ! kill -0 $PHP_ENTITY_PID 2>/dev/null; then
        echo "X PHP entity backend stopped unexpectedly"
        cleanup
    fi
    
    if ! kill -0 $THIRDPARTY_PID 2>/dev/null; then
        echo "X Third Party Viewer stopped unexpectedly"
        cleanup
    fi

    if ! kill -0 $ISSUER_PID 2>/dev/null; then
        echo "X Issuer interface stopped unexpectedly"
        cleanup
    fi

    if ! kill -0 $PHP_ISSUER_PID 2>/dev/null; then
        echo "X PHP issuer backend stopped unexpectedly"
        cleanup
    fi
done
