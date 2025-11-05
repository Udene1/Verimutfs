#!/bin/bash
# Bootstrap Node Setup Script for VerimutFS
# Run this on your public server to become a bootstrap node

echo "🚀 Setting up VerimutFS Bootstrap Node..."

# Configuration
export ENABLE_VNS=true
export API_PORT=3001
export VERBOSE=true

# Optional: Connect to other bootstrap nodes
# export HTTP_BOOTSTRAP_PEERS="http://other-bootstrap:3001"

# Get public IP
PUBLIC_IP=$(curl -s https://api.ipify.org)
echo "📍 Your public IP: $PUBLIC_IP"
echo "🌐 Your bootstrap URL: http://$PUBLIC_IP:3001"
echo ""
echo "⚠️  Make sure port 3001 is open in your firewall!"
echo ""
echo "Share this URL with friends:"
echo "HTTP_BOOTSTRAP_PEERS=\"http://$PUBLIC_IP:3001\""
echo ""

# Start node
npm start
