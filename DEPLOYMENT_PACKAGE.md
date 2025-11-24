# VerimutFS Node - Minimal Deployment Package

## What to Push to GitHub

### ✅ Essential Files (MUST include):

```
Verimutfs/
├── src/                    # All source code
├── package.json            # Dependencies
├── package-lock.json       # Lock file
├── tsconfig.json           # TypeScript config
├── .gitignore              # Git ignore
├── README.md               # Main documentation
├── QUICK_START.md          # Quick start guide
├── API_REFERENCE.md        # API docs
├── DEPLOYMENT_GUIDE.md     # Deployment guide
├── GCP_DEPLOYMENT.md       # GCP specific
└── start-bootstrap.sh      # Bootstrap script
```

### ❌ Exclude (will be generated/created):

```
node_modules/          # Installed via npm install
dist/                  # Built via npm run build
verimut-data/          # Runtime data
verimut-repos/         # Runtime data
.env                   # Created on deployment
peer-key.json          # Generated at runtime
```

### 📝 Documentation to Keep:

**Essential**:
- README.md
- QUICK_START.md
- API_REFERENCE.md
- DEPLOYMENT_GUIDE.md
- GCP_DEPLOYMENT.md
- SYSTEM_DOCUMENTATION.md
- ARCHITECTURE.md

**Optional** (can remove to reduce size):
- VNS_PHASE1.md, VNS_PHASE2.md, VNS_PHASE3.md
- TESTING_*.md files
- NETWORK_TOPOLOGY.md
- PROJECT_SUMMARY.md
- FRIEND_ONBOARDING.md
- LAUNCH_CHECKLIST.md

## Contract .env Question

**Answer**: NO, the contract `.env` outside won't affect the node.

**Why**:
- Contract `.env` is for smart contract deployment (Hardhat/Foundry)
- Node `.env` is for the VerimutFS node runtime
- They are completely separate

**Node needs its own `.env`**:
```bash
# Inside Verimutfs/ directory
NODE_ENV=production
API_PORT=3001
ENABLE_VNS=true
VFS_NAME=my-node
HTTP_BOOTSTRAP_PEERS=bootstrap1.vfs
RPC_URL=https://sepolia.base.org
GASLESS_PAYMENT_CONTRACT=0xA29FC36cB931E5FAd3e825BaF0a3be176eAeA683
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

## Recommended: Clean Structure

Create a minimal package with only essentials:

```bash
# What to push
src/                    # 100% needed
package.json            # 100% needed
package-lock.json       # 100% needed
tsconfig.json           # 100% needed
.gitignore              # 100% needed
README.md               # 100% needed
QUICK_START.md          # Helpful
API_REFERENCE.md        # Helpful
DEPLOYMENT_GUIDE.md     # Helpful
GCP_DEPLOYMENT.md       # Helpful
start-bootstrap.sh      # Helpful
.env.example            # Template
```

**Total size**: ~5-10 MB (without node_modules)

## Next Steps

1. **Option A: Push minimal package** (recommended)
   - Only essential files
   - Clean and professional
   - Fast clone/download

2. **Option B: Push everything**
   - Includes all docs
   - Larger repo
   - More comprehensive

**Which would you prefer?**
