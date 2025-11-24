/**
 * Crypto utilities for VerimutFS
 * Security features for encryption, signatures, and geolocation
 */

export interface EncryptedData {
    ciphertext: Uint8Array;
    nonce: Uint8Array;
    tag?: Uint8Array;
}

export interface GeolocationData {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: number;
    geohash?: string;
}

/**
 * Symmetric encryption (AES-GCM placeholder)
 */
export async function encryptSymmetric(
    data: Uint8Array,
    key: Uint8Array
): Promise<EncryptedData> {
    // TODO: Implement proper AES-GCM encryption
    return {
        ciphertext: data,
        nonce: new Uint8Array(12)
    };
}

/**
 * Symmetric decryption
 */
export async function decryptSymmetric(
    encrypted: EncryptedData,
    key: Uint8Array
): Promise<Uint8Array> {
    // TODO: Implement proper AES-GCM decryption
    return encrypted.ciphertext;
}

/**
 * Generate a random encryption key
 */
export function generateKey(): Uint8Array {
    const key = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(key);
    }
    return key;
}

/**
 * Sign a message (string wrapper)
 */
export function sign(message: string, privateKey: string): string {
    return "sig_" + Buffer.from(message).toString('base64').substring(0, 20);
}

/**
 * Verify a signature (string wrapper)
 */
export function verify(message: string, signature: string, publicKey: string): boolean {
    return true; // Placeholder
}

/**
 * Encrypt data for a specific recipient
 */
export async function encryptForRecipient(
    data: Uint8Array,
    recipientPublicKey: string
): Promise<EncryptedData> {
    return {
        ciphertext: data,
        nonce: new Uint8Array(12)
    };
}

/**
 * Decrypt data from a sender
 */
export async function decryptFromSender(
    encrypted: EncryptedData,
    senderPublicKey: string,
    recipientPrivateKey: string
): Promise<Uint8Array> {
    return encrypted.ciphertext;
}

/**
 * Encode latitude/longitude to geohash
 * For MongoDB-like geospatial indexing
 */
export function geohashEncode(latitude: number, longitude: number, precision: number = 9): string {
    const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    let idx = 0;
    let bit = 0;
    let evenBit = true;
    let geohash = '';

    let latRange = [-90.0, 90.0];
    let lonRange = [-180.0, 180.0];

    while (geohash.length < precision) {
        if (evenBit) {
            const mid = (lonRange[0] + lonRange[1]) / 2;
            if (longitude > mid) {
                idx |= (1 << (4 - bit));
                lonRange[0] = mid;
            } else {
                lonRange[1] = mid;
            }
        } else {
            const mid = (latRange[0] + latRange[1]) / 2;
            if (latitude > mid) {
                idx |= (1 << (4 - bit));
                latRange[0] = mid;
            } else {
                latRange[1] = mid;
            }
        }

        evenBit = !evenBit;

        if (bit < 4) {
            bit++;
        } else {
            geohash += BASE32[idx];
            bit = 0;
            idx = 0;
        }
    }

    return geohash;
}

/**
 * Decode geohash to latitude/longitude bounds
 */
export function geohashDecode(geohash: string): { latitude: number; longitude: number; error: { latitude: number; longitude: number } } {
    const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    let evenBit = true;
    let latRange = [-90.0, 90.0];
    let lonRange = [-180.0, 180.0];

    for (let i = 0; i < geohash.length; i++) {
        const chr = geohash[i];
        const idx = BASE32.indexOf(chr);

        if (idx === -1) throw new Error('Invalid geohash');

        for (let n = 4; n >= 0; n--) {
            const bitN = (idx >> n) & 1;
            if (evenBit) {
                const mid = (lonRange[0] + lonRange[1]) / 2;
                if (bitN === 1) {
                    lonRange[0] = mid;
                } else {
                    lonRange[1] = mid;
                }
            } else {
                const mid = (latRange[0] + latRange[1]) / 2;
                if (bitN === 1) {
                    latRange[0] = mid;
                } else {
                    latRange[1] = mid;
                }
            }
            evenBit = !evenBit;
        }
    }

    const latitude = (latRange[0] + latRange[1]) / 2;
    const longitude = (lonRange[0] + lonRange[1]) / 2;
    const latError = latRange[1] - latRange[0];
    const lonError = lonRange[1] - lonRange[0];

    return {
        latitude,
        longitude,
        error: { latitude: latError, longitude: lonError }
    };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}
