# Bootstrap Node Setup for VerimutFS
# Run this on your public server to become a bootstrap node

Write-Host "🚀 Setting up VerimutFS Bootstrap Node..." -ForegroundColor Green

# Configuration
$env:ENABLE_VNS = "true"
$env:API_PORT = "3001"
$env:VERBOSE = "true"

# Optional: Connect to other bootstrap nodes
# $env:HTTP_BOOTSTRAP_PEERS = "http://other-bootstrap:3001"

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
