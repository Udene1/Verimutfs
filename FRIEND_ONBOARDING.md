# Friend Onboarding - Join the Verimut Network! 🌐

Hey friend! Thanks for helping test VerimutFS. This is the pre-public launch phase where we need real peers to stress-test the network.

## What You're Testing

You're joining a **decentralized skill-sharing network** with cryptographic name resolution (VNS). By running a node, you help us test:
- P2P connectivity across different networks
- VNS delta synchronization in real-world conditions  
- Network resilience with multiple live peers
- How our skill/service provider website integrates with the network

## Super Quick Start (5 Minutes)

### 1. Install Node.js
If you don't have it: [Download Node.js](https://nodejs.org/) (get the LTS version)

### 2. Get the Code
```bash
git clone https://github.com/Udene1/Verimutfs.git
cd Verimutfs
```

### 3. Build It
```bash
npm install && npm run build
```
*(Takes 2-3 minutes on first run)*

### 4. Start Your Node

**🌟 PURE VNS - NO IP SHARING NEEDED!**

I'll give you ONE seed IP to bootstrap from. After that, everything uses VNS names!

**Windows:**
```powershell
$env:ENABLE_VNS="true"
$env:HTTP_BOOTSTRAP_PEERS="bootstrap-node"
$env:SEED_BOOTSTRAP="http://102.90.98.234:3001"
npm start
```

**Mac/Linux:**
```bash
export ENABLE_VNS=true
export HTTP_BOOTSTRAP_PEERS="bootstrap-node"
export SEED_BOOTSTRAP="http://102.90.98.234:3001"
npm start
```

**What happens:**
1. ✅ Your node queries the seed to resolve `bootstrap-node.vfs` via VNS
2. ✅ VNS returns ALL registered bootstrap URLs automatically
3. ✅ Your node connects to the entire network mesh
4. ✅ Starts syncing VNS entries from all bootstraps

**Magic part:** The `bootstrap-node` name is shared by ALL bootstrap nodes in the network. When one goes down, VNS automatically returns the others. No central point of failure!

---

**Note:** The seed IP (`http://102.90.98.234:3001`) is ONLY used for the first VNS query. After that, everything runs on pure VNS names. This is true decentralization! 🚀

### 5. Verify It's Working

Open your browser: `http://localhost:3001/api/vns/status`

You should see something like:
```json
{
  "enabled": true,
  "entries": 4,
  "merkleRoot": "eb843f04ad2455ca859bf0fd7974ee1a48d7fc0f98eae0ed7299bf45811cd4ef"
}
```

**That's it!** Your node is now part of the network. 🎉

## What Happens Next?

- Your node will sync VNS entries from bootstrap peers via HTTP P2P
- Watch your terminal - you'll see `[HTTPP2P]` messages showing sync activity
- Keep it running as long as you can (hours/days appreciated!)
- Your node becomes a peer that others can connect to

## What to Watch For

### Good Signs ✅
- Terminal shows: `[BootstrapDiscovery] Discovering bootstrap peers via VNS name: bootstrap-node`
- You see: `[VerimutSync] HTTP P2P initialized with N bootstrap peer(s)` (N should be 1 or more)
- Log shows: `[VerimutSync] ✓ Bootstrap registration complete` (if you're running a bootstrap)
- Bootstrap mesh sync logs: `[BootstrapMesh] Discovered X bootstrap(s) in VNS`
- Periodic sync messages appear every 60 seconds
- VNS entry count increases over time
- `/api/vns/status` returns valid merkle root
- No errors about "Failed to sync VNS with..."

### Issues to Report ❌
- Node crashes or hangs
- Errors: "Failed to sync VNS with bootstrap-node.vfs"
- VNS discovery fails to find any bootstraps
- Entry counts don't match other nodes after several sync cycles
- Merkle root inconsistencies between nodes
- High CPU/memory usage (>500MB RAM or >10% CPU is unusual)
- Bootstrap mesh sync not running when it should be

## Feedback We Need

After running for a while (few hours minimum), please share:

1. **Did it work?**
   - Node stayed online?
   - VNS entries synced?
   - Any crashes or errors?

2. **Performance**
   - CPU/RAM usage acceptable?
   - Network bandwidth impact?
   - Response times good?

3. **Logs**
   Copy your terminal output to a file:
   ```bash
   # Redirect output to file when starting:
   npm start > node-log.txt 2>&1
   ```

4. **Environment**
   - OS (Windows/Mac/Linux)?
   - Behind NAT/firewall?
   - Home/office/cloud network?
   - Internet speed?

## Want to Run a Bootstrap Node? (Optional - Advanced)

Help strengthen the network by running a public bootstrap node! See the **"For Network Operators"** section below.

**Key benefit:** Your bootstrap automatically joins the mesh and replicates all VNS data. When other bootstraps go offline, yours keeps the network alive!

**Security note:** HTTP is unencrypted. Don't share sensitive data via VNS during testing. HTTPS/TLS coming in future releases.

## Common Issues

### "EADDRINUSE: port 3001 already in use"
Another program is using port 3001. Change it:
```bash
export API_PORT=3002  # Mac/Linux
$env:API_PORT="3002"  # Windows
npm start
```

### "Cannot resolve bootstrap peers"
Check the `HTTP_BOOTSTRAP_PEERS` URLs I sent you. They should be:
- Full URLs with `http://`
- Include port number (usually :3001)
- Comma-separated, no spaces

### "No sync happening"
- Check `/api/vns/status` - does `entries` increase?
- Look for `[HTTPP2P]` messages in terminal
- Verify bootstrap peers are online
- DM me - I'll check my end

## Next Steps After Testing

Once we've validated the network with you and other friends:
1. We'll do a final stability check
2. Clean up any bugs you found
3. **Public launch!** 🚀
4. You'll get early contributor recognition

## Questions?

- **Discord**: [Join our server](#) *(I'll send invite)*
- **GitHub Issues**: [github.com/Udene1/Verimutfs/issues](https://github.com/Udene1/Verimutfs/issues)
- **Email**: udeneogagaoghene@gmail.com
- **Direct message**: Hit me up anytime!

---

**Thanks for being an early tester! Your feedback is invaluable! 🙏**

---

## For Network Operators: Running a Bootstrap Node

Want to help strengthen the network by running a bootstrap node?

### Requirements:
- Public server (VPS, cloud instance, or home with port forwarding)
- Port 3001 open in firewall
- Public IP or domain name
- Stable internet connection (bootstrap nodes should stay online)

### Easy Setup (Recommended):

**Windows:**
```powershell
.\setup-genesis-bootstrap.ps1
```

**Linux/Mac:**
```bash
./setup-genesis-bootstrap.sh
```

The script will:
- Auto-detect your public IP
- Ask if you're genesis or secondary bootstrap
- Configure all environment variables
- Start your node

### Manual Setup:

**Windows:**
```powershell
# Set your public URL (this gets registered as bootstrap-node.vfs)
$env:BOOTSTRAP_PUBLIC_URL="http://YOUR_PUBLIC_IP:3001"
$env:SEED_BOOTSTRAP="http://102.90.98.234:3001"
$env:HTTP_BOOTSTRAP_PEERS="bootstrap-node"
$env:ENABLE_VNS="true"
npm start
```

**Linux/Mac:**
```bash
export BOOTSTRAP_PUBLIC_URL="http://YOUR_PUBLIC_IP:3001"
export SEED_BOOTSTRAP="http://102.90.98.234:3001"
export HTTP_BOOTSTRAP_PEERS="bootstrap-node"
export ENABLE_VNS=true
npm start
```

**What happens:**
1. ✅ Your node registers as `bootstrap-node.vfs` in VNS
2. ✅ Bootstrap mesh sync discovers other bootstraps automatically
3. ✅ All VNS entries + content blocks replicate to your node every 60s
4. ✅ You become part of the self-healing bootstrap mesh!

**No need to share your IP!** Peers discover you automatically via `bootstrap-node.vfs` 🚀

---

## 🌐 Network Information

**Seed Bootstrap (for first-time VNS query only):**
```
http://102.90.98.234:3001
```

**VNS Bootstrap Name (this is what everyone uses):**
```
bootstrap-node.vfs
```

**How it works:**
- All bootstrap nodes register under the same VNS name: `bootstrap-node.vfs`
- When you query any bootstrap for `bootstrap-node.vfs`, you get ALL bootstrap URLs
- Pure decentralized discovery - no hardcoded IPs in your config after initial seed!

**Current Network Status:**
- 🟢 Genesis Node: ONLINE (`http://102.90.98.234:3001`)
- 🔄 Bootstrap Mesh Sync: ACTIVE (60s intervals)
- 📡 VNS Propagation: ENABLED
- 🚀 Status: **PRE-LAUNCH TESTING**

*Last Update: November 6, 2025*
