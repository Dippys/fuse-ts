// src/network/protocol/messages/incoming/auth/SSOTicketMessageComposer.ts
import { ClientPacket } from "@/network/protocol/packets/ClientPacket";
import { IncomingMessage } from "@/network/protocol/messages/incoming/IncomingMessage";

interface SSOTicketData {
    ssoTicket: string;
    ElapsedMilliseconds: number;
}

export class SSOTicketMessageComposer extends IncomingMessage<SSOTicketData> {
    public static readonly ID = 53;
    protected readonly CHANNEL_NAME = "SSOTicketMessageComposer";

    protected parse(packet: ClientPacket): SSOTicketData {
        return {
            ssoTicket: packet.popString(),
            ElapsedMilliseconds: packet.popInt()
        };
    }
}