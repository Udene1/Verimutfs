# Relay Node Setup Guide

Complete guide for setting up and running VerimutFS relay nodes.

---

## What is a Relay Node?

A **relay node** is a publicly accessible node that:
- Acts as a discovery point for other nodes
- Forwards VNS deltas between peers
- Provides bootstrap functionality
- Helps nodes behind NAT/firewalls connect

---

## Prerequisites

- Linux/Ubuntu server (or GCP/AWS instance)
- Public IP address
- Port 3001 open in firewall
- Node.js 20+
- 2GB+ RAM recommended

---

## Quick Setup

### 1. Clone Repository

```bash
git clone https://github.com/Udene1/veri.git
cd veri
```

### 2. Install Dependencies

```bash
npm install
npm run build
```

### 3. Configure Environment

```bash
cp .env.example .env
nano .env
```

**Required settings**:
```bash
NODE_ENV=production
API_PORT=3001

# VNS Configuration
ENABLE_VNS=true
VFS_NAME=relay-node-1  # Change to unique name

# Public URL (IMPORTANT!)
BOOTSTRAP_PUBLIC_URL=http://YOUR_PUBLIC_IP:3001

# Blockchain
RPC_URL=https://sepolia.base.org
GASLESS_PAYMENT_CONTRACT=0xA29FC36cB931E5FAd3e825BaF0a3be176eAeA683
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e

# Logging
VERBOSE=true
LOG_LEVEL=info
```

### 4. Start Relay Node

```bash
chmod +x start-relay.sh
./start-relay.sh
```

---

## Production Deployment

### Using PM2

```bash
# Install PM2
sudo npm install -g pm2

# Start relay node
pm2 start dist/cli.js --name verimutfs-relay -- --enable-vns --api-port 3001 --verbose

# Save configuration
pm2 save

# Setup auto-start on reboot
pm2 startup
```

### Using Systemd

Create `/etc/systemd/system/verimutfs-relay.service`:

```ini
[Unit]
Description=VerimutFS Relay Node
After=network.target

[Service]
Type=simple
User=verimut
WorkingDirectory=/opt/verimutfs
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/cli.js --enable-vns --api-port 3001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable verimutfs-relay
sudo systemctl start verimutfs-relay
sudo systemctl status verimutfs-relay
```

---

## Firewall Configuration

### UFW (Ubuntu)

```bash
sudo ufw allow 3001/tcp
sudo ufw reload
```

### iptables

```bash
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT
sudo iptables-save > /etc/iptables/rules.v4
```

### Google Cloud

```bash
gcloud compute firewall-rules create allow-verimutfs-relay \
  --allow tcp:3001 \
  --description="VerimutFS relay node"
```

### AWS

```bash
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxxxx \
  --protocol tcp \
  --port 3001 \
  --cidr 0.0.0.0/0
```

---

## Monitoring

### Check Node Status

```bash
# API status
curl http://localhost:3001/api/status

# VNS status
curl http://localhost:3001/api/vns/status

# Check registered peers
curl http://localhost:3001/api/vns/peers
```

### View Logs

**PM2**:
```bash
pm2 logs verimutfs-relay
```

**Systemd**:
```bash
sudo journalctl -u verimutfs-relay -f
```

### Health Check Script

Create `health-check.sh`:
```bash
#!/bin/bash
STATUS=$(curl -s http://localhost:3001/api/status | jq -r '.status')
if [ "$STATUS" != "running" ]; then
  echo "Node is down! Restarting..."
  pm2 restart verimutfs-relay
fi
```

Add to crontab:
```bash
*/5 * * * * /opt/verimutfs/health-check.sh
```

---

## Connecting Peer Nodes

Other nodes can connect to your relay:

```bash
# Via environment variable
export HTTP_BOOTSTRAP_PEERS=http://YOUR_RELAY_IP:3001

# Or in .env
HTTP_BOOTSTRAP_PEERS=http://YOUR_RELAY_IP:3001
```

---

## Multiple Relay Nodes

For redundancy, run multiple relays:

```bash
# Peer nodes can specify multiple bootstraps
HTTP_BOOTSTRAP_PEERS=http://relay1.example.com:3001,http://relay2.example.com:3001
```

---

## Performance Tuning

### For High Traffic

```bash
# Increase Node.js memory
node --max-old-space-size=4096 dist/cli.js --enable-vns --api-port 3001
```

### Rate Limiting

Add to `.env`:
```bash
RATE_LIMIT_MAX=100  # requests per minute
RATE_LIMIT_WINDOW=60000  # 1 minute
```

---

## Security Best Practices

1. **Use HTTPS in production**
   - Set up reverse proxy (Nginx/Caddy)
   - Use Let's Encrypt for SSL

2. **Firewall**
   - Only open port 3001
   - Use fail2ban for DDoS protection

3. **Updates**
   - Regularly update Node.js
   - Pull latest code weekly

4. **Monitoring**
   - Set up alerts for downtime
   - Monitor disk space and memory

---

## Troubleshooting

### Node Won't Start

```bash
# Check if port is in use
sudo lsof -i :3001

# Check logs
pm2 logs verimutfs-relay --lines 100
```

### Peers Can't Connect

```bash
# Test from external machine
curl http://YOUR_PUBLIC_IP:3001/api/status

# Check firewall
sudo ufw status
```

### High Memory Usage

```bash
# Restart node
pm2 restart verimutfs-relay

# Check for memory leaks
pm2 monit
```

---

## Upgrading

```bash
# Stop node
pm2 stop verimutfs-relay

# Pull latest code
git pull

# Install dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart verimutfs-relay
```

---

## Relay Node Checklist

- [ ] Server with public IP
- [ ] Port 3001 open in firewall
- [ ] Node.js 20+ installed
- [ ] Repository cloned and built
- [ ] `.env` configured with public URL
- [ ] PM2 or systemd configured
- [ ] Health monitoring setup
- [ ] SSL certificate (production)
- [ ] Backup strategy
- [ ] Update schedule

---

## Support

- **Documentation**: See `SYSTEM_DOCUMENTATION.md`
- **Issues**: https://github.com/Udene1/veri/issues
- **Community**: Join our Discord

---

**Your relay node is now helping power the VerimutFS network!** 🚀
