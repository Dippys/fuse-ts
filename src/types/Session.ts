// src/types/Session.ts
import net from 'net';
import { GameClient } from '@/network/GameClient';
import { HabboEncryption } from "@/security/HabboEncryption";

/**
 * Base Session interface for the core connection properties
 */
export interface Session {
    connectionId: string;
    socket: net.Socket;
    send: (packet: Buffer) => boolean;
    close: () => void;
}

/**
 * Enhanced session with game client and encryption capabilities
 */
export interface EnhancedSession extends Session {
    client: GameClient;
    encryption?: HabboEncryption | null;
    dhPrivateKey?: string;
    rsaSharedKey?: string;
    enableEncryption(): void;
    // Flag to track if session is being closed
    _isClosing?: boolean;
}