import { HabboCryptoException } from './HabboCryptoException';
import { BigIntegerUtils } from './BigIntegerUtils';

export class HabboRSACrypto {
    private readonly e: bigint;
    private readonly n: bigint;
    private readonly d: bigint | null;
    private readonly blockSize: number;

    constructor(e: string, n: string);
    constructor(e: string, n: string, d: string);
    constructor(e: string, n: string, d?: string) {
        this.e = BigInt(`0x${e}`);
        this.n = BigInt(`0x${n}`);
        this.d = d ? BigInt(`0x${d}`) : null;
        this.blockSize = Math.floor((this.n.toString(2).length + 7) / 8);
    }

    public async encrypt(data: Uint8Array): Promise<Uint8Array> {
        return this.doEncrypt(data, true, 2);
    }

    public async decrypt(data: Uint8Array): Promise<Uint8Array> {
        return this.doDecrypt(data, false, 2);
    }

    public async sign(data: Uint8Array): Promise<Uint8Array> {
        return this.doEncrypt(data, false, 1);
    }

    public async verify(data: Uint8Array): Promise<Uint8Array> {
        return this.doDecrypt(data, true, 1);
    }

    private doPublic(x: bigint): bigint {
        return this.modPow(x, this.e, this.n);
    }

    private doPrivate(x: bigint): bigint {
        if (!this.d) {
            throw new HabboCryptoException("Private key not available");
        }
        return this.modPow(x, this.d, this.n);
    }

    private modPow(base: bigint, exponent: bigint, modulus: bigint): bigint {
        // Simple modular exponentiation implementation
        let result = 1n;
        base = base % modulus;

        while (exponent > 0n) {
            if (exponent % 2n === 1n) {
                result = (result * base) % modulus;
            }
            exponent = exponent >> 1n;
            base = (base * base) % modulus;
        }

        return result;
    }

    private async doEncrypt(data: Uint8Array, isPublic: boolean, padType: number): Promise<Uint8Array> {
        const dst = new Uint8Array(Math.ceil(data.length / (this.blockSize - 11)) * this.blockSize);
        let dstPos = 0;

        const bl = this.blockSize;
        const end = data.length;
        let pos = 0;

        while (pos < end) {
            const padded = this.pkcs1Pad(data, pos, end, bl, padType);
            pos = Math.min(end, Math.min(data.length, pos + bl - 11));

            // Convert padded to BigInt
            const block = BigIntegerUtils.fromByteArray(padded);
            const chunk = isPublic ? this.doPublic(block) : this.doPrivate(block);

            // Get byte array
            const chunkBytes = BigIntegerUtils.toUnsignedByteArray(chunk);

            // Write zeros for padding
            const padding = bl - Math.ceil(chunk.toString(2).length / 8);
            for (let b = 0; b < padding; b++) {
                dst[dstPos++] = 0x00;
            }

            // Write chunk bytes
            dst.set(chunkBytes, dstPos);
            dstPos += chunkBytes.length;
        }

        return dst.slice(0, dstPos);
    }

    private async doDecrypt(data: Uint8Array, isPublic: boolean, padType: number): Promise<Uint8Array> {
        if (data.length % this.blockSize !== 0) {
            throw new HabboCryptoException(`Decryption data was not in blocks of ${this.blockSize} bytes, total ${data.length}.`);
        }

        const result: Uint8Array[] = [];
        let totalLength = 0;

        const end = data.length;
        let pos = 0;

        while (pos < end) {
            const blockData = data.slice(pos, pos + this.blockSize);

            // Create BigInt from block with sign bit
            const signedBytes = new Uint8Array(blockData.length + 1);
            signedBytes[0] = 0; // Add leading 0 for positive sign
            signedBytes.set(blockData, 1);

            const block = BigIntegerUtils.fromByteArray(signedBytes);
            const chunk = isPublic ? this.doPublic(block) : this.doPrivate(block);
            const unpadded = this.pkcs1Unpad(BigIntegerUtils.toUnsignedByteArray(chunk), this.blockSize, padType);

            pos += this.blockSize;
            result.push(unpadded);
            totalLength += unpadded.length;
        }

        // Combine all result arrays
        const output = new Uint8Array(totalLength);
        let offset = 0;
        for (const arr of result) {
            output.set(arr, offset);
            offset += arr.length;
        }

        return output;
    }

    private pkcs1Pad(src: Uint8Array, pos: number, end: number, n: number, padType: number): Uint8Array {
        const result = new Uint8Array(n);
        let p = pos;
        end = Math.min(end, Math.min(src.length, p + n - 11));
        let i = end - 1;

        while (i >= p && n > 11) {
            result[--n] = src[i--];
        }

        result[--n] = 0;

        if (padType === 2) {
            while (n > 2) {
                // Random byte between 1-255
                result[--n] = Math.floor(Math.random() * 255) + 1;
            }
        } else {
            while (n > 2) {
                result[--n] = 0xFF;
            }
        }

        result[--n] = padType;
        result[--n] = 0;

        return result;
    }

    private pkcs1Unpad(b: Uint8Array, n: number, padType: number): Uint8Array {
        const result = new Uint8Array(n);
        let resultPos = 0;
        let i = 0;

        while (i < b.length && b[i] === 0) {
            ++i;
        }

        if (b.length - i !== n - 1 || b[i] !== padType) {
            throw new HabboCryptoException(`PKCS#1 unpad: i=${i}, expected b[i]==${padType}, got b[i]=${b[i]}`);
        }

        ++i;

        while (b[i] !== 0) {
            if (++i >= b.length) {
                throw new HabboCryptoException(`PKCS#1 unpad: i=${i}, b[i-1]!=0 (=${b[i-1]})`);
            }
        }

        while (++i < b.length) {
            result[resultPos++] = b[i];
        }

        return result.slice(0, resultPos);
    }
}