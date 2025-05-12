import { subscribe } from '@/cache/redis';
import { SessionManager } from "@/network/SessionManager";
import { CompleteDiffieHandshakeMessageComposer} from "@/network/protocol/messages/incoming/auth/CompleteDiffieHandshakeMessageComposer";
import logger from '@/utils/logger';
import {CompleteDiffieHandshakeEvent} from "@/network/protocol/messages/outgoing/auth/CompleteDiffieHandshakeEvent";
import {InitDiffieHandshakeEvent} from "@/network/protocol/messages/outgoing/auth/InitDiffieHandshakeEvent";
import {SecurityManager} from "@/security/SecurityManager";

/**
 * Handles the completion of the Diffie-Hellman handshake process
 * This completes the secure communication setup with the client
 */
export class AuthenticationHandler {

    constructor() {
        this.initialize();
    }

    private initialize(): void {
        subscribe('CompleteDiffieHandshakeMessageComposer', this.handleCompleteDiffieHandshake.bind(this));
        subscribe('InitDiffieHandshakeMessageComposer', this.handleDiffieHandshakeRequest.bind(this));
        subscribe('SSOTicketMessageComposer', this.handleSSOTicket.bind(this));
    }

    /**
     * Handles the client's public key and completes the Diffie-Hellman handshake
     */
    private async handleCompleteDiffieHandshake(message: string): Promise<void> {
        try {
            const data = JSON.parse(message);
            const session = SessionManager.getSession(data.connectionId);

            if (!session) {
                logger.warn(`No session found for connectionId: ${data.connectionId}`);
                return;
            }

            if (!session.encryption) {
                logger.error(`No encryption setup for client ${data.connectionId}`);
                session.close();
                return;
            }

            // Generate shared key from client's public key
            const sharedKey = await session.encryption.getDiffie().getSharedKey(data.clientPublicKey);

            // Set up encryption with the shared key
            session.encryption.initRC4(sharedKey);

            // Mark handshake as complete
            session.encryption.setHandshakeFinished(true);


            session.send( new CompleteDiffieHandshakeEvent().compose( { serverPublicKey: await session.encryption.getDiffie().getPublicKey() }));

            // Enable encryption in the connection
            session.enableEncryption();

            logger.debug(`Completed Diffie handshake with client ${data.connectionId}`);
        } catch (error) {
            logger.error(`Error handling Complete Diffie handshake: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Handles incoming Diffie handshake request from client
     * Responds with the prime and generator values needed for the handshake
     */
    private async handleDiffieHandshakeRequest(message: string): Promise<void> {
        try {
            const data = JSON.parse(message);
            const session = SessionManager.getSession(data.connectionId);

            if (!session) {
                logger.warn(`No session found for connectionId: ${data.connectionId}`);
                return;
            }


            if (session.encryption) {
                session.send( new InitDiffieHandshakeEvent().compose(
                    {
                        signedPrime: await session.encryption?.getDiffie().getSignedPrime(),
                        signedGenerator: await session.encryption?.getDiffie().getSignedGenerator()
                    }));

            }

            logger.debug(`Sent Diffie handshake parameters to client ${data.connectionId}`);
        } catch (error) {
            logger.error(`Error handling Diffie handshake request: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Handles the SSO ticket message from the client
     * This is a placeholder for future implementation
     */
    private async handleSSOTicket(message: string): Promise<void> {
        try {
            const data = JSON.parse(message);
            const connectionId = data.connectionId;
            const session = SessionManager.getSession(connectionId);

            if (!session) {
                logger.warn(`No session found for connectionId: ${connectionId}`);
                return;
            }

            if (!data.ssoTicket) {
                logger.error(`No SSO ticket provided for connectionId: ${connectionId}`);
                // Use SessionManager directly to avoid potential infinite recursion
                SessionManager.removeSession(connectionId);
                return;
            }

            const userid = await new SecurityManager().getUserIdFromSSOTicket(data.ssoTicket);

            if (!userid) {
                logger.error(`Invalid SSO ticket for connectionId: ${connectionId}`);
                // Use SessionManager directly instead of session.close()
                SessionManager.removeSession(connectionId);
                return;
            }

            console.log(userid);

            // Rest of your logic...
            logger.debug(`Received SSO ticket from client ${connectionId}: ${data.ssoTicket}`);
        } catch (error) {
            logger.error(`Error handling SSO ticket: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}