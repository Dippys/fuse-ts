// src/network/protocol/messages/incoming/auth/PerformanceLogMessageComposer.ts
import { ClientPacket } from "@/network/protocol/packets/ClientPacket";
import { IncomingMessage } from "@/network/protocol/messages/incoming/IncomingMessage";

interface PerformanceLogData {
    reportId: number;
    clientType: string;
    clientVersion: string;
    operatingSystem: string;
    flashVersion: string;
    isWebClient: boolean;
    memoryUsage: number;
    averageFps: number;
    reportCount: number;
    unknownValue: number;
    additionalValue: number;
}

export class PerformanceLogMessageComposer extends IncomingMessage<PerformanceLogData> {
    public static readonly ID = 747;
    protected readonly CHANNEL_NAME = "PerformanceLogMessageComposer";

    protected parse(packet: ClientPacket): PerformanceLogData {
        return {
            reportId: packet.popInt(),
            clientType: packet.popString(),
            clientVersion: packet.popString(),
            operatingSystem: packet.popString(),
            flashVersion: packet.popString(),
            isWebClient: packet.popBoolean(),
            memoryUsage: packet.popInt(),
            averageFps: packet.popInt(),
            reportCount: packet.popInt(),
            unknownValue: packet.popInt(),
            additionalValue: packet.popInt()
        };
    }
}