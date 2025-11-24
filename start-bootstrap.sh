#!/bin/bash

# Bootstrap Node Startup Script
# Starts a VerimutFS bootstrap node with auto-registration

echo "🚀 Starting VerimutFS Bootstrap Node"
echo "===================================="

# Configuration
export NODE_ENV=production
export API_PORT=3001
export ENABLE_VNS=true
export VFS_NAME=bootstrap-node-1
export BOOTSTRAP_PUBLIC_URL=http://localhost:3001
export VERBOSE=true

# Blockchain configuration
export RPC_URL=https://sepolia.base.org
export GASLESS_PAYMENT_CONTRACT=0xA29FC36cB931E5FAd3e825BaF0a3be176eAeA683
export USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

echo ""
echo "Configuration:"
echo "  API Port: $API_PORT"
echo "  VFS Name: $VFS_NAME"
echo "  Public URL: $BOOTSTRAP_PUBLIC_URL"
echo ""

# Build if needed
if [ ! -d "dist" ]; then
    echo "Building VerimutFS..."
    npm run build
fi

# Start bootstrap node
echo "Starting bootstrap node..."
node dist/cli.js --enable-vns --api-port 3001 --verbose

echo ""
echo "Bootstrap node stopped"
