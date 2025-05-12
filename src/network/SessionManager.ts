// src/network/SessionManager.ts
import { Session } from '@/network/sockets';
import { GameClient } from '@/network/GameClient';
import logger from '@/utils/logger';
import { HabboEncryption } from "@/security/HabboEncryption";

export interface EnhancedSession extends Session {
    client: GameClient;
    encryption?: HabboEncryption | null;
    dhPrivateKey?: string;
    rsaSharedKey?: string;
    enableEncryption(): void;
    // Add a flag to track if session is being closed
    _isClosing?: boolean;
}

export class SessionManager {
    private static sessions: Map<string, EnhancedSession> = new Map();

    public static createSession(session: Session): EnhancedSession {
        const client = new GameClient(session);

        const enhancedSession: EnhancedSession = {
            ...session,
            client,
            encryption: client.encryption,
            _isClosing: false,

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

        // Override the close method to prevent recursion
        const originalClose = enhancedSession.close;
        enhancedSession.close = function(): void {
            // Prevent recursion - if already closing, just return
            if (this._isClosing) {
                logger.debug(`Session ${this.connectionId} is already being closed, ignoring duplicate close`);
                return;
            }

            // Mark session as closing
            this._isClosing = true;
            logger.debug(`Closing session ${this.connectionId}`);

            // Remove from session manager first
            SessionManager.sessions.delete(this.connectionId);

            // Then close the socket through the original close method
            try {
                originalClose.call(this);
            } catch (error) {
                logger.error(`Error in original close for session ${this.connectionId}: ${error}`);
                // Try to force close the socket if possible
                try {
                    if (this.socket && !this.socket.destroyed) {
                        this.socket.destroy();
                    }
                } catch (socketError) {
                    logger.error(`Failed to destroy socket: ${socketError}`);
                }
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
        // Get session first
        const session = this.sessions.get(connectionId);

        // Remove from sessions map BEFORE doing anything else
        const result = this.sessions.delete(connectionId);

        if (result) {
            logger.debug(`Removed session: ${connectionId}`);

            // If we have a session and it's not already closing, close socket safely
            if (session && !session._isClosing) {
                try {
                    // Mark as closing
                    session._isClosing = true;

                    // Instead of calling session.close(), access socket directly
                    if (session.socket && !session.socket.destroyed) {
                        try {
                            session.socket.end();
                            session.socket.unref();

                            // Force destroy after a delay if needed
                            setTimeout(() => {
                                try {
                                    if (session.socket && !session.socket.destroyed) {
                                        session.socket.destroy();
                                    }
                                } catch (e) {
                                    // Ignore errors during forced destruction
                                }
                            }, 500);
                        } catch (socketError) {
                            logger.error(`Error closing socket for session ${connectionId}: ${socketError}`);
                            // Last resort - try to force destroy
                            try {
                                session.socket.destroy();
                            } catch (e) {
                                // Ignore final destroy errors
                            }
                        }
                    }
                } catch (error) {
                    logger.error(`Error during session cleanup for ${connectionId}: ${error}`);
                }
            }
        }

        return result;
    }

    public static getAllSessions(): EnhancedSession[] {
        return Array.from(this.sessions.values());
    }

    // Add a utility method for debugging
    public static getSessionCount(): number {
        return this.sessions.size;
    }
}