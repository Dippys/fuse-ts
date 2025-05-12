// src/network/protocol/messages/outgoing/auth/CompleteDiffieHandshakeEvent.ts
import { ServerPacket } from "@/network/protocol/packets/ServerPacket";
import { OutgoingMessage } from '../OutgoingMessage';

export interface CompleteDiffieHandshakeEventData {
    serverPublicKey: string;
}

export class CompleteDiffieHandshakeEvent extends OutgoingMessage<CompleteDiffieHandshakeEventData> {
    protected readonly HEADER: number = 3777;

    protected appendData(packet: ServerPacket, data: CompleteDiffieHandshakeEventData): void {
        packet.appendString(data.serverPublicKey);
    }
}