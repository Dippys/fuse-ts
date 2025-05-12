// src/network/protocol/messages/incoming/auth/InitDiffieHandshakeMessageComposer.ts
import { ClientPacket } from "@/network/protocol/packets/ClientPacket";
import { IncomingMessage } from "../IncomingMessage";

interface InitDiffieHandshakeData {
    // Empty interface as this message doesn't contain data
}

export class InitDiffieHandshakeMessageComposer extends IncomingMessage<InitDiffieHandshakeData> {
    public static readonly ID = 586;
    protected readonly CHANNEL_NAME = "InitDiffieHandshakeMessageComposer";

    protected parse(packet: ClientPacket): InitDiffieHandshakeData {
        return {};
    }
}