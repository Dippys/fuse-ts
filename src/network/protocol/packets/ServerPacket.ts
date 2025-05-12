// src/network/protocol/packets/ServerPacket.ts
import logger from '@/utils/logger';

export class ServerPacket {
    private initialized: boolean = false;
    private header!: number;
    private buffer!: Buffer;
    private position: number = 0;

    constructor();
    constructor(header: number);
    constructor(header?: number) {
        if (header !== undefined) {
            this.init(header);
        }
    }

    public init(header: number): ServerPacket {
        if (this.initialized) {
            throw new Error("ServerPacket was already initialized.");
        }

        this.initialized = true;
        this.header = header;

        // Initialize with space for length (4 bytes) + header (2 bytes)
        this.buffer = Buffer.alloc(1024);

        // Write length placeholder (will be updated when getting bytes)
        this.buffer.writeInt32BE(0, 0);
        this.position = 4;

        // Write header ID
        this.buffer.writeInt16BE(header, this.position);
        this.position += 2;

        return this;
    }

    public appendRawBytes(bytes: Buffer): void {
        try {
            this.ensureCapacity(bytes.length);
            bytes.copy(this.buffer, this.position);
            this.position += bytes.length;
        } catch (e) {
            throw new Error(`Error appending raw bytes: ${e}`);
        }
    }

    public appendString(value: string | null): void {
        if (value === null) {
            this.appendString("");
            return;
        }

        try {
            const strBuffer = Buffer.from(value, 'utf8');

            this.ensureCapacity(2 + strBuffer.length);

            // Write string length
            this.buffer.writeInt16BE(strBuffer.length, this.position);
            this.position += 2;

            // Write string data
            strBuffer.copy(this.buffer, this.position);
            this.position += strBuffer.length;
        } catch (e) {
            throw new Error(`Error appending string: ${e}`);
        }
    }

    public appendChar(value: number): void {
        try {
            this.ensureCapacity(2);
            // In JavaScript, chars are 16-bit
            this.buffer.writeUInt16BE(value, this.position);
            this.position += 2;
        } catch (e) {
            throw new Error(`Error appending char: ${e}`);
        }
    }

    public appendChars(value: any): void {
        try {
            const str = value.toString();
            // In Java, writeChars writes each character as 2 bytes
            this.ensureCapacity(str.length * 2);

            for (let i = 0; i < str.length; i++) {
                this.buffer.writeUInt16BE(str.charCodeAt(i), this.position);
                this.position += 2;
            }
        } catch (e) {
            throw new Error(`Error appending chars: ${e}`);
        }
    }

    public appendInt(value: number | boolean | string): void {
        try {
            this.ensureCapacity(4);

            if (typeof value === 'boolean') {
                this.buffer.writeInt32BE(value ? 1 : 0, this.position);
            } else if (typeof value === 'string') {
                this.buffer.writeInt32BE(parseInt(value), this.position);
            } else {
                this.buffer.writeInt32BE(value, this.position);
            }

            this.position += 4;
        } catch (e) {
            throw new Error(`Error appending int: ${e}`);
        }
    }

    public appendShort(value: number): void {
        try {
            this.ensureCapacity(2);
            this.buffer.writeInt16BE(value, this.position);
            this.position += 2;
        } catch (e) {
            throw new Error(`Error appending short: ${e}`);
        }
    }

    public appendByte(value: number): void {
        try {
            this.ensureCapacity(1);
            this.buffer.writeInt8(value, this.position);
            this.position += 1;
        } catch (e) {
            throw new Error(`Error appending byte: ${e}`);
        }
    }

    public appendBoolean(value: boolean): void {
        try {
            this.ensureCapacity(1);
            this.buffer.writeUInt8(value ? 1 : 0, this.position);
            this.position += 1;
        } catch (e) {
            throw new Error(`Error appending boolean: ${e}`);
        }
    }

    public appendDouble(value: number): void {
        try {
            this.ensureCapacity(8);
            this.buffer.writeDoubleLE(value, this.position);
            this.position += 8;
        } catch (e) {
            throw new Error(`Error appending double: ${e}`);
        }
    }

    public appendResponse(obj: ServerPacket): ServerPacket {
        try {
            const bytes = obj.get();
            this.appendRawBytes(bytes);
        } catch (e) {
            throw new Error(`Error appending response: ${e}`);
        }

        return this;
    }

    public append(obj: { serialize: (packet: ServerPacket) => void }): void {
        obj.serialize(this);
    }

    public getBodyString(): string {
        // This would be the equivalent of PacketUtils.formatPacket
        return this.dumpHex();
    }

    public getHeader(): number {
        return this.header;
    }

    public get(): Buffer {
        // Update the length at the start of the buffer
        this.buffer.writeInt32BE(this.position - 4, 0);

        // Return a copy of the used portion of the buffer
        return Buffer.from(this.buffer.subarray(0, this.position));
    }

    private ensureCapacity(additionalBytes: number): void {
        const requiredSize = this.position + additionalBytes;
        if (requiredSize > this.buffer.length) {
            // Resize buffer to double the required size
            const newBuffer = Buffer.alloc(Math.max(requiredSize, this.buffer.length * 2));
            this.buffer.copy(newBuffer, 0, 0, this.position);
            this.buffer = newBuffer;
        }
    }

    public dumpHex(): string {
        return Array.from(this.buffer.slice(0, this.position))
            .map(b => b.toString(16).padStart(2, '0')).join(' ');
    }
}