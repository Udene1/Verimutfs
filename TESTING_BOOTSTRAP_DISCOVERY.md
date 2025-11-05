# Testing Bootstrap Discovery System

This guide shows how to verify the bootstrap discovery system works correctly.

## Quick Automated Test

Run the test suite:

```bash
# Build the project first
npm run build

# Run bootstrap discovery tests
node test-bootstrap-discovery.js
```

**Expected output:**
```
🧪 Bootstrap Discovery Test Suite
══════════════════════════════════════════════════

✓ Should parse 2 static peers
✓ Should enable VNS discovery for .vns name
✓ Should discover 3 bootstraps
...
📊 Test Results: 11/11 passed
✓ All tests passed! ✨
```

## Manual Integration Test (3-Node Network)

### Terminal 1: Genesis Bootstrap Node

```bash
# Start genesis node (first bootstrap)
export ENABLE_VNS=true
export BOOTSTRAP_PUBLIC_URL="http://localhost:3001"
export API_PORT=3001
npm start
```

**Watch for:**
```
[VNS] Verimut Name Service enabled and initialized
[VerimutSync] HTTP P2P initialized with 0 bootstrap peer(s)
```

Genesis starts with no bootstrap peers (it IS the bootstrap).

### Terminal 2: Secondary Bootstrap Node

```bash
# Start second bootstrap (discovers genesis)
export ENABLE_VNS=true
export BOOTSTRAP_PUBLIC_URL="http://localhost:3002"
export HTTP_BOOTSTRAP_PEERS="http://localhost:3001"  # Use genesis as seed
export API_PORT=3002
export LISTEN_PORT=4002
npm start
```

**Watch for:**
```
[BootstrapDiscovery] Initializing bootstrap discovery...
[BootstrapDiscovery] Discovery complete: 0 unique bootstrap peer(s) found
[VerimutSync] HTTP P2P initialized with 1 bootstrap peer(s)
[BootstrapDiscovery] Registering as bootstrap: bootstrap.vns → http://localhost:3002
```

After ~3 seconds, Node 2 should register itself.

### Terminal 3: Friend Node (Auto-Discovery)

```bash
# Friend discovers both bootstraps via bootstrap.vns
export ENABLE_VNS=true
export HTTP_BOOTSTRAP_PEERS="bootstrap.vns"
export API_PORT=3003
export LISTEN_PORT=4003
npm start
```

**Watch for:**
```
[BootstrapDiscovery] VNS discovery enabled for: bootstrap.vns
[BootstrapDiscovery] Querying 1 seed bootstrap(s)...
[BootstrapDiscovery] ✓ Discovered N bootstrap(s) from http://seed.verimut.com:3001
[VerimutSync] HTTP P2P initialized with N bootstrap peer(s)
```

### Verification Steps

#### 1. Check Bootstrap Registration

**Query Node 1 (genesis):**
```bash
curl http://localhost:3001/api/vns/resolve/bootstrap.vns | jq
```

**Expected:**
```json
{
  "entry": {
    "name": "bootstrap.vns",
    "value": {
      "endpoint": "http://localhost:3002",
      "type": "bootstrap",
      "timestamp": 1730851200000
    }
  }
}
```

#### 2. Verify VNS Sync

**Register a test name on Node 1:**
```bash
curl -X POST http://localhost:3001/api/vns/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "testuser.vfs",
    "value": "test-value-12345"
  }'
```

**Check if it synced to Node 3:**
```bash
curl http://localhost:3003/api/vns/resolve/testuser.vfs | jq
```

**Expected:** Should return the same entry (proves sync works).

#### 3. Check Merkle Root Consistency

```bash
# All nodes should have same merkle root
curl http://localhost:3001/api/vns/status | jq .merkleRoot
curl http://localhost:3002/api/vns/status | jq .merkleRoot
curl http://localhost:3003/api/vns/status | jq .merkleRoot
```

**Expected:** All three should return identical merkle roots.

#### 4. Watch Bootstrap Discovery Logs

In Node 3 logs, you should see:
```
[BootstrapDiscovery] Discovering bootstrap peers via VNS name: bootstrap.vns
[BootstrapDiscovery] Querying http://seed.verimut.com:3001...
[BootstrapDiscovery] ✓ Discovered 2 bootstrap(s) from http://seed.verimut.com:3001
[BootstrapDiscovery] Discovery complete: 2 unique bootstrap peer(s) found
[HTTPP2P] Initialized with 2 bootstrap peer(s)
```

## Docker Test (Full E2E)

Test with Docker Compose to simulate real network:

```bash
# Clean slate
docker compose down -v

# Update docker-compose.yml to use bootstrap.vns
# Node 1: BOOTSTRAP_PUBLIC_URL=http://node1:3001
# Node 2: BOOTSTRAP_PUBLIC_URL=http://node2:3001, HTTP_BOOTSTRAP_PEERS=http://node1:3001
# Node 3: HTTP_BOOTSTRAP_PEERS=bootstrap.vns

# Build and run
docker compose up --build
```

**Watch for:**
- Node 1: Registers as bootstrap.vns
- Node 2: Connects to Node 1, also registers as bootstrap.vns
- Node 3: Discovers both via bootstrap.vns, connects to both

**Verify:**
```bash
# Check VNS entries synced across all nodes
docker exec verimutfs-node1-1 curl http://localhost:3001/api/vns/status
docker exec verimutfs-node2-1 curl http://localhost:3001/api/vns/status
docker exec verimutfs-node3-1 curl http://localhost:3001/api/vns/status
```

## Troubleshooting

### Issue: "Discovery complete: 0 unique bootstrap peer(s) found"

**Cause:** Seed bootstrap not responding or bootstrap.vns not registered yet.

**Fix:**
1. Check seed bootstrap is running: `curl http://seed.verimut.com:3001/api/vns/status`
2. Verify bootstrap registered: `curl http://seed.verimut.com:3001/api/vns/resolve/bootstrap.vns`
3. Wait 3-5 seconds after genesis starts (registration is delayed)

### Issue: "Failed to query seed: 404"

**Cause:** bootstrap.vns name doesn't exist in VNS yet.

**Fix:**
- Genesis bootstrap needs to register first
- Check `BOOTSTRAP_PUBLIC_URL` is set on genesis node
- Increase registration delay (currently 3s) if network is slow

### Issue: Nodes connect but don't sync

**Cause:** HTTP P2P not initialized or bootstrap peers incorrect.

**Debug:**
```bash
# Check bootstrap peer list
grep "HTTP P2P initialized with" node.log

# Check if deltas are being pushed
grep "HTTPP2P.*Pushing delta" node.log

# Check VNS status
curl http://localhost:3001/api/vns/status | jq
```

### Issue: "Seed bootstrap timeout"

**Cause:** Network latency or seed bootstrap overloaded.

**Fix:**
- Increase timeout in bootstrap-discovery.ts (currently 5s)
- Use multiple seed bootstraps for redundancy
- Check firewall/network connectivity

## Success Indicators

✅ **Bootstrap Discovery Working:**
- Logs show "Discovery complete: N unique bootstrap peer(s) found" (N > 0)
- Nodes connect to multiple bootstraps automatically
- No manual URL sharing needed

✅ **VNS Sync Working:**
- Merkle roots match across all nodes
- Entries registered on one node appear on others
- HTTP P2P push logs show successful pushes

✅ **Self-Registration Working:**
- Genesis node registers as bootstrap.vns
- Query returns valid bootstrap endpoint
- Secondary bootstraps also register successfully

## Performance Benchmarks

**Expected Timings:**
- Bootstrap discovery: < 5 seconds
- VNS registration: < 1 second
- Delta propagation: < 2 seconds
- Merkle root convergence: < 5 seconds

**Acceptable Network:**
- 100% VNS sync success rate
- < 1% HTTP P2P push failures
- All nodes reach consensus within 10 seconds

## CI/CD Integration

Add to package.json scripts:
```json
{
  "scripts": {
    "test:bootstrap": "npm run build && node test-bootstrap-discovery.js",
    "test:e2e": "docker compose down -v && docker compose up --build --abort-on-container-exit"
  }
}
```

Run in CI:
```bash
npm run test:bootstrap && npm run test:e2e
```
