// src/network/protocol/packets/ClientPacket.ts
import logger from '@/utils/logger';

export class ClientPacket {
    private buffer: Buffer;
    private position: number = 2; // Start after the header ID (2 bytes)

    constructor(public readonly header: number, buffer: Buffer) {
        this.buffer = buffer;
        logger.debug(`ClientPacket created with header ${header}, buffer length ${buffer.length}`);
        logger.debug(`Buffer content: ${this.dumpHex()}`);
    }

    public inspectBuffer(): void {
        logger.debug(`Current position: ${this.position}`);
        logger.debug(`Remaining bytes: ${this.remainingLength()}`);
        logger.debug(`Next 10 bytes: ${Array.from(this.buffer.slice(this.position, Math.min(this.position + 10, this.buffer.length)))
            .map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
    }

    public popString(): string {
        try {
            if (this.position + 2 > this.buffer.length) {
                logger.warn('Tried to read string length beyond buffer end');
                return '';
            }

            const length = this.buffer.readUInt16BE(this.position);
            logger.debug(`String length: ${length} at position ${this.position}`);
            this.position += 2;

            if (length < 0 || this.position + length > this.buffer.length) {
                logger.warn(`Invalid string length ${length}, buffer size ${this.buffer.length}, position ${this.position}`);
                return '';
            }

            const data = this.buffer.slice(this.position, this.position + length);
            this.position += length;

            return data.toString('utf8');
        } catch (error) {
            logger.error(`Error in popString: ${error instanceof Error ? error.message : String(error)}`);
            return '';
        }
    }

    public popInt(): number {
        if (this.position + 4 > this.buffer.length) {
            logger.warn('Tried to read int beyond buffer end');
            return 0;
        }
        const value = this.buffer.readInt32BE(this.position);
        this.position += 4;
        return value;
    }

    public popBoolean(): boolean {
        if (this.position >= this.buffer.length) {
            logger.warn('Tried to read boolean beyond buffer end');
            return false;
        }
        return this.buffer.readUInt8(this.position++) === 1;
    }

    public popShort(): number {
        if (this.position + 2 > this.buffer.length) {
            logger.warn('Tried to read short beyond buffer end');
            return 0;
        }
        const value = this.buffer.readInt16BE(this.position);
        this.position += 2;
        return value;
    }

    public popLong(): bigint {
        if (this.position + 8 > this.buffer.length) {
            logger.warn('Tried to read long beyond buffer end');
            return BigInt(0);
        }
        const value = this.buffer.readBigInt64BE(this.position);
        this.position += 8;
        return value;
    }

    public popDouble(): number {
        try {
            const doubleString = this.popString();
            const result = parseFloat(doubleString);

            if (isNaN(result)) {
                throw new Error(`'${doubleString}' is not a valid double!`);
            }

            return result;
        } catch (error) {
            logger.error(`Error in popDouble: ${error instanceof Error ? error.message : String(error)}`);
            return 0;
        }
    }

    public popBytes(length: number): Buffer {
        if (this.position + length > this.buffer.length) {
            logger.warn(`Tried to read ${length} bytes beyond buffer end`);
            return Buffer.alloc(0);
        }
        const data = this.buffer.slice(this.position, this.position + length);
        this.position += length;
        return data;
    }

    public remainingLength(): number {
        return this.buffer.length - this.position;
    }

    public dumpHex(): string {
        return Array.from(this.buffer).map(b => b.toString(16).padStart(2, '0')).join(' ');
    }
}