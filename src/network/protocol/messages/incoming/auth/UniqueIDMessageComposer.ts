// src/network/protocol/messages/incoming/auth/UniqueIDMessageComposer.ts
import { ClientPacket } from "@/network/protocol/packets/ClientPacket";
import { IncomingMessage } from "@/network/protocol/messages/incoming/IncomingMessage";

interface UniqueIDData {
    machineId: string;
    fingerprint: string;
    clientInfo: string;
}

export class UniqueIDMessageComposer extends IncomingMessage<UniqueIDData> {
    public static readonly ID = 1390;
    protected readonly CHANNEL_NAME = "UniqueIDMessageComposer";

    protected parse(packet: ClientPacket): UniqueIDData {
        return {
            machineId: packet.popString(),
            fingerprint: packet.popString(),
            clientInfo: packet.popString()
        };
    }
}