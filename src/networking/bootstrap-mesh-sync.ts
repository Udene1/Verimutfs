/**
 * Bootstrap Mesh Synchronization
 * 
 * Enables bootstraps to discover each other and sync:
 * - VNS entries (names, records, metadata)
 * - Content blocks (CIDs that peers need)
 * 
 * This creates a self-healing mesh where bootstraps maintain
 * eventual consistency without central coordination.
 */

import type { VerimutSync } from '../sync.js';

export interface BootstrapMeshConfig {
  /** How often to sync with other bootstraps (milliseconds) */
  syncInterval?: number;
  /** VNS name pattern to discover other bootstraps (e.g., "bootstrap-node-*") */
  bootstrapPattern?: string;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Local VNS API endpoint */
  vnsApiUrl?: string;
  /** Public URL for this bootstrap (to skip self-sync) */
  publicUrl?: string;
}

interface BootstrapPeer {
  name: string;
  url: string;
  lastSeen: number;
  online: boolean;
}

export class BootstrapMeshSync {
  private syncTimer: NodeJS.Timeout | null = null;
  private discoveredBootstraps: Map<string, BootstrapPeer> = new Map();
  private config: Required<BootstrapMeshConfig>;
  private verimutSync: VerimutSync | null = null;

  constructor(config: BootstrapMeshConfig = {}) {
    this.config = {
      syncInterval: config.syncInterval ?? 60000, // 1 minute default
      bootstrapPattern: config.bootstrapPattern ?? 'bootstrap-node',
      verbose: config.verbose ?? false,
      vnsApiUrl: config.vnsApiUrl ?? 'http://localhost:3001',
      publicUrl: config.publicUrl ?? ''
    };
  }

  /**
   * Start the mesh sync background task
   */
  start(verimutSync: VerimutSync): void {
    this.verimutSync = verimutSync;
    this.log('Starting bootstrap mesh sync...');
    
    // Initial discovery
    this.discoverAndSync().catch(e => {
      console.error('[BootstrapMesh] Initial sync failed:', e.message);
    });

    // Periodic sync
    this.syncTimer = setInterval(() => {
      this.discoverAndSync().catch(e => {
        console.error('[BootstrapMesh] Periodic sync failed:', e.message);
      });
    }, this.config.syncInterval);

    this.log(`Mesh sync running (interval: ${this.config.syncInterval}ms)`);
  }

  /**
   * Stop the mesh sync
   */
  stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      this.log('Stopped mesh sync');
    }
  }

  /**
   * Discover other bootstraps via VNS and sync with them
   */
  private async discoverAndSync(): Promise<void> {
    try {
      // Step 1: Discover other bootstrap nodes via VNS
      await this.discoverBootstraps();

      // Step 2: Sync VNS entries with each bootstrap
      await this.syncVNSEntries();

      // Step 3: Sync missing content blocks
      await this.syncContentBlocks();

    } catch (e: any) {
      console.error('[BootstrapMesh] Sync cycle failed:', e.message);
    }
  }

  /**
   * Query VNS to find other bootstrap nodes
   */
  private async discoverBootstraps(): Promise<void> {
    try {
      // Query local VNS for all entries
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${this.config.vnsApiUrl}/api/vns/list`);
      
      if (!response.ok) {
        console.warn('[BootstrapMesh] Failed to query VNS list');
        return;
      }

      const data = await response.json() as any;
      const entries = data.entries || [];

      // Filter for bootstrap nodes
      const bootstraps = entries.filter((entry: any) => 
        entry.name.startsWith(this.config.bootstrapPattern)
      );

      // Update discovered bootstraps
      let selfCount = 0;
      let peerCount = 0;
      
      for (const entry of bootstraps) {
        const txtRecord = entry.records?.find((r: any) => r.type === 'TXT');
        if (txtRecord && txtRecord.value) {
          // Check if this is our own URL
          const isSelf = txtRecord.value === this.config.vnsApiUrl;
          
          const existing = this.discoveredBootstraps.get(entry.name);
          this.discoveredBootstraps.set(entry.name, {
            name: entry.name,
            url: txtRecord.value,
            lastSeen: Date.now(),
            online: existing?.online ?? true
          });
          
          if (isSelf) {
            selfCount++;
          } else {
            peerCount++;
          }
        }
      }

      this.log(`Discovered ${this.discoveredBootstraps.size} bootstrap(s) in VNS (${peerCount} peer(s), ${selfCount} self)`);
    } catch (e: any) {
      console.error('[BootstrapMesh] Bootstrap discovery failed:', e.message);
    }
  }

  /**
   * Sync VNS entries with other bootstraps
   */
  private async syncVNSEntries(): Promise<void> {
    if (this.discoveredBootstraps.size === 0) {
      this.log('No other bootstraps discovered, skipping VNS sync');
      return;
    }

    const fetch = (await import('node-fetch')).default;

    for (const [name, bootstrap] of this.discoveredBootstraps) {
      try {
        // Skip if this is our own URL (self-sync)
        // Check both local VNS API URL and public URL
        if (bootstrap.url === this.config.vnsApiUrl || 
            (this.config.publicUrl && bootstrap.url === this.config.publicUrl)) {
          this.log(`Skipping self-sync with ${name} (${bootstrap.url})`);
          continue;
        }

        // Fetch their VNS entries
        const response = await fetch(`${bootstrap.url}/api/vns/list`, {
          signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
          this.markOffline(name);
          continue;
        }

        const data = await response.json() as any;
        const theirEntries = data.entries || [];

        this.log(`Fetched ${theirEntries.length} VNS entries from ${name}`);

        // Merge entries we don't have
        let mergedCount = 0;
        for (const entry of theirEntries) {
          const merged = await this.mergeVNSEntry(entry);
          if (merged) mergedCount++;
        }

        if (mergedCount > 0) {
          this.log(`✓ Merged ${mergedCount} new VNS entries from ${name}`);
        }

        this.markOnline(name);

      } catch (e: any) {
        this.markOffline(name);
        console.warn(`[BootstrapMesh] Failed to sync VNS with ${name}:`, e.message);
      }
    }
  }

  /**
   * Merge a VNS entry from another bootstrap
   */
  private async mergeVNSEntry(entry: any): Promise<boolean> {
    try {
      const fetch = (await import('node-fetch')).default;

      // Check if we already have this entry
      const checkResponse = await fetch(
        `${this.config.vnsApiUrl}/api/vns/resolve/${entry.name}`
      );

      if (checkResponse.ok) {
        const existing = await checkResponse.json() as any;
        
        // Compare timestamps (LWW)
        if (existing.entry && existing.entry.timestamp >= entry.timestamp) {
          return false; // We have newer or equal version
        }
      }

      // Register the entry locally (will trigger delta propagation)
      const registerResponse = await fetch(
        `${this.config.vnsApiUrl}/api/vns/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: entry.name,
            owner: entry.owner,
            records: entry.records,
            timestamp: entry.timestamp,
            expires: entry.expires,
            nonce: entry.nonce,
            signature: entry.signature,
            publicKey: entry.publicKey
          })
        }
      );

      return registerResponse.ok;
    } catch (e: any) {
      console.warn('[BootstrapMesh] Failed to merge VNS entry:', e.message);
      return false;
    }
  }

  /**
   * Sync missing content blocks with other bootstraps
   */
  private async syncContentBlocks(): Promise<void> {
    if (!this.verimutSync || this.discoveredBootstraps.size === 0) {
      return;
    }

    this.log('Starting content block sync...');

    const fetch = (await import('node-fetch')).default;

    for (const [name, bootstrap] of this.discoveredBootstraps) {
      if (!bootstrap.online) continue;

      try {
        // Get their block list (manifest)
        const response = await fetch(`${bootstrap.url}/api/blocks/manifest`, {
          signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) continue;

        const data = await response.json() as any;
        const theirBlocks = data.blocks || [];

        // Find blocks we're missing
        let fetchedCount = 0;
        for (const cid of theirBlocks) {
          const hasCID = await this.verimutSync.blockstore.has(cid);
          if (!hasCID) {
            const fetched = await this.fetchBlock(bootstrap.url, cid);
            if (fetched) fetchedCount++;
          }
        }

        if (fetchedCount > 0) {
          this.log(`✓ Fetched ${fetchedCount} missing blocks from ${name}`);
        }

      } catch (e: any) {
        console.warn(`[BootstrapMesh] Failed to sync blocks with ${name}:`, e.message);
      }
    }
  }

  /**
   * Fetch a single block from another bootstrap
   */
  private async fetchBlock(bootstrapUrl: string, cid: string): Promise<boolean> {
    try {
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${bootstrapUrl}/api/blocks/${cid}`, {
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) return false;

      const blockData = await response.arrayBuffer();
      
      if (this.verimutSync) {
        // Store the block locally
        await this.verimutSync.blockstore.put(cid as any, new Uint8Array(blockData));
        return true;
      }

      return false;
    } catch (e: any) {
      return false;
    }
  }

  /**
   * Mark a bootstrap as online
   */
  private markOnline(name: string): void {
    const bootstrap = this.discoveredBootstraps.get(name);
    if (bootstrap) {
      bootstrap.online = true;
      bootstrap.lastSeen = Date.now();
    }
  }

  /**
   * Mark a bootstrap as offline
   */
  private markOffline(name: string): void {
    const bootstrap = this.discoveredBootstraps.get(name);
    if (bootstrap && bootstrap.online) {
      bootstrap.online = false;
      this.log(`✗ Bootstrap ${name} is offline`);
    }
  }

  /**
   * Get list of online bootstraps
   */
  getOnlineBootstraps(): BootstrapPeer[] {
    return Array.from(this.discoveredBootstraps.values())
      .filter(b => b.online);
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[BootstrapMesh] ${message}`);
    }
  }
}
