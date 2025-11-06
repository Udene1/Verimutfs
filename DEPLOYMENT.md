# VerimutFS Deployment Guide

**Pure VNS Bootstrap Discovery - No IP Sharing Required!**

## 🚀 Quick Start

### Genesis Node (Network Founder)

```powershell
# Set your public URL (this gets registered as bootstrap-node.vfs)
$env:BOOTSTRAP_PUBLIC_URL = "http://YOUR_PUBLIC_IP:3001"
$env:ENABLE_VNS = "true"

npm start
```

**What happens:**
1. ✅ Genesis registers `bootstrap-node.vfs` in VNS with your public URL
2. ✅ Genesis uses `bootstrap-node.vfs` to discover itself
3. ✅ Mesh sync starts - ready to replicate data with other bootstraps
4. ✅ Network is live!

---

### Regular Peers (Friends Joining)

```powershell
# Just use bootstrap-node - VNS resolves it!
$env:HTTP_BOOTSTRAP_PEERS = "bootstrap-node"
$env:SEED_BOOTSTRAP = "http://GENESIS_IP:3001"  # Only for first query
$env:ENABLE_VNS = "true"

npm start
```

**What happens:**
1. ✅ Queries genesis to resolve `bootstrap-node.vfs` via VNS
2. ✅ Gets the actual bootstrap URL(s)
3. ✅ Connects to network
4. ✅ Syncs all data from bootstraps

**No IPs shared after initial seed!** Everything uses VNS names.

---

### Additional Bootstrap Nodes (Optional)

If you want to add more bootstrap nodes for redundancy:

```powershell
# Same as genesis but with your own URL
$env:BOOTSTRAP_PUBLIC_URL = "http://YOUR_PUBLIC_IP:3001"
$env:SEED_BOOTSTRAP = "http://GENESIS_IP:3001"
$env:ENABLE_VNS = "true"

npm start
```

**What happens:**
1. ✅ Registers as `bootstrap-node.vfs` (multiple bootstraps share the same VNS name)
2. ✅ Mesh sync discovers other bootstraps automatically
3. ✅ All bootstraps replicate VNS entries + content blocks
4. ✅ Self-healing mesh formed!

---

## 🔄 How Bootstrap Mesh Sync Works

### Automatic Replication
- Every 60 seconds, each bootstrap:
  1. Discovers other bootstraps via VNS (`bootstrap-node.vfs`)
  2. Fetches their VNS entries
  3. Fetches their content blocks
  4. Merges new data locally

### Self-Healing
- If any bootstrap goes offline, data remains available on others
- Peers automatically discover remaining bootstraps via VNS
- No single point of failure!

### VNS Propagation
When you register a name like `myapp.vfs`:
1. Registered on local bootstrap
2. Mesh sync replicates to all other bootstraps within 60s
3. Anyone querying ANY bootstrap will find your name
4. Fully decentralized name resolution!

---

## 📋 Verification

### Check VNS Registration
```powershell
curl http://localhost:3001/api/vns/resolve/bootstrap-node.vfs
```

Should return the bootstrap URL(s).

### Check Bootstrap Discovery
Look for logs:
```
[BootstrapMesh] Discovered X bootstrap(s) in VNS (Y peer(s), Z self)
[BootstrapMesh] ✓ Merged N new VNS entries from bootstrap-node.vfs
```

### Check Network Connectivity
```
[VerimutSync] HTTP P2P initialized with X bootstrap peer(s)
📡 Connected to X peers
```

---

## 🎯 Key Benefits

✅ **No IP Sharing** - Only genesis needs seed IP, everyone else uses `bootstrap-node`  
✅ **Pure VNS Discovery** - All peers found via VNS names  
✅ **Automatic Mesh Sync** - Bootstraps replicate everything  
✅ **Self-Healing** - Data survives bootstrap failures  
✅ **Decentralized** - No central authority or single point of failure  

---

## 🐛 Troubleshooting

### "Failed to sync VNS with bootstrap-node.vfs"
- **Cause**: Node trying to sync with itself using unreachable URL
- **Fix**: Code now auto-skips self-sync, this shouldn't happen

### "No bootstrap peers found"
- **Cause**: Wrong `SEED_BOOTSTRAP` or genesis not reachable
- **Fix**: Verify genesis is running and firewall allows port 3001

### "Connected to 0 peers"
- **Cause**: VNS discovery working but HTTP connections failing
- **Fix**: Check `BOOTSTRAP_PUBLIC_URL` is reachable from other machines

---

## 📦 Ready for Production

Your network is ready when:
1. ✅ Genesis registers `bootstrap-node.vfs` successfully
2. ✅ Bootstrap mesh sync running (check logs)
3. ✅ Friends can connect using just `bootstrap-node` (no IPs!)
4. ✅ VNS entries replicate across all bootstraps

**Share this guide with your friends and let them join the network!** 🚀
