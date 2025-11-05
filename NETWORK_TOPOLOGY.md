# Network Topology Guide for VerimutFS

## Understanding Bootstrap Peers and Network Sync

### Key Concept: HTTP P2P Push Model

VerimutFS uses **HTTP P2P** for VNS delta propagation. When a node registers a name:
1. It pushes the delta to all nodes in its `HTTP_BOOTSTRAP_PEERS` list
2. Each receiving node processes and stores the delta
3. The network is only as connected as the bootstrap peer configuration

### ❌ Common Mistake: Isolated Bootstrap Groups

**Problem:** If bootstraps don't connect to each other, you get isolated networks.

```
Bootstrap A              Bootstrap B
    ↓                        ↓
  Friend 1               Friend 3
  Friend 2               Friend 4
  
❌ Friend 1 and Friend 3 CANNOT sync!
```

**Why?** Friend 1 only pushes to Bootstrap A. Bootstrap A doesn't know about Bootstrap B. The delta never reaches Friend 3.

### ✅ Solution 1: Bootstrap Mesh Network

**Connect all bootstraps to each other:**

```bash
# Bootstrap Node A (IP: 10.0.0.1)
export HTTP_BOOTSTRAP_PEERS="http://10.0.0.2:3001,http://10.0.0.3:3001"
npm start

# Bootstrap Node B (IP: 10.0.0.2)
export HTTP_BOOTSTRAP_PEERS="http://10.0.0.1:3001,http://10.0.0.3:3001"
npm start

# Bootstrap Node C (IP: 10.0.0.3)
export HTTP_BOOTSTRAP_PEERS="http://10.0.0.1:3001,http://10.0.0.2:3001"
npm start
```

**Network topology:**
```
Bootstrap A ←→ Bootstrap B ←→ Bootstrap C
    ↓              ↓              ↓
Friend 1      Friend 3      Friend 5
Friend 2      Friend 4      Friend 6

✅ ALL nodes sync via bootstrap mesh
```

**How sync works:**
1. Friend 1 registers `myname.vfs` → pushes to Bootstrap A
2. Bootstrap A receives delta, stores it
3. Bootstrap A's VerimutSync triggers → pushes to Bootstrap B and C
4. Bootstrap B and C receive delta, store it
5. Friends 3-6 can now query and get `myname.vfs`

### ✅ Solution 2: Full Mesh (Recommended)

**Give every friend the complete bootstrap list:**

```bash
# All friends use the same bootstrap list:
export HTTP_BOOTSTRAP_PEERS="http://bootstrap-a:3001,http://bootstrap-b:3001,http://bootstrap-c:3001"
npm start
```

**Benefits:**
- ✅ Maximum redundancy (if one bootstrap dies, others work)
- ✅ Faster propagation (parallel pushes to all bootstraps)
- ✅ Simpler configuration (everyone uses same list)
- ✅ More resilient network

**Network topology:**
```
        Bootstrap A ←→ Bootstrap B ←→ Bootstrap C
        ↓ ↑ ↓         ↓ ↑ ↓          ↓ ↑ ↓
      Friend 1      Friend 2       Friend 3
      
Every node connects to every bootstrap
Every bootstrap connects to each other
= Fully connected mesh network
```

## Configuration Examples

### Example 1: Single Bootstrap (Development/Testing)

```bash
# Bootstrap node:
export ENABLE_VNS=true
npm start

# All friends:
export HTTP_BOOTSTRAP_PEERS="http://bootstrap:3001"
npm start
```

**Pros:** Simple setup  
**Cons:** Single point of failure

### Example 2: Multi-Bootstrap with Mesh (Production)

```bash
# Bootstrap A (bootstrap-a.verimut.com):
export HTTP_BOOTSTRAP_PEERS="http://bootstrap-b.verimut.com:3001,http://bootstrap-c.verimut.com:3001"
npm start

# Bootstrap B (bootstrap-b.verimut.com):
export HTTP_BOOTSTRAP_PEERS="http://bootstrap-a.verimut.com:3001,http://bootstrap-c.verimut.com:3001"
npm start

# Bootstrap C (bootstrap-c.verimut.com):
export HTTP_BOOTSTRAP_PEERS="http://bootstrap-a.verimut.com:3001,http://bootstrap-b.verimut.com:3001"
npm start

# All friends:
export HTTP_BOOTSTRAP_PEERS="http://bootstrap-a.verimut.com:3001,http://bootstrap-b.verimut.com:3001,http://bootstrap-c.verimut.com:3001"
npm start
```

**Pros:** Maximum resilience and redundancy  
**Cons:** More complex setup

### Example 3: Peer-to-Peer (No Central Bootstrap)

```bash
# Friend A (first node, no bootstrap):
export HTTP_BOOTSTRAP_PEERS=""
npm start
# Share: http://friend-a-ip:3001

# Friend B:
export HTTP_BOOTSTRAP_PEERS="http://friend-a-ip:3001"
npm start
# Share: http://friend-b-ip:3001

# Friend C:
export HTTP_BOOTSTRAP_PEERS="http://friend-a-ip:3001,http://friend-b-ip:3001"
npm start
# Share: http://friend-c-ip:3001

# Friend D:
export HTTP_BOOTSTRAP_PEERS="http://friend-a-ip:3001,http://friend-b-ip:3001,http://friend-c-ip:3001"
npm start
```

**Pros:** Fully decentralized, no central authority  
**Cons:** Requires all friends to have public IPs/port forwarding, complex network management

## Verification: Check Network Connectivity

### 1. Check Your Bootstrap Peers

```bash
# On any node, check what bootstraps you're configured with:
# Look for this in startup logs:
[VerimutSync] HTTP P2P initialized with 3 bootstrap peer(s)
[HTTPP2P] Initialized with 3 bootstrap peer(s)
```

### 2. Verify VNS Sync

```bash
# Register a test name on Node A:
curl -X POST http://node-a:3001/api/vns/register -d @test-registration.json

# Check if it appears on Node B:
curl http://node-b:3001/api/vns/resolve/testname.vfs
# Should return the registration if sync worked!

# Check merkle roots match:
curl http://node-a:3001/api/vns/status
curl http://node-b:3001/api/vns/status
# merkleRoot should be identical across all nodes
```

### 3. Watch Logs for Sync Activity

```bash
# You should see these messages when deltas propagate:
[HTTPP2P] Pushing delta to 3 peer(s): register for testname.vfs
[HTTPP2P] ✓ Successfully pushed to http://bootstrap-a:3001
[HTTPP2P] ✓ Successfully pushed to http://bootstrap-b:3001
[HTTPP2P] ✓ Successfully pushed to http://bootstrap-c:3001
[HTTPP2P] Push completed: 3/3 successful
```

## Troubleshooting

### Problem: Nodes not syncing

**Check:**
1. Are bootstrap nodes configured to connect to each other?
2. Are all friends using the complete bootstrap list?
3. Are ports open (3001) on all bootstrap nodes?
4. Check `/api/vns/status` - do merkle roots match?

**Solution:**
- Update `HTTP_BOOTSTRAP_PEERS` on all nodes to include all bootstraps
- Restart nodes after configuration changes
- Verify firewall rules allow port 3001

### Problem: Partial sync (some nodes get updates, others don't)

**Likely cause:** Bootstrap mesh incomplete

**Solution:**
- Ensure every bootstrap has `HTTP_BOOTSTRAP_PEERS` listing all other bootstraps
- OR give every friend the complete bootstrap list
- Check logs for "Failed to push" messages

### Problem: Merkle roots don't match

**Possible causes:**
1. Network split (isolated groups)
2. Different genesis entries (nodes started at different times)
3. Failed delta propagation

**Solution:**
1. Verify all nodes connected to same bootstrap mesh
2. Restart all nodes from clean state
3. Check logs for HTTP P2P errors

## Best Practices

1. **Always run 2-3 bootstrap nodes** for redundancy
2. **Connect bootstraps to each other** to form mesh
3. **Give friends the complete bootstrap list** for resilience
4. **Use domains instead of IPs** for bootstrap URLs (easier to update)
5. **Monitor merkle roots** to detect sync issues early
6. **Test connectivity** before adding more friends

## Future: True P2P with libp2p Gossipsub

The HTTP P2P model is a workaround for libp2p 0.45.0 limitations. In the future, when we solve the logger injection issue, we'll use **gossipsub** for true peer-to-peer propagation:

```
Friend 1 ←→ Friend 2 ←→ Friend 3
   ↕           ↕           ↕
Friend 4 ←→ Friend 5 ←→ Friend 6

No central bootstraps needed!
Everyone connects to everyone via gossipsub mesh.
```

But for now, HTTP P2P with bootstrap mesh provides:
- ✅ Reliable multi-node sync
- ✅ Simple HTTP protocol (easy to debug)
- ✅ Works behind NAT/firewalls
- ✅ Production-ready architecture
