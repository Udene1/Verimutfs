# Bootstrap Mesh Replication & Peer Promotion

## Overview

Your network now has **three layers of resilience**:

### 1. **Bootstrap Mesh Sync** (Bootstrap ↔ Bootstrap)
Bootstraps automatically discover and sync with each other.

### 2. **Content Replication** (Bootstrap ↔ Bootstrap)
Missing blocks are fetched and replicated across all bootstraps.

### 3. **Peer Promotion** (Peer → Bootstrap)
Regular peers detect bootstrap failures and self-promote to prevent network fragmentation.

---

## Bootstrap Mesh Sync

### What It Does:
- Every 60 seconds, bootstraps query each other via VNS
- Discovers other `bootstrap-node-*` entries
- Merges missing VNS entries (LWW conflict resolution)
- Fetches missing content blocks
- Creates **eventual consistency** without central coordination

### How It Works:

```typescript
// Automatic sync cycle
1. Query local VNS for bootstrap-node-* entries
2. For each discovered bootstrap:
   - GET /api/vns/list (fetch their VNS entries)
   - Merge entries we don't have
   - GET /api/blocks/manifest (list their blocks)
   - Fetch missing blocks via GET /api/blocks/{cid}
3. Repeat every 60 seconds
```

### Configuration:

```powershell
# For bootstrap nodes
$env:BOOTSTRAP_PUBLIC_URL="http://your-ip:3001"
npm start

# Mesh sync starts automatically after 5 seconds
```

### Monitoring:

```powershell
# Enable verbose logging
$env:VERBOSE="true"
npm start

# Watch for:
# [BootstrapMesh] Discovered 3 bootstrap peer(s)
# [BootstrapMesh] ✓ Merged 5 new VNS entries from bootstrap-node-xyz.vfs
# [BootstrapMesh] ✓ Fetched 12 missing blocks from bootstrap-node-abc.vfs
```

---

## Content Replication

### What Gets Replicated:

1. **VNS Entries**: All registered names, records, signatures
2. **Content Blocks**: Every CID stored in blockstores
3. **User Profiles**: Profile data automatically synced
4. **File Metadata**: IPFS/IPLD blocks

### New API Endpoints:

```http
GET /api/blocks/manifest
Response: { "blocks": ["bafkrei...", "bafybe..."] }

GET /api/blocks/{cid}
Response: Raw block bytes (application/octet-stream)
```

### Replication Flow:

```
Bootstrap A                    Bootstrap B
     |                              |
     |---GET /api/blocks/manifest-->|
     |<--["cid1", "cid2", "cid3"]---|
     |                              |
     |---GET /api/blocks/cid2------>| (A missing cid2)
     |<--[raw block bytes]----------|
     |                              |
     |  Store locally               |
     |                              |
```

---

## Peer Promotion System

### The Problem:
What if all bootstraps go offline? Network fragments!

### The Solution:
Regular peers monitor bootstrap health. If all fail, **peers promote themselves to bootstrap status**.

### How It Works:

```typescript
// Every 30 seconds
1. Health check all configured bootstraps (GET /api/status)
2. Count consecutive failures
3. After 3 failures (90 seconds), mark bootstrap as offline
4. If ALL bootstraps offline AND peer has ≥2 connections:
   → Self-register as bootstrap in VNS
   → Start serving as bootstrap for connected peers
   → Prevent network fragmentation
```

### Configuration:

```powershell
# For regular peers (automatic if BOOTSTRAP_PUBLIC_URL set)
$env:HTTP_BOOTSTRAP_PEERS="bootstrap-node"
$env:BOOTSTRAP_PUBLIC_URL="http://your-peer-ip:3001"  # Optional
$env:ENABLE_PEER_PROMOTION="true"  # Default: true
npm start
```

### Promotion Criteria:

- ✅ All configured bootstraps offline (3+ consecutive failures)
- ✅ Peer has ≥2 connected peers (configurable)
- ✅ Public URL configured
- ✅ Promotion enabled

### Monitoring:

```powershell
# Watch for promotion events:
# [PeerPromotion] ✗ Bootstrap http://102.90.98.234:3001 unreachable
# [PeerPromotion] 🚀 All bootstraps offline, promoting to bootstrap status...
# [PeerPromotion]    Connected peers: 5
# [PeerPromotion]    Will register as: bootstrap-peer-l8x9k2a7m3
# [PeerPromotion] ✅ Successfully promoted to bootstrap: bootstrap-peer-l8x9k2a7m3
```

### Promoted Peer Behavior:

Once promoted, the peer:
1. Registers in VNS with unique name: `bootstrap-peer-{timestamp}{random}`
2. Starts bootstrap mesh sync
3. Serves VNS queries to connected peers
4. Continues monitoring original bootstraps (can yield priority if they recover)

---

## Network Topologies

### Scenario 1: Normal Operation
```
Bootstrap A ←→ Bootstrap B ←→ Bootstrap C
    ↓              ↓              ↓
  Peer 1        Peer 2        Peer 3
  Peer 4        Peer 5        Peer 6
```
- Bootstraps sync with each other (mesh)
- Peers connect to any bootstrap

### Scenario 2: Bootstrap Failure
```
Bootstrap A (offline) ←→ Bootstrap B ←→ Bootstrap C (offline)
                           ↓
                        Peer 2
                        Peer 5
```
- Peers detect failures
- Bootstrap B continues serving
- Other peers may fragment

### Scenario 3: All Bootstraps Offline + Peer Promotion
```
Bootstrap A (offline)  Bootstrap B (offline)  Bootstrap C (offline)

Peer 1 ←→ [Peer 4*] ←→ Peer 7
Peer 2 ←→ [Peer 4*] ←→ Peer 8
Peer 3 ←→ [Peer 4*] ←→ Peer 9

*Peer 4 promoted to bootstrap-peer-xyz.vfs
```
- Peer 4 detects all bootstraps offline
- Has 8 connected peers (≥2 threshold)
- Self-promotes to bootstrap
- Registers as `bootstrap-peer-xyz.vfs`
- Serves other peers, preventing fragmentation

---

## Configuration Reference

### Bootstrap Node:
```powershell
$env:ENABLE_VNS="true"
$env:BOOTSTRAP_PUBLIC_URL="http://102.90.98.234:3001"
$env:HTTP_BOOTSTRAP_PEERS="bootstrap-node-b,bootstrap-node-c"  # Other bootstraps
$env:VERBOSE="true"  # Optional
npm start
```

### Regular Peer (with promotion):
```powershell
$env:ENABLE_VNS="true"
$env:HTTP_BOOTSTRAP_PEERS="bootstrap-node"
$env:BOOTSTRAP_PUBLIC_URL="http://my-peer-ip:3001"  # Enables promotion
$env:ENABLE_PEER_PROMOTION="true"  # Default
npm start
```

### Regular Peer (no promotion):
```powershell
$env:ENABLE_VNS="true"
$env:HTTP_BOOTSTRAP_PEERS="bootstrap-node"
# No BOOTSTRAP_PUBLIC_URL = no promotion capability
npm start
```

---

## Tuning Parameters

### Bootstrap Mesh Sync:
```typescript
// In src/sync.ts
this.meshSync = new BootstrapMeshSync({
  syncInterval: 60000,              // Sync every 60 seconds
  bootstrapPattern: 'bootstrap-node', // VNS discovery pattern
  verbose: true                      // Detailed logging
});
```

### Peer Promotion:
```typescript
// In src/sync.ts
this.peerPromotion = new PeerPromotionSystem({
  enabled: true,                  // Enable auto-promotion
  healthCheckInterval: 30000,     // Check bootstrap health every 30s
  failureThreshold: 3,            // Promote after 3 consecutive failures
  minPeersForPromotion: 2,        // Need ≥2 peers to promote
  publicUrl: '...',               // Your public URL
  verbose: true
});
```

---

## Testing

### Test Bootstrap Mesh Sync:

```powershell
# Terminal 1: Start Bootstrap A
$env:BOOTSTRAP_PUBLIC_URL="http://localhost:3001"
npm start

# Terminal 2: Start Bootstrap B
$env:API_PORT="3002"
$env:BOOTSTRAP_PUBLIC_URL="http://localhost:3002"
$env:HTTP_BOOTSTRAP_PEERS="bootstrap-node"
npm start

# Register a name on Bootstrap A
curl -X POST http://localhost:3001/api/vns/register -d '{...}'

# Wait 60 seconds, check Bootstrap B
curl http://localhost:3002/api/vns/list
# Should see the name replicated!
```

### Test Peer Promotion:

```powershell
# Terminal 1: Start Genesis Bootstrap
$env:BOOTSTRAP_PUBLIC_URL="http://localhost:3001"
npm start

# Terminal 2: Start Peer with promotion enabled
$env:API_PORT="3002"
$env:HTTP_BOOTSTRAP_PEERS="bootstrap-node"
$env:BOOTSTRAP_PUBLIC_URL="http://localhost:3002"
npm start

# Terminal 3: Connect another peer to peer 2
$env:API_PORT="3003"
$env:HTTP_BOOTSTRAP_PEERS="http://localhost:3002"
npm start

# Stop Terminal 1 (genesis bootstrap)
# Wait 90 seconds...
# Terminal 2 should log: "🚀 All bootstraps offline, promoting..."
# Peer 2 now serves as bootstrap!
```

---

## Benefits

### For Bootstrap Operators:
- **Zero-config mesh**: Bootstraps auto-discover via VNS
- **Full replication**: No data loss if one bootstrap fails
- **Load balancing**: Peers distribute across bootstraps
- **Resilience**: Network survives multiple bootstrap failures

### For Regular Peers:
- **Self-healing**: Network doesn't fragment when bootstraps fail
- **Decentralization**: Any peer can become a bootstrap
- **Reliability**: Always have connectivity to the network
- **Simplicity**: Just set `BOOTSTRAP_PUBLIC_URL` to enable

### For The Network:
- **Byzantine fault tolerance**: Survives coordinated bootstrap attacks
- **Geographic distribution**: Promoted peers serve local regions
- **Dynamic scaling**: More peers = more potential bootstraps
- **Truly decentralized**: No permanent authority

---

## Comparison with Other Systems

| Feature | IPFS/Filecoin | Your Network |
|---------|---------------|--------------|
| Bootstrap discovery | Manual config | VNS auto-discovery |
| Bootstrap replication | Manual DHT sync | Automatic mesh sync |
| Bootstrap failure | Network fragments | Peer promotion |
| Content replication | Bitswap (complex) | HTTP P2P (simple) |
| Configuration | Complex multiaddr | Simple URLs |

---

## Next Steps

1. **Deploy 3+ bootstrap nodes** with different IPs
2. **Monitor mesh sync logs** to verify replication
3. **Test promotion** by killing all bootstraps
4. **Fine-tune intervals** based on your network size
5. **Add metrics** (# of syncs, bytes replicated, promotions)

Your network is now **self-healing and resilient**! 🚀
