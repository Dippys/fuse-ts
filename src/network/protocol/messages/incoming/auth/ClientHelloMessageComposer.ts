// src/network/protocol/messages/incoming/auth/ClientHelloMessageComposer.ts
import { ClientPacket } from "@/network/protocol/packets/ClientPacket";
import { IncomingMessage} from "@/network/protocol/messages/incoming/IncomingMessage";

interface ClientHelloData {
    releaseVersion: string;
    clientType: string;
}

export class ClientHelloMessageComposer extends IncomingMessage<ClientHelloData> {
    public static readonly ID = 4000;
    protected readonly CHANNEL_NAME = "ClientHelloMessageComposer";

    protected parse(packet: ClientPacket): ClientHelloData {
        return {
            releaseVersion: packet.popString(),
            clientType: packet.popString()
        };
    }
}