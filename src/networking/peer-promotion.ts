/**
 * Peer-to-Bootstrap Promotion System
 * 
 * Allows regular peers to detect bootstrap failures and self-promote
 * to become bootstrap nodes for their connected peers.
 * 
 * This creates a self-healing network where peers can step up
 * to prevent network fragmentation when bootstraps go offline.
 */

import { registerAsBootstrap } from './bootstrap-discovery.js';

export interface PeerPromotionConfig {
  /** Enable automatic promotion */
  enabled?: boolean;
  /** How long to wait before checking bootstrap health (ms) */
  healthCheckInterval?: number;
  /** How many failed health checks before promoting (consecutive) */
  failureThreshold?: number;
  /** Minimum number of connected peers before promotion */
  minPeersForPromotion?: number;
  /** VNS name to register as when promoted */
  promotionName?: string;
  /** Public URL for this peer (required for promotion) */
  publicUrl?: string;
  /** Enable verbose logging */
  verbose?: boolean;
}

interface BootstrapHealth {
  url: string;
  consecutiveFailures: number;
  lastChecked: number;
  online: boolean;
}

export class PeerPromotionSystem {
  private config: Required<PeerPromotionConfig>;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private bootstrapHealth: Map<string, BootstrapHealth> = new Map();
  private isPromoted: boolean = false;
  private connectedPeerCount: number = 0;

  constructor(config: PeerPromotionConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 30000, // 30 seconds
      failureThreshold: config.failureThreshold ?? 3, // 3 consecutive failures
      minPeersForPromotion: config.minPeersForPromotion ?? 2,
      promotionName: config.promotionName ?? `bootstrap-peer-${this.generatePeerSuffix()}`,
      publicUrl: config.publicUrl ?? '',
      verbose: config.verbose ?? false
    };
  }

  /**
   * Start the peer promotion monitoring system
   */
  start(bootstrapUrls: string[], peerCountGetter: () => number): void {
    if (!this.config.enabled) {
      this.log('Peer promotion disabled');
      return;
    }

    if (!this.config.publicUrl) {
      console.warn('[PeerPromotion] No public URL configured, promotion disabled');
      return;
    }

    this.log('Starting peer promotion system...');

    // Initialize health tracking for all bootstraps
    for (const url of bootstrapUrls) {
      this.bootstrapHealth.set(url, {
        url,
        consecutiveFailures: 0,
        lastChecked: 0,
        online: true
      });
    }

    // Start health check timer
    this.healthCheckTimer = setInterval(async () => {
      this.connectedPeerCount = peerCountGetter();
      await this.checkBootstrapHealth();
    }, this.config.healthCheckInterval);

    this.log(`Monitoring ${bootstrapUrls.length} bootstrap(s) for health`);
  }

  /**
   * Stop the promotion system
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      this.log('Stopped peer promotion system');
    }
  }

  /**
   * Check health of all bootstraps and promote if needed
   */
  private async checkBootstrapHealth(): Promise<void> {
    const fetch = (await import('node-fetch')).default;
    let allOffline = true;

    for (const [url, health] of this.bootstrapHealth) {
      try {
        // Simple health check: try to fetch /api/status
        const response = await fetch(`${url}/api/status`, {
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          // Bootstrap is healthy
          health.consecutiveFailures = 0;
          health.online = true;
          health.lastChecked = Date.now();
          allOffline = false;
        } else {
          health.consecutiveFailures++;
          health.lastChecked = Date.now();
          
          if (health.consecutiveFailures >= this.config.failureThreshold) {
            health.online = false;
            this.log(`✗ Bootstrap ${url} failed ${health.consecutiveFailures} consecutive health checks`);
          }
        }
      } catch (e: any) {
        health.consecutiveFailures++;
        health.lastChecked = Date.now();
        
        if (health.consecutiveFailures >= this.config.failureThreshold) {
          health.online = false;
          this.log(`✗ Bootstrap ${url} unreachable (${e.message})`);
        }
      }
    }

    // Check if we should promote
    if (allOffline && !this.isPromoted) {
      await this.attemptPromotion();
    } else if (!allOffline && this.isPromoted) {
      this.log('Bootstraps recovered, staying promoted but yielding priority');
      // Could implement demotion logic here if desired
    }
  }

  /**
   * Attempt to promote this peer to bootstrap status
   */
  private async attemptPromotion(): Promise<void> {
    // Check prerequisites
    if (this.connectedPeerCount < this.config.minPeersForPromotion) {
      this.log(`Cannot promote: only ${this.connectedPeerCount} peer(s) connected (need ${this.config.minPeersForPromotion})`);
      return;
    }

    this.log(`🚀 All bootstraps offline, promoting to bootstrap status...`);
    this.log(`   Connected peers: ${this.connectedPeerCount}`);
    this.log(`   Will register as: ${this.config.promotionName}`);

    try {
      // Register as bootstrap in VNS
      const success = await registerAsBootstrap(
        this.config.promotionName,
        this.config.publicUrl
      );

      if (success) {
        this.isPromoted = true;
        console.log(`[PeerPromotion] ✅ Successfully promoted to bootstrap: ${this.config.promotionName}`);
        console.log(`[PeerPromotion]    Peers can now discover this node via VNS`);
        console.log(`[PeerPromotion]    Serving ${this.connectedPeerCount} connected peer(s)`);
      } else {
        console.error('[PeerPromotion] ✗ Failed to register as bootstrap');
      }
    } catch (e: any) {
      console.error('[PeerPromotion] ✗ Promotion failed:', e.message);
    }
  }

  /**
   * Manually trigger promotion (for testing or explicit control)
   */
  async promoteNow(): Promise<boolean> {
    if (this.isPromoted) {
      this.log('Already promoted');
      return true;
    }

    await this.attemptPromotion();
    return this.isPromoted;
  }

  /**
   * Check if this peer is currently promoted
   */
  isPromotedToBootstrap(): boolean {
    return this.isPromoted;
  }

  /**
   * Get status of all bootstraps
   */
  getBootstrapStatus(): Array<{ url: string; online: boolean; failures: number; lastChecked: number }> {
    return Array.from(this.bootstrapHealth.values()).map(h => ({
      url: h.url,
      online: h.online,
      failures: h.consecutiveFailures,
      lastChecked: h.lastChecked
    }));
  }

  /**
   * Generate a unique suffix for promoted peer bootstrap name
   */
  private generatePeerSuffix(): string {
    // Use timestamp + random for uniqueness
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${timestamp}${random}`;
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[PeerPromotion] ${message}`);
    }
  }
}
