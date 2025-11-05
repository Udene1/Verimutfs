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

**Super simple now!** Just use this one-line config:

**Windows:**
```powershell
$env:ENABLE_VNS="true"
$env:HTTP_BOOTSTRAP_PEERS="bootstrap-node"
npm start
```

**Mac/Linux:**
```bash
export ENABLE_VNS=true
export HTTP_BOOTSTRAP_PEERS="bootstrap-node"
npm start
```

**That's it!** Your node will automatically:
- ✅ Discover all active bootstrap nodes via VNS
- ✅ Connect to the entire network mesh
- ✅ Start syncing VNS entries

**How it works:** The `bootstrap-node` name resolves to all registered bootstrap nodes in the network. No manual URL sharing needed!

---

**Alternative: Static URLs (if I provide specific IPs)**

If I send you specific bootstrap URLs via Discord/Email, you can also use them directly:

**Windows:**
```powershell
$env:ENABLE_VNS="true"
$env:HTTP_BOOTSTRAP_PEERS="http://1.2.3.4:3001,http://5.6.7.8:3001"
npm start
```

**Mac/Linux:**
```bash
export ENABLE_VNS=true
export HTTP_BOOTSTRAP_PEERS="http://1.2.3.4:3001,http://5.6.7.8:3001"
npm start
```

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
- Terminal shows: `[HTTPP2P] Initialized with N bootstrap peer(s)`
- You see: `[VerimutSync] HTTP P2P initialized with N bootstrap peer(s)`
- Periodic sync messages appear
- VNS entry count increases over time
- `/api/vns/status` returns valid merkle root

### Issues to Report ❌
- Node crashes or hangs
- HTTP P2P push failures
- Entry counts don't match other nodes
- Merkle root inconsistencies
- High CPU/memory usage

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

## Sharing Your Node (Optional)

Want to be a bootstrap peer for others? You'll need to:
1. Open port 3001 in your router/firewall
2. Get your public IP or set up a domain
3. Share your URL: `http://YOUR_IP:3001`

**Security note:** HTTP is unencrypted. Don't share sensitive data via VNS during testing.

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

Want to run a bootstrap node that others can connect to?

### Requirements:
- Public server (VPS, cloud instance, or home with port forwarding)
- Port 3001 open in firewall
- Public IP or domain name

### Quick Setup:

**Linux/Mac:**
```bash
./setup-bootstrap.sh
```

**Windows:**
```powershell
.\setup-bootstrap.ps1
```

This will:
1. Configure environment variables
2. Show your public IP and bootstrap URL
3. Start the node
4. Display the URL to share with others

### Manual Setup:

```bash
# On your public server:
export ENABLE_VNS=true
export API_PORT=3001
npm start

# Your bootstrap URL will be:
# http://YOUR_PUBLIC_IP:3001
```

**Then share this URL** with friends who want to join your network!

---

*Bootstrap Peer URLs (I'll send these to you):*
- Bootstrap Node 1: `http://???:3001`
- Bootstrap Node 2: `http://???:3001`
- Bootstrap Node 3: `http://???:3001`

*Network Status: PRE-LAUNCH TESTING*  
*Last Update: November 5, 2025*
