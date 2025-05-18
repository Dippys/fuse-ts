// src/network/GameClient.ts
import { Session } from "@/types/Session";
import { HabboEncryption } from "@/security/HabboEncryption";
import logger from "@/utils/logger";
import { rsaConfig } from "@/config/rsaConfig";

/**
 * Represents a game client connection with user state and encryption
 */
export class GameClient {
    private _id: number | null = null;
    private _username: string | null = null;
    private _authenticated: boolean = false;
    private _connectionId: string;
    private _ssoTicket: string | null = null;
    private _encryption: HabboEncryption | null = null;
    private _handshakeFinished: boolean = false;
    private _machineId: string = "";
    private _session: Session;

    /**
     * Creates a new GameClient instance
     * @param session The underlying network session
     */
    constructor(session: Session) {
        this._session = session;
        this._connectionId = session.connectionId;

        // Initialize encryption if RSA config is available
        if (rsaConfig.KeySize === null || rsaConfig.PublicKey === null || rsaConfig.PrivateKey === null) {
            logger.warn('RSA configuration missing - client will operate without encryption');
        } else {
            try {
                this._encryption = new HabboEncryption(
                    rsaConfig.KeySize,
                    rsaConfig.PublicKey,
                    rsaConfig.PrivateKey
                );
            } catch (error) {
                logger.error(`Failed to initialize encryption: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }

    /**
     * Get the user ID
     */
    get id(): number | null {
        return this._id;
    }

    /**
     * Get the username
     */
    get username(): string | null {
        return this._username;
    }

    /**
     * Check if user is authenticated
     */
    get isAuthenticated(): boolean {
        return this._authenticated;
    }

    /**
     * Get the unique connection ID
     */
    get connectionId(): string {
        return this._connectionId;
    }

    /**
     * Get the SSO ticket
     */
    get ssoTicket(): string | null {
        return this._ssoTicket;
    }

    /**
     * Get the encryption instance
     */
    get encryption(): HabboEncryption | null {
        return this._encryption;
    }

    /**
     * Set the encryption instance
     */
    set encryption(encryption: HabboEncryption | null) {
        this._encryption = encryption;
    }

    /**
     * Check if security handshake is finished
     */
    get handshakeFinished(): boolean {
        return this._handshakeFinished;
    }

    /**
     * Set handshake finished status
     */
    set handshakeFinished(value: boolean) {
        this._handshakeFinished = value;
    }

    /**
     * Get the machine ID
     */
    get machineId(): string {
        return this._machineId;
    }

    /**
     * Set the machine ID
     */
    set machineId(value: string) {
        if (value === null) {
            throw new Error("Cannot set machineID to NULL");
        }
        this._machineId = value;
    }

    /**
     * Get the underlying session
     */
    get session(): Session {
        return this._session;
    }

    /**
     * Set user credentials after authentication
     */
    public setCredentials(id: number, username: string): void {
        this._id = id;
        this._username = username;
        this._authenticated = true;
        logger.debug(`User authenticated: ${username} (ID: ${id})`);
    }

    /**
     * Set the SSO ticket
     */
    public setSSOTicket(ticket: string): void {
        this._ssoTicket = ticket;
    }

    /**
     * Send a response packet to the client
     */
    public sendResponse(message: Buffer): void {
        if (!this._session) {
            logger.warn(`Tried to send message to disconnected client: ${this._connectionId}`);
            return;
        }

        try {
            this._session.send(message);
        } catch (error) {
            logger.error(`Error sending response: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Send multiple response packets to the client
     */
    public sendResponses(messages: Buffer[]): void {
        if (!this._session) {
            logger.warn(`Tried to send messages to disconnected client: ${this._connectionId}`);
            return;
        }

        try {
            for (const message of messages) {
                this._session.send(message);
            }
        } catch (error) {
            logger.error(`Error sending responses: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}