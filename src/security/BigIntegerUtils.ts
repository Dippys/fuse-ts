export class BigIntegerUtils {
    /**
     * Converts a BigInt to an unsigned byte array
     * @param bigInteger The BigInt to convert
     * @returns Unsigned byte array
     */
    public static toUnsignedByteArray(bigInteger: bigint): Uint8Array {
        // Convert to byte array with "toByteArray" equivalent
        const hex = bigInteger.toString(16).padStart(2, '0');
        const byteLength = Math.ceil(hex.length / 2);
        const bytes = new Uint8Array(byteLength);

        for (let i = 0; i < byteLength; i++) {
            const offset = hex.length - (i + 1) * 2;
            const hexByte = offset >= 0
                ? hex.substring(offset, offset + 2)
                : hex.substring(0, offset + 2);
            bytes[byteLength - i - 1] = parseInt(hexByte, 16);
        }

        // Remove leading zero if present (equivalent to Java behavior)
        if (bytes.length > 0 && bytes[0] === 0) {
            return bytes.slice(1);
        }

        return bytes;
    }

    /**
     * Creates a BigInt from a byte array
     * @param bytes The byte array
     * @returns A BigInt
     */
    public static fromByteArray(bytes: Uint8Array): bigint {
        let hex = '0x';
        for (const byte of bytes) {
            hex += byte.toString(16).padStart(2, '0');
        }
        return BigInt(hex);
    }
}