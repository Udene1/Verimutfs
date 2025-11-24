/**
 * Peer networking stub
 * HTTP P2P is now handled by http-p2p.ts
 */

export interface PeerInfo {
  id: string;
  addresses: string[];
}

export interface NodeBundle {
  helia: any;
  fs: any;
  libp2p?: any;
  verimut?: any;
}

export async function createPeer(): Promise<any> {
  console.log('[Peer] Using HTTP P2P - libp2p peer creation skipped');
  return null;
}

export async function stopNode(): Promise<void> {
  console.log('[Peer] Stopping node - HTTP P2P cleanup');
}

export async function createNode(dataDir?: string): Promise<NodeBundle | null> {
  console.log('[Peer] Using HTTP P2P - createNode() returns null');
  return null;
}
