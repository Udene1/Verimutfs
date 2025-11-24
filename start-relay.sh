#!/bin/bash

# VerimutFS Relay Node Startup Script
# Starts a relay node with auto-registration

set -e

echo "🚀 Starting VerimutFS Relay Node"
echo "================================="
echo ""

# Get public IP
if [ -z "$PUBLIC_IP" ]; then
  # Try to detect public IP
  PUBLIC_IP=$(curl -s http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip -H "Metadata-Flavor: Google" 2>/dev/null || \
              curl -s https://api.ipify.org 2>/dev/null || \
              echo "localhost")
fi

echo "📍 Public IP: $PUBLIC_IP"
echo "🌐 Relay URL: http://$PUBLIC_IP:3001"
echo ""

# Set environment variables
export NODE_ENV=production
export API_PORT=3001
export ENABLE_VNS=true
export VFS_NAME=${VFS_NAME:-relay-node-1}
export BOOTSTRAP_PUBLIC_URL=http://$PUBLIC_IP:3001
export VERBOSE=true

# Blockchain configuration
export RPC_URL=${RPC_URL:-https://sepolia.base.org}
export GASLESS_PAYMENT_CONTRACT=${GASLESS_PAYMENT_CONTRACT:-0xA29FC36cB931E5FAd3e825BaF0a3be176eAeA683}
export USDC_ADDRESS=${USDC_ADDRESS:-0x036CbD53842c5426634e7929541eC2318f3dCF7e}

echo "⚙️  Configuration:"
echo "   VFS Name: $VFS_NAME"
echo "   API Port: $API_PORT"
echo "   Public URL: $BOOTSTRAP_PUBLIC_URL"
echo ""

# Check if built
if [ ! -d "dist" ]; then
  echo "📦 Building project..."
  npm run build
fi

echo "🚀 Starting relay node..."
echo ""
echo "Share this URL with peers:"
echo "HTTP_BOOTSTRAP_PEERS=\"http://$PUBLIC_IP:3001\""
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start node
npm start -- --enable-vns --api-port 3001 --verbose
