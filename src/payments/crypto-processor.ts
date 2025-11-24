/**
 * Crypto Payment Processor
 * Handles gas relaying and payment verification for the VerimutFS network
 */

import { ethers, Wallet, Contract, JsonRpcProvider } from 'ethers';
import * as dotenv from 'dotenv';

dotenv.config();

export interface NetworkConfig {
    rpcUrl: string;
    gaslessContract: string;
    usdcAddress: string;
    chainId: number;
    name: string;
}

export const NETWORKS: Record<string, NetworkConfig> = {
    baseSepolia: {
        rpcUrl: process.env.RPC_URL || 'https://sepolia.base.org',
        gaslessContract: process.env.GASLESS_PAYMENT_CONTRACT || '0xA29FC36cB931E5FAd3e825BaF0a3be176eAeA683',
        usdcAddress: process.env.USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
        chainId: 84532,
        name: 'Base Sepolia'
    },
    polygonAmoy: {
        rpcUrl: process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology',
        gaslessContract: process.env.POLYGON_GASLESS_CONTRACT || '0x4960ed90f6c2821305128485fDa366DD486813e',
        usdcAddress: process.env.POLYGON_USDC_ADDRESS || '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
        chainId: 80002,
        name: 'Polygon Amoy'
    }
};

const GASLESS_PAYMENT_ABI = [
    'function payments(bytes32) view returns (address payer, address payee, address token, uint256 amount, uint8 paymentType, uint8 status, uint256 createdAt, uint256 releasedAt)',
    'function submitPayment(bytes32 paymentId, address payer, address payee, address token, uint256 amount, uint8 paymentType) external',
    'function releasePayment(bytes32 paymentId) external',
    'function refundPayment(bytes32 paymentId) external'
];

export class CryptoProcessor {
    private relayerWallet: Wallet | null = null;
    private providers: Map<string, JsonRpcProvider> = new Map();
    private contracts: Map<string, Contract> = new Map();
    private minBalance: bigint;

    constructor() {
        this.minBalance = ethers.parseEther(process.env.MIN_RELAYER_BALANCE || '0.1');
        this.initialize();
    }

    private initialize() {
        // Initialize relayer wallet if private key is provided
        const privateKey = process.env.RELAYER_PRIVATE_KEY;

        if (privateKey && privateKey !== 'your_private_key_here') {
            try {
                this.relayerWallet = new Wallet(privateKey);
                console.log(`[CryptoProcessor] Relayer wallet initialized: ${this.relayerWallet.address}`);
            } catch (error) {
                console.error('[CryptoProcessor] Failed to initialize relayer wallet:', error);
            }
        } else {
            console.warn('[CryptoProcessor] No relayer private key configured. Gas relaying disabled.');
        }

        // Initialize providers and contracts for each network
        for (const [networkName, config] of Object.entries(NETWORKS)) {
            if (!config.gaslessContract) {
                console.warn(`[CryptoProcessor] No contract address for ${networkName}, skipping`);
                continue;
            }

            try {
                const provider = new JsonRpcProvider(config.rpcUrl);
                this.providers.set(networkName, provider);

                const contract = new Contract(
                    config.gaslessContract,
                    GASLESS_PAYMENT_ABI,
                    provider
                );
                this.contracts.set(networkName, contract);

                console.log(`[CryptoProcessor] Initialized ${config.name} (${networkName})`);
            } catch (error) {
                console.error(`[CryptoProcessor] Failed to initialize ${networkName}:`, error);
            }
        }
    }

    /**
     * Check relayer wallet balance
     */
    async checkRelayerBalance(network: string = 'baseSepolia'): Promise<{ balance: bigint; sufficient: boolean; address: string }> {
        if (!this.relayerWallet) {
            throw new Error('Relayer wallet not configured');
        }

        const provider = this.providers.get(network);
        if (!provider) {
            throw new Error(`Network ${network} not configured`);
        }

        const connectedWallet = this.relayerWallet.connect(provider);
        const balance = await connectedWallet.provider.getBalance(connectedWallet.address);
        const sufficient = balance >= this.minBalance;

        if (!sufficient) {
            console.warn(`[CryptoProcessor] Low relayer balance on ${network}: ${ethers.formatEther(balance)} (min: ${ethers.formatEther(this.minBalance)})`);
        }

        return {
            balance,
            sufficient,
            address: this.relayerWallet.address
        };
    }

    /**
     * Verify a payment on-chain
     */
    async verifyPayment(
        paymentId: string,
        expectedPayer: string,
        expectedAmount: bigint,
        network: string = 'baseSepolia'
    ): Promise<{ valid: boolean; payment?: any; error?: string }> {
        try {
            const contract = this.contracts.get(network);
            if (!contract) {
                return { valid: false, error: `Network ${network} not configured` };
            }

            const payment = await contract.payments(paymentId);

            // Check if payment exists
            if (payment.payer === ethers.ZeroAddress) {
                return { valid: false, error: 'Payment not found' };
            }

            // Verify payer
            if (payment.payer.toLowerCase() !== expectedPayer.toLowerCase()) {
                return { valid: false, error: 'Payer mismatch' };
            }

            // Verify amount
            if (payment.amount < expectedAmount) {
                return { valid: false, error: 'Insufficient amount' };
            }

            // Verify status (1 = Completed)
            if (payment.status !== 1) {
                return { valid: false, error: 'Payment not completed' };
            }

            return {
                valid: true,
                payment: {
                    payer: payment.payer,
                    payee: payment.payee,
                    token: payment.token,
                    amount: payment.amount.toString(),
                    status: payment.status,
                    createdAt: Number(payment.createdAt),
                    releasedAt: Number(payment.releasedAt)
                }
            };
        } catch (error: any) {
            console.error('[CryptoProcessor] Payment verification failed:', error);
            return { valid: false, error: error.message };
        }
    }

    /**
     * Submit a payment on behalf of a user (gas relaying)
     */
    async submitPayment(
        paymentId: string,
        payer: string,
        payee: string,
        amount: bigint,
        paymentType: number = 0,
        network: string = 'baseSepolia'
    ): Promise<{ success: boolean; txHash?: string; error?: string }> {
        try {
            if (!this.relayerWallet) {
                return { success: false, error: 'Relayer wallet not configured' };
            }

            // Check balance
            const { sufficient } = await this.checkRelayerBalance(network);
            if (!sufficient) {
                return { success: false, error: 'Insufficient relayer balance' };
            }

            const provider = this.providers.get(network);
            const contract = this.contracts.get(network);

            if (!provider || !contract) {
                return { success: false, error: `Network ${network} not configured` };
            }

            const config = NETWORKS[network];
            const connectedWallet = this.relayerWallet.connect(provider);
            const connectedContract = contract.connect(connectedWallet) as Contract;

            console.log(`[CryptoProcessor] Submitting payment on ${network}...`);
            console.log(`  Payment ID: ${paymentId}`);
            console.log(`  Payer: ${payer}`);
            console.log(`  Amount: ${ethers.formatUnits(amount, 6)} USDC`);

            const tx = await connectedContract.submitPayment(
                paymentId,
                payer,
                payee,
                config.usdcAddress,
                amount,
                paymentType
            );

            console.log(`[CryptoProcessor] Transaction sent: ${tx.hash}`);

            const receipt = await tx.wait();
            console.log(`[CryptoProcessor] Transaction confirmed in block ${receipt?.blockNumber}`);

            return {
                success: true,
                txHash: tx.hash
            };
        } catch (error: any) {
            console.error('[CryptoProcessor] Payment submission failed:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get relayer address
     */
    getRelayerAddress(): string | null {
        return this.relayerWallet?.address || null;
    }

    /**
     * Check if relayer is configured
     */
    isRelayerConfigured(): boolean {
        return this.relayerWallet !== null;
    }

    /**
     * Get supported networks
     */
    getSupportedNetworks(): string[] {
        return Array.from(this.contracts.keys());
    }
}

// Singleton instance
let cryptoProcessor: CryptoProcessor | null = null;

export function getCryptoProcessor(): CryptoProcessor {
    if (!cryptoProcessor) {
        cryptoProcessor = new CryptoProcessor();
    }
    return cryptoProcessor;
}
