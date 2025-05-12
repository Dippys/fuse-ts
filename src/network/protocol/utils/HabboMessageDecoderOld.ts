// src/network/protocol/utils/HabboMessageDecoder.ts
import { ClientPacket } from '@/network/protocol/packets/ClientPacket';
import logger from '@/utils/logger';

export class HabboMessageDecoder {
    public static decode(buffer: Buffer): ClientPacket {
        try {
            // The first 4 bytes represent the packet length, including header
            // Habbo protocol typically uses little-endian (LE) byte order
            if (buffer.length < 6) {
                throw new Error(`Packet too short: ${buffer.length} bytes`);
            }

            // Read length as little-endian (LE) unsigned int
            const length = buffer.readUInt32LE(0);

            // Message ID is 2 bytes after the length field, also little-endian
            const messageId = buffer.readUInt16LE(4);

            // Validate length
            if (length < 2 || length > buffer.length - 4) {
                throw new Error(`Invalid packet length: ${length}, buffer size: ${buffer.length}`);
            }

            // Create packet with the extracted data
            return new ClientPacket(messageId, buffer.slice(4));
        } catch (error) {
            logger.error(`Decoder error: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
}