import { HabboCryptoException } from './HabboCryptoException';
import { BigIntegerUtils } from './BigIntegerUtils';
import { HabboRSACrypto } from './HabboRSACrypto';

export class HabboDiffieHellman {
    private static readonly DH_PRIMES_BIT_SIZE = 128;
    private static readonly DH_KEY_BIT_SIZE = 128;

    private readonly crypto: HabboRSACrypto;

    private DHPrime: bigint;
    private DHGenerator: bigint;
    private DHPrivate: bigint;
    private DHPublic: bigint;

    constructor(crypto: HabboRSACrypto) {
        try {
            this.crypto = crypto;
            this.DHPrime = 0n;
            this.DHGenerator = 0n;
            this.DHPrivate = 0n;
            this.DHPublic = 0n;
            this.generateDHPrimes();
            this.generateDHKeys();
        } catch (error) {
            throw new HabboCryptoException(`Constructor initialization failed: ${this.getErrorMessage(error)}`);
        }
    }

    /**
     * Utility method to extract error message
     * @param error The error object
     * @returns A string representation of the error
     */
    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) return error.message;
        return String(error);
    }

    public getDHPrime(): bigint {
        try {
            if (this.DHPrime === 0n) {
                throw new HabboCryptoException('DH Prime not initialized');
            }
            return this.DHPrime;
        } catch (error) {
            throw new HabboCryptoException(`Failed to get DH Prime: ${this.getErrorMessage(error)}`);
        }
    }

    public getDHGenerator(): bigint {
        try {
            if (this.DHGenerator === 0n) {
                throw new HabboCryptoException('DH Generator not initialized');
            }
            return this.DHGenerator;
        } catch (error) {
            throw new HabboCryptoException(`Failed to get DH Generator: ${this.getErrorMessage(error)}`);
        }
    }

    private generateDHPrimes(): void {
        try {
            // Generate probable primes for DH
            this.DHPrime = this.generateProbablePrime(HabboDiffieHellman.DH_PRIMES_BIT_SIZE);
            this.DHGenerator = this.generateProbablePrime(HabboDiffieHellman.DH_PRIMES_BIT_SIZE);

            // Ensure Generator < Prime
            if (this.DHGenerator > this.DHPrime) {
                const temp = this.DHPrime;
                this.DHPrime = this.DHGenerator;
                this.DHGenerator = temp;
            }

            // Additional validation
            if (this.DHPrime <= 2n) {
                throw new HabboCryptoException(`Invalid Prime: Must be > 2. Current: ${this.DHPrime}`);
            }
            if (this.DHGenerator >= this.DHPrime) {
                throw new HabboCryptoException(`Invalid Generator: Must be < Prime. Prime: ${this.DHPrime}, Generator: ${this.DHGenerator}`);
            }
        } catch (error) {
            throw new HabboCryptoException(`Failed to generate DH primes: ${this.getErrorMessage(error)}`);
        }
    }

    private generateDHKeys(): void {
        try {
            if (this.DHPrime === 0n || this.DHGenerator === 0n) {
                throw new HabboCryptoException('DH Primes not initialized before key generation');
            }

            this.DHPrivate = this.generateProbablePrime(HabboDiffieHellman.DH_KEY_BIT_SIZE);
            this.DHPublic = this.modPow(this.DHGenerator, this.DHPrivate, this.DHPrime);

            // Additional validations
            if (this.DHPrivate === 0n) {
                throw new HabboCryptoException('Failed to generate valid private key');
            }
            if (this.DHPublic === 0n) {
                throw new HabboCryptoException('Failed to generate valid public key');
            }
        } catch (error) {
            throw new HabboCryptoException(`Failed to generate DH keys: ${this.getErrorMessage(error)}`);
        }
    }

    private modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
        try {
            if (modulus === 0n) {
                throw new HabboCryptoException('Modulus cannot be zero');
            }

            // Handle edge cases
            if (modulus === 1n) return 0n;
            if (exponent === 0n) return 1n;

            // Apply modulus to base immediately
            base = base % modulus;
            if (base === 0n) return 0n;

            // Square and multiply algorithm
            let result = 1n;
            while (exponent > 0n) {
                // If current exponent bit is 1, multiply result by base
                if (exponent & 1n) {
                    result = (result * base) % modulus;
                }
                // Square the base and reduce by modulus
                base = (base * base) % modulus;
                // Shift exponent right by 1 bit
                exponent >>= 1n;
            }

            return result;
        } catch (error) {
            throw new HabboCryptoException(`ModPow calculation failed: ${this.getErrorMessage(error)}`);
        }
    }

    private async encryptBigInteger(integer: bigint): Promise<string> {
        try {
            if (integer === 0n) {
                throw new HabboCryptoException('Cannot encrypt zero value');
            }

            const str = integer.toString(10);
            const bytes = new TextEncoder().encode(str);
            const encrypted = await this.crypto.sign(bytes);

            // Convert to hex string
            return Array.from(encrypted)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toLowerCase();
        } catch (error) {
            throw new HabboCryptoException(`Failed to encrypt big integer: ${this.getErrorMessage(error)}`);
        }
    }

    private async decryptBigInteger(str: string): Promise<bigint> {
        try {
            if (!str || str.length === 0) {
                throw new HabboCryptoException('Cannot decrypt empty string');
            }

            // Convert hex string to bytes
            const bytes = new Uint8Array(str.length / 2);
            for (let i = 0; i < str.length; i += 2) {
                const byteVal = parseInt(str.substring(i, i + 2), 16);
                if (isNaN(byteVal)) {
                    throw new HabboCryptoException(`Invalid hex string: ${str}`);
                }
                bytes[i / 2] = byteVal;
            }

            // Try with padding type 2 first (more common in client implementations)
            try {
                const decrypted = await this.crypto.decrypt(bytes);
                const intStr = new TextDecoder().decode(decrypted);
                return BigInt(intStr);
            } catch (error) {
                // If padding type 2 fails, try with padding type 1 (verification)
                const decrypted = await this.crypto.verify(bytes);
                const intStr = new TextDecoder().decode(decrypted);
                return BigInt(intStr);
            }
        } catch (error) {
            throw new HabboCryptoException(`Failed to decrypt big integer: ${this.getErrorMessage(error)}`);
        }
    }

    public async getPublicKey(): Promise<string> {
        try {
            if (this.DHPublic === 0n) {
                throw new HabboCryptoException('Public key not initialized');
            }
            return this.encryptBigInteger(this.DHPublic);
        } catch (error) {
            throw new HabboCryptoException(`Failed to get public key: ${this.getErrorMessage(error)}`);
        }
    }

    public async getSignedPrime(): Promise<string> {
        try {
            if (this.DHPrime === 0n) {
                throw new HabboCryptoException('Prime not initialized');
            }
            return this.encryptBigInteger(this.DHPrime);
        } catch (error) {
            throw new HabboCryptoException(`Failed to get signed prime: ${this.getErrorMessage(error)}`);
        }
    }

    public async getSignedGenerator(): Promise<string> {
        try {
            if (this.DHGenerator === 0n) {
                throw new HabboCryptoException('Generator not initialized');
            }
            return this.encryptBigInteger(this.DHGenerator);
        } catch (error) {
            throw new HabboCryptoException(`Failed to get signed generator: ${this.getErrorMessage(error)}`);
        }
    }

    public async doHandshake(signedPrime: string, signedGenerator: string): Promise<void> {
        try {
            if (!signedPrime || !signedGenerator) {
                throw new HabboCryptoException('Signed prime or generator is missing');
            }

            this.DHPrime = await this.decryptBigInteger(signedPrime);
            this.DHGenerator = await this.decryptBigInteger(signedGenerator);

            if (!this.DHPrime || !this.DHGenerator) {
                throw new HabboCryptoException("DHPrime or DHGenerator decryption failed");
            }

            if (this.DHPrime <= 2n) {
                throw new HabboCryptoException(`Prime cannot be <= 2!\nPrime: ${this.DHPrime.toString()}`);
            }

            if (this.DHGenerator >= this.DHPrime) {
                throw new HabboCryptoException(`Generator cannot be >= Prime!\nPrime: ${this.DHPrime.toString()}\nGenerator: ${this.DHGenerator.toString()}`);
            }

            this.generateDHKeys();
        } catch (error) {
            throw new HabboCryptoException(`Handshake failed: ${this.getErrorMessage(error)}`);
        }
    }

    public async getSharedKey(publicKeyStr: string): Promise<Uint8Array> {
        try {
            if (!publicKeyStr) {
                throw new HabboCryptoException('Public key string is empty');
            }

            const publicKey = await this.decryptBigInteger(publicKeyStr);

            if (publicKey === 0n) {
                throw new HabboCryptoException('Decrypted public key is zero');
            }

            const sharedKey = this.modPow(publicKey, this.DHPrivate, this.DHPrime);

            const sharedKeyBytes = BigIntegerUtils.toUnsignedByteArray(sharedKey);

            if (sharedKeyBytes.length === 0) {
                throw new HabboCryptoException('Generated shared key is empty');
            }

            return sharedKeyBytes;
        } catch (error) {
            throw new HabboCryptoException(`Failed to generate shared key: ${this.getErrorMessage(error)}`);
        }
    }

    /**
     * Generate a probable prime number of the specified bit length
     * @param bitLength The bit length
     * @returns A probable prime number
     */
    private generateProbablePrime(bitLength: number): bigint {
        try {
            if (bitLength <= 0) {
                throw new HabboCryptoException('Bit length must be positive');
            }

            // Simple probable prime implementation
            const min = 2n ** BigInt(bitLength - 1);
            const max = 2n ** BigInt(bitLength) - 1n;

            let attempts = 0;
            const MAX_ATTEMPTS = 500; // Prevent infinite loop

            while (attempts < MAX_ATTEMPTS) {
                // Generate a random odd number in the range
                let candidate = this.getRandomBigIntInRange(min, max);
                if (candidate % 2n === 0n) candidate += 1n;

                // Simple primality test (Miller-Rabin would be better for production)
                if (this.isProbablePrime(candidate, 5)) {
                    return candidate;
                }

                attempts++;
            }

            throw new HabboCryptoException(`Failed to generate prime after ${MAX_ATTEMPTS} attempts`);
        } catch (error) {
            throw new HabboCryptoException(`Failed to generate probable prime: ${this.getErrorMessage(error)}`);
        }
    }

    /**
     * Get a random BigInt in the specified range
     * @param min The minimum value (inclusive)
     * @param max The maximum value (inclusive)
     * @returns A random BigInt in the range
     */
    private getRandomBigIntInRange(min: bigint, max: bigint): bigint {
        try {
            if (min > max) {
                throw new HabboCryptoException('Minimum value must be less than or equal to maximum value');
            }

            const range = max - min + 1n;
            const bitsNeeded = range.toString(2).length;
            const bytesNeeded = Math.ceil(bitsNeeded / 8);

            const randomBytes = new Uint8Array(bytesNeeded);
            crypto.getRandomValues(randomBytes);

            let randomValue = 0n;
            for (let i = 0; i < randomBytes.length; i++) {
                randomValue = (randomValue << 8n) + BigInt(randomBytes[i]);
            }

            return min + (randomValue % range);
        } catch (error) {
            throw new HabboCryptoException(`Failed to generate random BigInt: ${this.getErrorMessage(error)}`);
        }
    }

    /**
     * Simple primality test
     * @param n The number to test
     * @param k The number of iterations
     * @returns Whether the number is probably prime
     */
    private isProbablePrime(n: bigint, k: number): boolean {
        try {
            if (n <= 1n) return false;
            if (n <= 3n) return true;
            if (n % 2n === 0n) return false;

            // Validate k
            if (k <= 0) {
                throw new HabboCryptoException('Primality test iterations must be positive');
            }

            // Simple Fermat primality test
            for (let i = 0; i < k; i++) {
                const a = this.getRandomBigIntInRange(2n, n - 2n);
                if (this.modPow(a, n - 1n, n) !== 1n) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            throw new HabboCryptoException(`Primality test failed: ${this.getErrorMessage(error)}`);
        }
    }
}