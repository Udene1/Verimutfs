# Docker Deployment Guide for VerimutFS

## Quick Start

### Option 1: Join Existing Network as Peer

```bash
# Pull the latest code
git pull

# Build Docker image
docker build -t verimutfs-node .

# Run as peer (discovers genesis bootstrap)
docker run -d \
  --name my-verimutfs-peer \
  -p 3001:3001 \
  -e ENABLE_VNS=true \
  -e HTTP_BOOTSTRAP_PEERS=bootstrap-node \
  -v verimutfs-data:/data \
  verimutfs-node
```

### Option 2: Run as Bootstrap Node

```bash
# Build image
docker build -t verimutfs-node .

# Run as bootstrap with your public IP
docker run -d \
  --name my-bootstrap \
  -p 3001:3001 \
  -e ENABLE_VNS=true \
  -e BOOTSTRAP_PUBLIC_URL=http://YOUR_PUBLIC_IP:3001 \
  -e HTTP_BOOTSTRAP_PEERS=bootstrap-node \
  -v verimutfs-bootstrap:/data \
  verimutfs-node
```

### Option 3: Full Local Network (Docker Compose)

```bash
# Start entire 6-node network
docker-compose up -d

# Services:
# - genesis-bootstrap (port 3001)
# - bootstrap-2 (port 3002)
# - bootstrap-3 (port 3003)
# - peer-1 (port 3004)
# - peer-2 (port 3005)
# - peer-3 (port 3006)

# View logs
docker-compose logs -f

# Stop network
docker-compose down
```

---

## Deployment Scenarios

### 1. Genesis Bootstrap (First Node)

```bash
docker run -d \
  --name verimutfs-genesis \
  -p 3001:3001 \
  -e ENABLE_VNS=true \
  -e BOOTSTRAP_PUBLIC_URL=http://YOUR_IP:3001 \
  -e VERBOSE=true \
  -v genesis-data:/data \
  verimutfs-node
```

**Environment:**
- `ENABLE_VNS=true` - Enable Verimut Name Service
- `BOOTSTRAP_PUBLIC_URL` - Your public URL for VNS registration
- `VERBOSE=true` - See detailed logs

**What it does:**
- Registers as `bootstrap-node.vfs` in VNS
- Starts bootstrap mesh sync
- Serves as discovery point for other nodes

---

### 2. Secondary Bootstrap

```bash
docker run -d \
  --name verimutfs-bootstrap-2 \
  -p 3002:3001 \
  -e ENABLE_VNS=true \
  -e HTTP_BOOTSTRAP_PEERS=bootstrap-node \
  -e BOOTSTRAP_PUBLIC_URL=http://YOUR_IP:3002 \
  -e VERBOSE=true \
  -v bootstrap2-data:/data \
  verimutfs-node
```

**What it does:**
- Discovers genesis bootstrap via VNS
- Registers as additional bootstrap node
- Syncs VNS entries and content blocks
- Forms mesh with other bootstraps

---

### 3. Regular Peer (with Promotion)

```bash
docker run -d \
  --name verimutfs-peer \
  -p 3004:3001 \
  -e ENABLE_VNS=true \
  -e HTTP_BOOTSTRAP_PEERS=bootstrap-node \
  -e BOOTSTRAP_PUBLIC_URL=http://YOUR_IP:3004 \
  -e ENABLE_PEER_PROMOTION=true \
  -v peer-data:/data \
  verimutfs-node
```

**What it does:**
- Connects to bootstraps via VNS discovery
- Monitors bootstrap health
- Auto-promotes if all bootstraps fail
- Prevents network fragmentation

---

### 4. Basic Peer (no Promotion)

```bash
docker run -d \
  --name verimutfs-peer \
  -p 3005:3001 \
  -e ENABLE_VNS=true \
  -e HTTP_BOOTSTRAP_PEERS=bootstrap-node \
  -v peer-data:/data \
  verimutfs-node
```

**What it does:**
- Connects to network via bootstraps
- Participates in content sharing
- No promotion capability (simpler)

---

## Docker on Remote Server

### Deploy Bootstrap on VPS/Cloud

```bash
# SSH into your server
ssh user@your-server.com

# Clone repo
git clone https://github.com/Udene1/Verimutfs.git
cd Verimutfs

# Build image
docker build -t verimutfs-node .

# Run as bootstrap
docker run -d \
  --name verimutfs-bootstrap \
  --restart unless-stopped \
  -p 3001:3001 \
  -e ENABLE_VNS=true \
  -e BOOTSTRAP_PUBLIC_URL=http://$(curl -s ifconfig.me):3001 \
  -e VERBOSE=true \
  -v /var/verimutfs/data:/data \
  verimutfs-node

# Check logs
docker logs -f verimutfs-bootstrap

# Check it's running
curl http://localhost:3001/api/status
```

---

## Networking Considerations

### Port Mapping

- **Host Port → Container Port**
- Example: `-p 3002:3001` means:
  - Host listens on `3002`
  - Container runs on `3001`
  - `BOOTSTRAP_PUBLIC_URL` should use `3002`

### Public IP Detection

```bash
# Auto-detect public IP
docker run -d \
  -e BOOTSTRAP_PUBLIC_URL=http://$(curl -s ifconfig.me):3001 \
  ...
```

### Docker Network Modes

**Bridge (default):**
```bash
docker run --network bridge ...
```
- Containers isolated
- Use `host.docker.internal` to reach host

**Host:**
```bash
docker run --network host ...
```
- Shares host network
- No port mapping needed
- Use `localhost` directly

---

## Data Persistence

### Named Volumes (Recommended)

```bash
docker run -v verimutfs-data:/data verimutfs-node
```

**Benefits:**
- Managed by Docker
- Persists across container restarts
- Easy to backup

### Bind Mounts

```bash
docker run -v /host/path/data:/data verimutfs-node
```

**Benefits:**
- Direct access to data
- Easy to inspect/backup
- Share with host

---

## Multi-Node Testing

### Test Bootstrap Mesh Sync

```bash
# Start 3 bootstraps
docker run -d --name bs1 -p 3001:3001 -e BOOTSTRAP_PUBLIC_URL=http://host.docker.internal:3001 verimutfs-node
docker run -d --name bs2 -p 3002:3001 -e BOOTSTRAP_PUBLIC_URL=http://host.docker.internal:3002 -e HTTP_BOOTSTRAP_PEERS=bootstrap-node verimutfs-node
docker run -d --name bs3 -p 3003:3001 -e BOOTSTRAP_PUBLIC_URL=http://host.docker.internal:3003 -e HTTP_BOOTSTRAP_PEERS=bootstrap-node verimutfs-node

# Register name on bs1
curl -X POST http://localhost:3001/api/vns/register -d '{...}'

# Wait 60s for mesh sync

# Check bs2 received it
curl http://localhost:3002/api/vns/list
# Should show the name!
```

### Test Peer Promotion

```bash
# Start genesis bootstrap
docker run -d --name genesis -p 3001:3001 -e BOOTSTRAP_PUBLIC_URL=http://host.docker.internal:3001 verimutfs-node

# Start peer with promotion
docker run -d --name peer1 -p 3004:3001 \
  -e HTTP_BOOTSTRAP_PEERS=bootstrap-node \
  -e BOOTSTRAP_PUBLIC_URL=http://host.docker.internal:3004 \
  -e ENABLE_PEER_PROMOTION=true \
  verimutfs-node

# Stop genesis
docker stop genesis

# Wait 90s... peer1 should promote
docker logs peer1
# Should see: "🚀 All bootstraps offline, promoting..."
```

---

## Production Deployment

### Docker Compose with Traefik (Reverse Proxy)

```yaml
version: '3.8'

services:
  verimutfs-bootstrap:
    image: verimutfs-node
    environment:
      - ENABLE_VNS=true
      - BOOTSTRAP_PUBLIC_URL=https://bootstrap.yourdomain.com
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.verimutfs.rule=Host(`bootstrap.yourdomain.com`)"
      - "traefik.http.services.verimutfs.loadbalancer.server.port=3001"
    volumes:
      - /var/verimutfs/data:/data
    restart: unless-stopped

  traefik:
    image: traefik:v2.10
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./traefik.yml:/etc/traefik/traefik.yml
    restart: unless-stopped
```

### Health Checks

```dockerfile
# Add to Dockerfile
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/status', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs verimutfs-node

# Common issues:
# - Port already in use: Change -p 3001:3001 to -p 3002:3001
# - Permission denied: Use sudo or add user to docker group
```

### Can't Connect to Genesis Bootstrap

```bash
# From inside container
docker exec -it verimutfs-peer sh
curl http://host.docker.internal:3001/api/status

# If fails, check network:
docker network inspect bridge
```

### Data Not Persisting

```bash
# Check volume
docker volume inspect verimutfs-data

# Backup volume
docker run --rm -v verimutfs-data:/data -v $(pwd):/backup alpine tar czf /backup/verimutfs-backup.tar.gz -C /data .

# Restore volume
docker run --rm -v verimutfs-data:/data -v $(pwd):/backup alpine tar xzf /backup/verimutfs-backup.tar.gz -C /data
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENABLE_VNS` | Yes | `false` | Enable Verimut Name Service |
| `BOOTSTRAP_PUBLIC_URL` | Bootstrap only | - | Public URL for VNS registration |
| `HTTP_BOOTSTRAP_PEERS` | Peers | - | Bootstrap discovery (e.g., `bootstrap-node`) |
| `ENABLE_PEER_PROMOTION` | Optional | `true` | Allow peer-to-bootstrap promotion |
| `API_PORT` | Optional | `3001` | HTTP API port |
| `DATA_DIR` | Optional | `/data` | Data directory path |
| `VERBOSE` | Optional | `false` | Detailed logging |

---

## Next Steps

1. **Deploy genesis bootstrap** on a VPS
2. **Test with Docker locally** (docker-compose up)
3. **Deploy secondary bootstraps** on other servers
4. **Invite friends** to join as peers
5. **Monitor mesh sync** logs for replication

Your network is Docker-ready! 🐳
