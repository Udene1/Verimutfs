#!/bin/bash
# Genesis Bootstrap Node Setup
# This script helps you deploy the first bootstrap node (genesis) for the Verimut network

echo "🚀 Verimut Genesis Bootstrap Node Setup"
echo "========================================"
echo ""

# Detect public IP
echo "📡 Detecting your public IP address..."
PUBLIC_IP=$(curl -s https://api.ipify.org)
if [ -z "$PUBLIC_IP" ]; then
    PUBLIC_IP=$(curl -s https://ifconfig.me)
fi

if [ -z "$PUBLIC_IP" ]; then
    echo "⚠️  Could not auto-detect public IP"
    read -p "Enter your public IP or domain: " PUBLIC_IP
fi

echo "✅ Public IP/Domain: $PUBLIC_IP"
echo ""

# Port configuration
API_PORT="${API_PORT:-3001}"
echo "📍 API Port: $API_PORT"
echo ""

# Build public URL
PUBLIC_URL="http://${PUBLIC_IP}:${API_PORT}"
echo "🌐 Your bootstrap URL will be: $PUBLIC_URL"
echo ""

# Check if this is truly genesis (no other bootstraps to connect to)
echo "❓ Is this the FIRST bootstrap node (genesis)?"
echo "   - Yes: This is the first node starting the network"
echo "   - No: There are other bootstrap nodes you want to connect to"
read -p "Is this genesis? (y/n): " IS_GENESIS

if [[ "$IS_GENESIS" =~ ^[Yy]$ ]]; then
    echo ""
    echo "✅ Starting as GENESIS bootstrap node"
    echo "   - No other bootstraps to connect to"
    echo "   - Will self-register as bootstrap.vns"
    echo "   - Other nodes can discover you via bootstrap.vns"
    echo ""
    
    export ENABLE_VNS=true
    export BOOTSTRAP_PUBLIC_URL="$PUBLIC_URL"
    export HTTP_BOOTSTRAP_PEERS=""  # Empty for genesis
    export API_PORT="$API_PORT"
else
    echo ""
    echo "🔗 This is a SECONDARY bootstrap node"
    echo "   You need to connect to existing bootstraps"
    echo ""
    echo "Choose discovery method:"
    echo "  1) Auto-discover via bootstrap.vns (recommended)"
    echo "  2) Manually specify bootstrap URLs"
    read -p "Enter choice (1 or 2): " DISCOVERY_METHOD
    
    if [ "$DISCOVERY_METHOD" == "1" ]; then
        echo ""
        echo "✅ Using VNS auto-discovery"
        export HTTP_BOOTSTRAP_PEERS="bootstrap.vns"
    else
        echo ""
        echo "Enter bootstrap peer URLs (comma-separated):"
        echo "Example: http://1.2.3.4:3001,http://5.6.7.8:3001"
        read -p "Bootstrap URLs: " BOOTSTRAP_URLS
        export HTTP_BOOTSTRAP_PEERS="$BOOTSTRAP_URLS"
    fi
    
    export ENABLE_VNS=true
    export BOOTSTRAP_PUBLIC_URL="$PUBLIC_URL"
    export API_PORT="$API_PORT"
    
    echo ""
    echo "✅ Configuration:"
    echo "   - Will connect to: $HTTP_BOOTSTRAP_PEERS"
    echo "   - Will register as: bootstrap.vns"
    echo "   - Will be discoverable at: $PUBLIC_URL"
fi

echo ""
echo "🔐 Important Security Notes:"
echo "   1. Ensure port $API_PORT is open in your firewall"
echo "   2. Consider using HTTPS in production (not HTTP)"
echo "   3. This bootstrap URL will be shared with all network participants"
echo ""

read -p "Press Enter to start the node, or Ctrl+C to cancel..."
echo ""

# Start the node
echo "🚀 Starting Verimut Bootstrap Node..."
echo ""
npm start
