// src/network/protocol/messages/outgoing/auth/InitDiffieHandshakeEvent.ts
import { ServerPacket } from '@/network/protocol/packets/ServerPacket';
import { OutgoingMessage } from '../OutgoingMessage';

export interface InitDiffieHandshakeEventData {
    signedPrime: string;
    signedGenerator: string;
}

export class InitDiffieHandshakeEvent extends OutgoingMessage<InitDiffieHandshakeEventData> {
    protected readonly HEADER: number = 771;

    protected appendData(packet: ServerPacket, data: InitDiffieHandshakeEventData): void {
        packet.appendString(data.signedPrime);
        packet.appendString(data.signedGenerator);
    }
}