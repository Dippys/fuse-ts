// src/network/protocol/utils/HabboMessageEncoder.ts
import { ServerPacket } from '@/network/protocol/packets/ServerPacket';
import logger from '@/utils/logger';

export class HabboMessageEncoder {
    /**
     * Encodes a ServerPacket for network transmission
     * This is now simplified since packet structure and length handling
     * is already implemented inside ServerPacket
     */
    public static encode(packet: ServerPacket): Buffer {
        try {
            // Get the complete buffer with length + header + data
            const finalBuffer = packet.get();

            logger.debug(`Encoded packet with header ${packet.getHeader()}, total size ${finalBuffer.length}`);
            logger.debug(`Encoded buffer: ${Array.from(finalBuffer).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

            return finalBuffer;
        } catch (error) {
            logger.error(`Encoder error: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
}