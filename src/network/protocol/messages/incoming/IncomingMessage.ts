// src/network/protocol/messages/incoming/IncomingMessageComposer.ts
import { ClientPacket } from "@/network/protocol/packets/ClientPacket";
import { Session } from "@/network/sockets";
import logger from "@/utils/logger";
import { publish } from "@/cache/redis";

export abstract class IncomingMessage<T = any> {
    public static readonly ID: number;
    protected abstract readonly CHANNEL_NAME: string;

    public handle(session: Session, packet: ClientPacket): void {
        logger.debug(`Received ${this.constructor.name} from client ${session.connectionId}`);

        try {
            // Parse packet data
            const data = this.parse(packet);

            // Create payload with connection ID
            const payload = {
                connectionId: session.connectionId,
                ...data
            };

            // Publish to Redis
            publish(this.CHANNEL_NAME, JSON.stringify(payload));

        } catch (error) {
            logger.error(`Error processing ${this.constructor.name}: ${error instanceof Error ? error.message : String(error)}`);
            logger.error(`Failed packet raw data: ${packet.dumpHex()}`);
        }
    }

    protected abstract parse(packet: ClientPacket): T;
}