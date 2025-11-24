@echo off
REM Bootstrap Node Startup Script for Windows
REM Starts a VerimutFS bootstrap node with auto-registration

echo Starting VerimutFS Bootstrap Node
echo ====================================

REM Configuration
set NODE_ENV=production
set API_PORT=3001
set ENABLE_VNS=true
set VFS_NAME=bootstrap-node-1
set BOOTSTRAP_PUBLIC_URL=http://localhost:3001
set VERBOSE=true

REM Blockchain configuration
set RPC_URL=https://sepolia.base.org
set GASLESS_PAYMENT_CONTRACT=0xA29FC36cB931E5FAd3e825BaF0a3be176eAeA683
set USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

echo.
echo Configuration:
echo   API Port: %API_PORT%
echo   VFS Name: %VFS_NAME%
echo   Public URL: %BOOTSTRAP_PUBLIC_URL%
echo.

REM Build if needed
if not exist "dist" (
    echo Building VerimutFS...
    call npm run build
)

REM Start bootstrap node
echo Starting bootstrap node...
node dist/cli.js --enable-vns --api-port 3001 --verbose

echo.
echo Bootstrap node stopped
pause
