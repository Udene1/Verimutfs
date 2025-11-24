/**
 * HTTP-based P2P Communication Module
 * 
 * Provides HTTP-based delta propagation for multi-node VNS sync.
 * This module enables peer discovery and VNS synchronization via HTTP.
 * 
 * Architecture:
 * - Integrates with VerimutSync via standard interface
 * - Uses HTTP POST to push deltas to bootstrap peers
 * - Uses HTTP GET to pull VNS entries from bootstrap peers
 * - Receives deltas via /api/vns/push-delta endpoint
 * - Maintains same security model (Ed25519, PoW, LWW)
 */

export interface HTTPP2PConfig {
  /**
   * Bootstrap peer URLs for HTTP-based communication
   * Example: ['http://node1.example.com:3001', 'http://node2.example.com:3001']
   */
  bootstrapPeers: string[];

  /**
   * Local peer ID for identifying the source of deltas (optional)
   */
  peerId?: any;

  /**
   * Enable verbose logging
   */
  verbose?: boolean;
}

export interface VNSDelta {
  type: 'register' | 'update' | 'expire';
  entry: any;
  peerId: string;
  timestamp: number;
  fromPeer?: string;
}

/**
 * HTTP P2P Manager
 * Handles HTTP-based delta propagation to other nodes
 */
export class HTTPP2P {
  private bootstrapPeers: string[];
  private peerId?: any;
  private verbose: boolean;

  constructor(config: HTTPP2PConfig) {
    this.bootstrapPeers = config.bootstrapPeers;
    this.peerId = config.peerId;
    this.verbose = config.verbose ?? false;

    if (this.verbose) {
      console.log(`[HTTPP2P] Initialized with ${this.bootstrapPeers.length} bootstrap peer(s)`);
    }
  }

  /**
   * Push a VNS delta to all bootstrap peers via HTTP POST
   */
  async pushDelta(delta: VNSDelta): Promise<{ success: boolean; results: Array<{ peer: string; success: boolean; error?: string }> }> {
    const results: Array<{ peer: string; success: boolean; error?: string }> = [];

    if (this.bootstrapPeers.length === 0) {
      if (this.verbose) {
        console.warn('[HTTPP2P] No bootstrap peers configured, skipping HTTP push');
      }
      return { success: false, results };
    }

    if (this.verbose) {
      console.log(`[HTTPP2P] Pushing delta to ${this.bootstrapPeers.length} peer(s): ${delta.type} for ${delta.entry.name}`);
    }

    // Add source peer ID to delta
    const deltaWithPeer = {
      ...delta,
      fromPeer: this.peerId?.toString() || 'unknown'
    };

    // Push to all bootstrap peers in parallel
    const pushPromises = this.bootstrapPeers.map(async (peerUrl) => {
      try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`${peerUrl}/api/vns/push-delta`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deltaWithPeer),
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        if (response.ok) {
          if (this.verbose) {
            console.log(`[HTTPP2P] ✓ Successfully pushed to ${peerUrl}`);
          }
          results.push({ peer: peerUrl, success: true });
          return true;
        } else {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.warn(`[HTTPP2P] ✗ Failed to push to ${peerUrl}: ${response.status} ${errorText}`);
          results.push({ peer: peerUrl, success: false, error: `HTTP ${response.status}` });
          return false;
        }
      } catch (e: any) {
        console.warn(`[HTTPP2P] ✗ Error pushing to ${peerUrl}:`, e.message);
        results.push({ peer: peerUrl, success: false, error: e.message });
        return false;
      }
    });

    const pushResults = await Promise.allSettled(pushPromises);
    const successCount = pushResults.filter(r => r.status === 'fulfilled' && r.value).length;

    if (this.verbose) {
      console.log(`[HTTPP2P] Push completed: ${successCount}/${this.bootstrapPeers.length} successful`);
    }

    return {
      success: successCount > 0,
      results
    };
  }

  /**
   * Update bootstrap peers list
   */
  updateBootstrapPeers(peers: string[]): void {
    this.bootstrapPeers = peers;
    if (this.verbose) {
      console.log(`[HTTPP2P] Updated bootstrap peers: ${peers.length} peer(s)`);
    }
  }

  /**
   * Get current bootstrap peers
   */
  getBootstrapPeers(): string[] {
    return [...this.bootstrapPeers];
  }

  /**
   * Check if HTTP P2P is available (has bootstrap peers)
   */
  isAvailable(): boolean {
    return this.bootstrapPeers.length > 0;
  }

  /**
   * Sync VNS entries from a bootstrap node
   * Pulls all VNS entries and applies them locally
   */
  async syncVNSFromBootstrap(bootstrapUrl: string, vnsStore: any): Promise<{ success: boolean; entriesSync: number; error?: string }> {
    try {
      if (this.verbose) {
        console.log(`[HTTPP2P] Syncing VNS from ${bootstrapUrl}...`);
      }

      const fetch = (await import('node-fetch')).default;

      // Try to get VNS peers endpoint
      const response = await fetch(`${bootstrapUrl}/api/vns/peers`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: any = await response.json();

      if (!data.success || !data.peers) {
        throw new Error('Invalid response format');
      }

      let syncedCount = 0;

      // Apply each VNS entry as a delta
      for (const peer of data.peers) {
        try {
          // Create a delta from the peer entry
          const delta: VNSDelta = {
            type: 'register',
            entry: {
              name: peer.vfsName,
              registration: {
                name: peer.vfsName,
                owner: peer.publicKey || 'unknown',
                records: [
                  { type: 'IP', value: peer.ip },
                  { type: 'PORT', value: peer.port.toString() },
                  { type: 'ROLE', value: peer.role || 'peer' }
                ],
                nonce: 0,
                timestamp: peer.timestamp,
                expires: peer.timestamp + (365 * 24 * 60 * 60 * 1000), // 1 year
                signature: '',
                publicKey: peer.publicKey || ''
              },
              cid: '',
              lastModified: peer.timestamp,
              version: 1
            },
            peerId: 'bootstrap-sync',
            timestamp: Date.now(),
            fromPeer: bootstrapUrl
          };

          // Apply delta to local VNS store
          await vnsStore.applyDelta(delta);
          syncedCount++;
        } catch (e: any) {
          if (this.verbose) {
            console.warn(`[HTTPP2P] Failed to sync entry ${peer.vfsName}:`, e.message);
          }
        }
      }

      if (this.verbose) {
        console.log(`[HTTPP2P] ✓ Synced ${syncedCount} VNS entries from ${bootstrapUrl}`);
      }

      return { success: true, entriesSync: syncedCount };
    } catch (e: any) {
      console.error(`[HTTPP2P] ✗ Failed to sync from ${bootstrapUrl}:`, e.message);
      return { success: false, entriesSync: 0, error: e.message };
    }
  }

  /**
   * Sync VNS from all bootstrap peers
   */
  async syncFromAllBootstraps(vnsStore: any): Promise<void> {
    if (this.bootstrapPeers.length === 0) {
      if (this.verbose) {
        console.log('[HTTPP2P] No bootstrap peers to sync from');
      }
      return;
    }

    if (this.verbose) {
      console.log(`[HTTPP2P] Starting VNS sync from ${this.bootstrapPeers.length} bootstrap(s)...`);
    }

    const syncPromises = this.bootstrapPeers.map(url =>
      this.syncVNSFromBootstrap(url, vnsStore)
    );

    const results = await Promise.allSettled(syncPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    if (this.verbose) {
      console.log(`[HTTPP2P] VNS sync complete: ${successCount}/${this.bootstrapPeers.length} successful`);
    }
  }

  /**
   * Start periodic VNS sync from bootstrap nodes
   * @param vnsStore VNS namespace store instance
   * @param intervalMs Sync interval in milliseconds (default: 60000 = 1 minute)
   */
  startPeriodicSync(vnsStore: any, intervalMs: number = 60000): NodeJS.Timeout {
    if (this.verbose) {
      console.log(`[HTTPP2P] Starting periodic VNS sync (interval: ${intervalMs}ms)`);
    }

    // Initial sync
    this.syncFromAllBootstraps(vnsStore).catch(e => {
      console.error('[HTTPP2P] Initial sync failed:', e);
    });

    // Periodic sync
    return setInterval(() => {
      this.syncFromAllBootstraps(vnsStore).catch(e => {
        console.error('[HTTPP2P] Periodic sync failed:', e);
      });
    }, intervalMs);
  }
}

/**
 * Factory function to create HTTPP2P instance
 */
export function createHTTPP2P(config: HTTPP2PConfig): HTTPP2P {
  return new HTTPP2P(config);
}

/**
 * Parse HTTP_BOOTSTRAP_PEERS environment variable
 * Supports comma-separated URLs and validates format
 */
export function parseBootstrapPeers(envVar: string | undefined): string[] {
  if (!envVar) return [];

  return envVar
    .split(',')
    .map(url => url.trim())
    .filter(url => {
      // Validate URL format
      try {
        new URL(url);
        return true;
      } catch {
        console.warn(`[HTTPP2P] Invalid bootstrap peer URL: ${url}`);
        return false;
      }
    });
}
