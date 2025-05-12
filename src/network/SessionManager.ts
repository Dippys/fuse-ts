// src/network/SessionManager.ts
import { Session } from '@/network/sockets';
import { GameClient } from '@/network/GameClient';
import logger from '@/utils/logger';
import { HabboEncryption } from "@/security/HabboEcryption";

export interface EnhancedSession extends Session {
    client: GameClient;
    encryption?: HabboEncryption | null;
    dhPrivateKey?: string;
    rsaSharedKey?: string;
    enableEncryption(): void;
}

export class SessionManager {
    private static sessions: Map<string, EnhancedSession> = new Map();

    public static createSession(session: Session): EnhancedSession {
        const client = new GameClient(session);

        const enhancedSession: EnhancedSession = {
            ...session,
            client,
            encryption: client.encryption,

            // Implementation of the enableEncryption method
            enableEncryption(): void {
                if (!this.encryption) {
                    logger.error('Cannot enable encryption: no encryption instance available');
                    return;
                }

                const rc4 = this.encryption.getRC4();
                if (!rc4) {
                    logger.error('Cannot enable encryption: RC4 not initialized');
                    return;
                }

                // Wrap the original send method to apply encryption
                const originalSend = this.send;
                this.send = (data: Buffer): boolean => {
                    // Create a copy of the data to prevent modifying the original
                    const encryptedData = Buffer.from(data);
                    // Apply RC4 encryption
                    rc4.parse(encryptedData);
                    // Send the encrypted data
                    return originalSend.call(this, encryptedData);
                };

                logger.debug(`Encryption enabled for session ${this.connectionId}`);
            }
        };

        this.sessions.set(session.connectionId, enhancedSession);
        logger.debug(`Created session: ${session.connectionId}`);
        return enhancedSession;
    }

    // Other methods remain unchanged
    public static getSession(connectionId: string): EnhancedSession | undefined {
        return this.sessions.get(connectionId);
    }

    public static removeSession(connectionId: string): boolean {
        const session = this.sessions.get(connectionId);
        if (session) {
            session.client.disconnect();
        }

        const result = this.sessions.delete(connectionId);
        if (result) {
            logger.debug(`Removed session: ${connectionId}`);
        }
        return result;
    }

    public static getAllSessions(): EnhancedSession[] {
        return Array.from(this.sessions.values());
    }
}