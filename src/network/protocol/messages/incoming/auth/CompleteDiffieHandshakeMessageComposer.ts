// src/network/protocol/messages/incoming/auth/CompleteDiffieHandshakeMessageComposer.ts
import { ClientPacket } from "@/network/protocol/packets/ClientPacket";
import {IncomingMessage} from "@/network/protocol/messages/incoming/IncomingMessage";

interface CompleteDiffieHandshakeData {
    clientPublicKey: string;
}

export class CompleteDiffieHandshakeMessageComposer extends IncomingMessage<CompleteDiffieHandshakeData> {
    public static readonly ID = 2616;
    protected readonly CHANNEL_NAME = "CompleteDiffieHandshakeMessageComposer";

    protected parse(packet: ClientPacket): CompleteDiffieHandshakeData {
        return {
            clientPublicKey: packet.popString()
        };
    }
}