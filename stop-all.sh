#!/bin/bash

# PDRAFUB - Stop All Services

echo "Stopping all PDRAFUB services..."

# Kill processes by port
echo "Stopping Hardhat node (port 8545)..."
lsof -ti:8545 | xargs -r kill -9 2>/dev/null || true

echo "Stopping Bank interface (port 5173)..."
lsof -ti:5173 | xargs -r kill -9 2>/dev/null || true

echo "Stopping User wallet (port 5174)..."
lsof -ti:5174 | xargs -r kill -9 2>/dev/null || true

echo "Stopping Third Party Viewer (port 5175)..."
lsof -ti:5175 | xargs -r kill -9 2>/dev/null || true

echo "Stopping PHP backend (port 8000)..."
lsof -ti:8000 | xargs -r kill -9 2>/dev/null || true

# Clean up log files
rm -f /tmp/hardhat.log /tmp/zeroid-entity.log /tmp/zeroid-wallet.log /tmp/zeroid-3p.log /tmp/php-backend.log

echo "All services stopped"
