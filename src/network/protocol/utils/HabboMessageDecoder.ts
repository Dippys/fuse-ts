// src/network/protocol/HabboMessageDecoder.ts
import { ClientPacket } from '@/network/protocol/packets/ClientPacket';
import logger from '@/utils/logger';

export class HabboMessageDecoder {
    public static decode(buffer: Buffer): ClientPacket {
        try {
            // Ensure we have at least 6 bytes (4 for length, 2 for header id)
            if (buffer.length < 6) {
                throw new Error(`Packet too short: ${buffer.length} bytes`);
            }

            // Use unsigned read or add additional safety checks
            const length = buffer.readUInt32BE(0);

            // More strict length validation
            if (length < 2 || length > buffer.length - 4) {
                throw new Error(`Invalid packet length: ${length}, buffer size: ${buffer.length}`);
            }

            const messageId = buffer.readUInt16BE(4);

            return new ClientPacket(messageId, buffer.slice(4, 4 + length));
        } catch (error) {
            logger.error(`Decoder error: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
}