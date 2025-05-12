// src/network/protocol/messages/outgoing/OutgoingMessage.ts
import { ServerPacket } from '@/network/protocol/packets/ServerPacket';
import { HabboMessageEncoder } from '@/network/protocol/utils/HabboMessageEncoder';
import logger from '@/utils/logger';

export abstract class OutgoingMessage<T = any> {
    protected abstract readonly HEADER: number;

    public compose(data: T): Buffer {
        try {
            const packet = new ServerPacket(this.HEADER);
            this.appendData(packet, data);
            return HabboMessageEncoder.encode(packet);
        } catch (error) {
            logger.error(`Error composing message: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    protected abstract appendData(packet: ServerPacket, data: T): void;
}