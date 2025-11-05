# Bootstrap Node Setup for VerimutFS
# Run this on your public server to become a bootstrap node

Write-Host "🚀 Setting up VerimutFS Bootstrap Node..." -ForegroundColor Green

# Configuration
$env:ENABLE_VNS = "true"
$env:API_PORT = "3001"
$env:VERBOSE = "true"

# ⚠️ IMPORTANT: Connect to other bootstrap nodes to form unified network!
# If you have multiple bootstrap nodes, list them here:
# $env:HTTP_BOOTSTRAP_PEERS = "http://bootstrap2:3001,http://bootstrap3:3001"
# Without this, your bootstrap forms an isolated network!

# Get public IP
try {
    $PUBLIC_IP = (Invoke-WebRequest -Uri "https://api.ipify.org" -UseBasicParsing).Content
    Write-Host "📍 Your public IP: $PUBLIC_IP" -ForegroundColor Cyan
    Write-Host "🌐 Your bootstrap URL: http://${PUBLIC_IP}:3001" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Could not detect public IP. Check manually." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "⚠️  Make sure port 3001 is open in your firewall!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Share this URL with friends:" -ForegroundColor Green
Write-Host "`$env:HTTP_BOOTSTRAP_PEERS=`"http://${PUBLIC_IP}:3001`"" -ForegroundColor White
Write-Host ""

# Start node
npm start
