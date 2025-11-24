# Genesis Bootstrap Node Setup (PowerShell)
# This script helps you deploy the first bootstrap node (genesis) for the Verimut network

Write-Host "Verimut Genesis Bootstrap Node Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Detect public IP
Write-Host "Detecting your public IP address..." -ForegroundColor Yellow
try {
    $PUBLIC_IP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
} catch {
    try {
        $PUBLIC_IP = (Invoke-WebRequest -Uri "https://ifconfig.me" -UseBasicParsing).Content
    } catch {
        $PUBLIC_IP = ""
    }
}

if (-not $PUBLIC_IP) {
    Write-Host "WARNING: Could not auto-detect public IP" -ForegroundColor Yellow
    $PUBLIC_IP = Read-Host "Enter your public IP or domain"
}

Write-Host "Public IP/Domain: $PUBLIC_IP" -ForegroundColor Green
Write-Host ""

# Port configuration
$API_PORT = if ($env:API_PORT) { $env:API_PORT } else { "3001" }
Write-Host "API Port: $API_PORT" -ForegroundColor Cyan
Write-Host ""

# Build public URL
$PUBLIC_URL = "http://${PUBLIC_IP}:${API_PORT}"
Write-Host "Your bootstrap URL will be: $PUBLIC_URL" -ForegroundColor Cyan
Write-Host ""

# Check if this is truly genesis
Write-Host "Is this the FIRST bootstrap node (genesis)?" -ForegroundColor Yellow
Write-Host "   - Yes: This is the first node starting the network"
Write-Host "   - No: There are other bootstrap nodes you want to connect to"
$IS_GENESIS = Read-Host "Is this genesis? (y/n)"

if ($IS_GENESIS -match "^[Yy]") {
    Write-Host ""
    Write-Host "Starting as GENESIS bootstrap node" -ForegroundColor Green
    Write-Host "   - No other bootstraps to connect to"
    Write-Host "   - Will self-register as bootstrap.vns"
    Write-Host "   - Other nodes can discover you via bootstrap.vns"
    Write-Host ""
    
    $env:ENABLE_VNS = "true"
    $env:BOOTSTRAP_PUBLIC_URL = $PUBLIC_URL
    $env:HTTP_BOOTSTRAP_PEERS = ""  # Empty for genesis
    $env:API_PORT = $API_PORT
} else {
    Write-Host ""
    Write-Host "This is a SECONDARY bootstrap node" -ForegroundColor Cyan
    Write-Host "   You need to connect to existing bootstraps"
    Write-Host ""
    Write-Host "Choose discovery method:"
    Write-Host "  1) Auto-discover via bootstrap.vns (recommended)"
    Write-Host "  2) Manually specify bootstrap URLs"
    $DISCOVERY_METHOD = Read-Host "Enter choice (1 or 2)"
    
    if ($DISCOVERY_METHOD -eq "1") {
        Write-Host ""
        Write-Host "Using VNS auto-discovery" -ForegroundColor Green
        $env:HTTP_BOOTSTRAP_PEERS = "bootstrap.vns"
    } else {
        Write-Host ""
        Write-Host "Enter bootstrap peer URLs (comma-separated):"
        Write-Host "Example: http://1.2.3.4:3001,http://5.6.7.8:3001"
        $BOOTSTRAP_URLS = Read-Host "Bootstrap URLs"
        $env:HTTP_BOOTSTRAP_PEERS = $BOOTSTRAP_URLS
    }
    
    $env:ENABLE_VNS = "true"
    $env:BOOTSTRAP_PUBLIC_URL = $PUBLIC_URL
    $env:API_PORT = $API_PORT
    
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Green
    Write-Host "   - Will connect to: $($env:HTTP_BOOTSTRAP_PEERS)"
    Write-Host "   - Will register as: bootstrap.vns"
    Write-Host "   - Will be discoverable at: $PUBLIC_URL"
}

Write-Host ""
Write-Host "Important Security Notes:" -ForegroundColor Yellow
Write-Host "   1. Ensure port $API_PORT is open in your firewall"
Write-Host "   2. Consider using HTTPS in production (not HTTP)"
Write-Host "   3. This bootstrap URL will be shared with all network participants"
Write-Host ""

Read-Host "Press Enter to start the node, or Ctrl+C to cancel"
Write-Host ""

# Start the node
Write-Host "Starting Verimut Bootstrap Node..." -ForegroundColor Cyan
Write-Host ""
npm start
