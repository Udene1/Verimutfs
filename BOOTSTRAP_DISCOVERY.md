# Bootstrap Discovery System

## Problem Solved

**Before:** You had to manually share bootstrap URLs with every friend:
```bash
# You: "Hey friend, use these URLs:"
HTTP_BOOTSTRAP_PEERS="http://123.45.67.89:3001,http://98.76.54.32:3001"
```

**After:** Friends just use a VNS name:
```bash
# Friend: "I'll discover bootstraps automatically!"
HTTP_BOOTSTRAP_PEERS="bootstrap.vns"
```

## How It Works

### 1. **You Start Genesis/Bootstrap Node**

```bash
# Bootstrap Node A
export ENABLE_VNS=true
export BOOTSTRAP_PUBLIC_URL="http://your-public-ip:3001"
npm start
```

Your node automatically:
- Starts with VNS enabled
- Registers itself as `bootstrap.vns` in VNS
- Becomes discoverable by VNS name resolution

### 2. **Friends Join Using VNS Discovery**

```bash
# Friend's Node
export ENABLE_VNS=true
export HTTP_BOOTSTRAP_PEERS="seed:bootstrap.vns"
npm start
```

Their node automatically:
- Connects to seed bootstrap (well-known URL)
- Queries VNS: "What's bootstrap.vns?"
- Gets list of all registered bootstrap URLs
- Connects to all discovered bootstraps

### 3. **More Bootstraps Can Join**

```bash
# Bootstrap Node B (another friend wants to help)
export ENABLE_VNS=true
export BOOTSTRAP_PUBLIC_URL="http://their-public-ip:3001"
export HTTP_BOOTSTRAP_PEERS="bootstrap.vns"
npm start
```

This node:
- Discovers existing bootstraps via VNS
- Connects to them
- Also registers itself as `bootstrap.vns`
- Now both bootstraps are discoverable

## Configuration Options

### Option 1: Pure VNS Discovery (Recommended)

```bash
# Friends just need this:
HTTP_BOOTSTRAP_PEERS="bootstrap.vns"
# or
HTTP_BOOTSTRAP_PEERS="seed:bootstrap.vns"
```

**Pros:**
- ✅ No manual URL sharing
- ✅ Automatically discovers all bootstraps
- ✅ Self-healing (new bootstraps auto-discovered)

**Cons:**
- ⚠️ Requires at least one seed bootstrap (hardcoded in code)

### Option 2: Hybrid (Static + Discovery)

```bash
# Specify seed bootstrap explicitly + discovery
HTTP_BOOTSTRAP_PEERS="http://seed.verimut.com:3001,bootstrap.vns"
```

**Pros:**
- ✅ Guaranteed connection to known seed
- ✅ Auto-discovers additional bootstraps
- ✅ Fallback if VNS discovery fails

### Option 3: Pure Static (Traditional)

```bash
# Old way - still works!
HTTP_BOOTSTRAP_PEERS="http://1.2.3.4:3001,http://5.6.7.8:3001"
```

**Use when:**
- Testing without VNS
- Private networks
- You prefer manual control

## VNS Bootstrap Entry Format

When you register as bootstrap, VNS stores:

```json
{
  "name": "bootstrap.vns",
  "value": {
    "endpoint": "http://your-public-ip:3001",
    "type": "bootstrap",
    "timestamp": 1730851200000
  }
}
```

**Note:** Multiple nodes can register as `bootstrap.vns`. The VNS system can:
- Store multiple entries (array)
- Or use Last-Write-Wins (latest registration)

Depends on your VNS merge strategy (we should implement array merge for bootstraps).

## Seed Bootstrap Configuration

The system needs at least **one well-known seed bootstrap** for initial discovery. This is hardcoded in `bootstrap-discovery.ts`:

```typescript
const seedBootstraps = config.seedBootstraps || [
  'http://seed.verimut.com:3001'  // Your genesis node
];
```

**You should:**
1. Deploy your genesis node at a stable URL (domain or static IP)
2. Update this hardcoded seed URL
3. Commit to GitHub
4. Now friends can use `HTTP_BOOTSTRAP_PEERS="bootstrap.vns"`

## Integration with Existing Code

### Update VerimutSync Initialization

```typescript
// src/sync.ts or src/index.ts
import { initializeBootstrapDiscovery } from './networking/bootstrap-discovery.js';

// On startup, before creating VerimutSync:
const bootstrapPeers = await initializeBootstrapDiscovery({
  seedBootstraps: ['http://seed.verimut.com:3001'],
  publicUrl: process.env.BOOTSTRAP_PUBLIC_URL,
  port: 3001,
  verbose: true
});

// Pass discovered peers to VerimutSync
const sync = await VerimutSync.create({
  // ... other config
  bootstrapPeers: bootstrapPeers
});
```

### Environment Variables

```bash
# For bootstrap nodes:
ENABLE_VNS=true
BOOTSTRAP_PUBLIC_URL="http://your-public-ip:3001"  # Self-register
HTTP_BOOTSTRAP_PEERS="bootstrap.vns"  # Discover other bootstraps

# For regular nodes:
ENABLE_VNS=true
HTTP_BOOTSTRAP_PEERS="bootstrap.vns"  # Discover all bootstraps
```

## Advanced: Multiple Bootstrap Pools

You can create different bootstrap pools:

```bash
# Premium bootstrap pool
BOOTSTRAP_PUBLIC_URL="http://premium-node:3001"
HTTP_BOOTSTRAP_PEERS="premium.vns"

# Public bootstrap pool
BOOTSTRAP_PUBLIC_URL="http://public-node:3001"
HTTP_BOOTSTRAP_PEERS="public.vns"

# Connect to both pools
HTTP_BOOTSTRAP_PEERS="premium.vns,public.vns"
```

## Security Considerations

### 1. **Seed Bootstrap Trust**

The hardcoded seed bootstrap is a trust anchor. If compromised:
- Attacker can redirect all new nodes
- Similar to DNS hijacking

**Mitigation:**
- Use HTTPS for seed bootstrap
- Hardcode multiple seed bootstraps
- Verify VNS entry signatures (already implemented)

### 2. **Bootstrap VNS Entry Validation**

Anyone can register `bootstrap.vns`. Malicious actor could:
- Register fake bootstrap URL
- Redirect traffic to their node

**Mitigation:**
- Require proof-of-work for bootstrap registration (higher threshold)
- Use multi-signature for bootstrap entries
- Implement reputation system (future)

### 3. **DDoS on Genesis Bootstrap**

If all nodes query one seed bootstrap:
- Potential bottleneck
- DDoS target

**Mitigation:**
- Deploy multiple seed bootstraps
- Use DNS round-robin
- Implement caching (discovery results TTL)

## Example Deployment

### Step 1: You Deploy Genesis Node

```bash
# On your VPS (stable IP: 1.2.3.4)
git clone https://github.com/Udene1/Verimutfs.git
cd Verimutfs
npm install && npm run build

export ENABLE_VNS=true
export BOOTSTRAP_PUBLIC_URL="http://1.2.3.4:3001"
npm start
```

✅ Your node registers as `bootstrap.vns`

### Step 2: Update Seed Bootstrap in Code

```typescript
// src/networking/bootstrap-discovery.ts
const seedBootstraps = config.seedBootstraps || [
  'http://1.2.3.4:3001'  // Your genesis node IP
];
```

Commit and push to GitHub.

### Step 3: Friend Clones and Starts

```bash
git clone https://github.com/Udene1/Verimutfs.git
cd Verimutfs
npm install && npm run build

export ENABLE_VNS=true
export HTTP_BOOTSTRAP_PEERS="bootstrap.vns"
npm start
```

✅ Friend's node:
1. Contacts seed (1.2.3.4:3001)
2. Queries VNS for `bootstrap.vns`
3. Gets your node's URL
4. Connects and syncs!

### Step 4: Another Friend Runs Bootstrap

```bash
# Friend on different network (IP: 5.6.7.8)
export ENABLE_VNS=true
export BOOTSTRAP_PUBLIC_URL="http://5.6.7.8:3001"
export HTTP_BOOTSTRAP_PEERS="bootstrap.vns"
npm start
```

✅ This node:
1. Discovers your bootstrap (1.2.3.4)
2. Connects to you
3. Also registers as `bootstrap.vns`
4. Now there are 2 bootstraps discoverable!

### Step 5: Everyone Auto-Discovers Both

```bash
# Any new node starting:
export HTTP_BOOTSTRAP_PEERS="bootstrap.vns"
npm start

# Automatically discovers and connects to:
# - http://1.2.3.4:3001 (your genesis)
# - http://5.6.7.8:3001 (friend's bootstrap)
```

🎉 **Fully decentralized bootstrap discovery!**

## Comparison

| Feature | Manual URLs | VNS Discovery |
|---------|-------------|---------------|
| URL sharing | Manual (Discord/Email) | Automatic (VNS) |
| New bootstrap joins | Must notify everyone | Auto-discovered |
| Bootstrap goes down | Manual update needed | Auto-failover to others |
| Scaling | Painful | Seamless |
| Setup complexity | Simple | Requires seed bootstrap |

## Next Steps

1. **Implement integration** in `src/index.ts` or `src/sync.ts`
2. **Update seed bootstrap URL** after deploying genesis
3. **Test discovery** with local Docker setup
4. **Update friend onboarding docs** with new simple config
5. **Deploy and verify** with real friends

## Future Enhancements

- **Bootstrap reputation scoring** (uptime, latency)
- **Automatic seed bootstrap discovery** via DNS TXT records
- **Bootstrap health checks** (periodic ping, remove dead bootstraps)
- **Geo-aware discovery** (connect to nearest bootstraps)
- **Bootstrap incentives** (reward for stable bootstrap operation)
