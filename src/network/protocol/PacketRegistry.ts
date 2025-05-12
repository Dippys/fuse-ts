// src/network/protocol/PacketRegistry.ts
import { Session } from '@/network/sockets';
import logger from '@/utils/logger';
import {ClientPacket} from "@/network/protocol/packets/ClientPacket";
import {ClientHelloMessageComposer} from "@/network/protocol/messages/incoming/auth/ClientHelloMessageComposer";
import {
    CompleteDiffieHandshakeMessageComposer
} from "@/network/protocol/messages/incoming/auth/CompleteDiffieHandshakeMessageComposer";
import {
    InitDiffieHandshakeMessageComposer
} from "@/network/protocol/messages/incoming/auth/InitDiffieHandshakeMessageComposer";
import {SSOTicketMessageComposer} from "@/network/protocol/messages/incoming/auth/SSOTicketMessageComposer";
import {PerformanceLogMessageComposer} from "@/network/protocol/messages/incoming/auth/PerformanceLogMessageComposer";
import {UniqueIDMessageComposer} from "@/network/protocol/messages/incoming/auth/UniqueIDMessageComposer";
import {VersionCheckMessageComposer} from "@/network/protocol/messages/incoming/auth/VersionCheckMessageComposer";

// Type for packet handler class with constructor and handle method
export type PacketHandlerClass = {
    new(): { handle(session: Session, packet: ClientPacket): void };
    ID: number;
};

export class PacketRegistry {
    private static instance: PacketRegistry;
    private incomingHandlers: Map<number, any> = new Map();

    private constructor() {
        this.registerIncomingPackets();
    }

    public static getInstance(): PacketRegistry {
        if (!PacketRegistry.instance) {
            PacketRegistry.instance = new PacketRegistry();
        }
        return PacketRegistry.instance;
    }

    public registerHandler(handlerClass: PacketHandlerClass): void {
        const id = handlerClass.ID;

        if (this.incomingHandlers.has(id)) {
            logger.warn(`Handler for packet ID ${id} is being overridden`);
        }

        this.incomingHandlers.set(id, new handlerClass());
        logger.debug(`Registered handler for packet ID ${id}`);
    }

    public registerHandlers(handlerClasses: PacketHandlerClass[]): void {
        handlerClasses.forEach(handlerClass => this.registerHandler(handlerClass));
        logger.info(`Registered ${handlerClasses.length} packet handlers`);
    }

    public unregisterHandler(id: number): boolean {
        const result = this.incomingHandlers.delete(id);
        if (result) {
            logger.debug(`Unregistered handler for packet ID ${id}`);
        }
        return result;
    }

// Update the handlePacket method in PacketRegistry.ts
    public handlePacket(session: Session, messageId: number, packet: ClientPacket): void {
        const handler = this.incomingHandlers.get(messageId);

        if (handler) {
            try {
                // Use the provided ClientPacket directly
                handler.handle(session, packet);
            } catch (error) {
                logger.error(`Error handling packet ${messageId}: ${error instanceof Error ? error.message : String(error)}`);
            }
        } else {
            // Log unregistered packets
            logger.info(`UNREGISTERED PACKET: ID=${messageId}, Length=${packet.remainingLength() + 2}, From=${session.connectionId}`);

            // Use the packet's dumpHex method for the preview
            logger.info(`Packet data preview: ${packet.dumpHex().substring(0, 60)}`);
        }
    }


    public registerIncomingPackets(): void {
        // Register all handlers by category
        this.registerHandlers([
            ClientHelloMessageComposer,
            CompleteDiffieHandshakeMessageComposer,
            InitDiffieHandshakeMessageComposer,
            SSOTicketMessageComposer,
            PerformanceLogMessageComposer,
            UniqueIDMessageComposer,
            VersionCheckMessageComposer,
        ]);
    }
}