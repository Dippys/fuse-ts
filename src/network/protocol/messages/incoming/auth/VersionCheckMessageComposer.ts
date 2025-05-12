import { ClientPacket } from "@/network/protocol/packets/ClientPacket";
import { IncomingMessage } from "@/network/protocol/messages/incoming/IncomingMessage";

interface VersionCheckData {
    /**
     * Unknown parameter - corresponds to var_1064 in client code
     * Purpose is unclear from the original implementation
     */
    i: number;
    clientPath: string;
    externalVariablesUrl: string;
}

export class VersionCheckMessageComposer extends IncomingMessage<VersionCheckData> {
    public static readonly ID = 2602;
    protected readonly CHANNEL_NAME = "VersionCheckMessageComposer";

    protected parse(packet: ClientPacket): VersionCheckData {
        return {
            i: packet.popInt(),
            clientPath: packet.popString(),
            externalVariablesUrl: packet.popString()
        };
    }
}