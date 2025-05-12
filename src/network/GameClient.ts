// src/network/GameClient.ts
import { HabboEncryption } from "@/security/HabboEncryption";
import { Session } from "@/network/sockets";
import logger from "@/utils/logger";
import {rsaConfig} from "@/config/rsaConfig";

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

    constructor(session: Session) {
        this._session = session;
        this._connectionId = session.connectionId;
        if (rsaConfig.KeySize === null || rsaConfig.PublicKey === null || rsaConfig.PrivateKey === null) {
            throw new Error('Required environment variables KeySize, PublicKey, and PrivateKey must be defined');
        }
        this._encryption = new HabboEncryption(
            rsaConfig.KeySize,
            rsaConfig.PublicKey,
            rsaConfig.PrivateKey
        )
    }

    get id(): number | null {
        return this._id;
    }

    get username(): string | null {
        return this._username;
    }

    get isAuthenticated(): boolean {
        return this._authenticated;
    }

    get connectionId(): string {
        return this._connectionId;
    }

    get ssoTicket(): string | null {
        return this._ssoTicket;
    }

    get encryption(): HabboEncryption | null {
        return this._encryption;
    }

    set encryption(encryption: HabboEncryption | null) {
        this._encryption = encryption;
    }

    get handshakeFinished(): boolean {
        return this._handshakeFinished;
    }

    set handshakeFinished(value: boolean) {
        this._handshakeFinished = value;
    }

    get machineId(): string {
        return this._machineId;
    }

    set machineId(value: string) {
        if (value === null) {
            throw new Error("Cannot set machineID to NULL");
        }
        this._machineId = value;
    }

    get session(): Session {
        return this._session;
    }

    public setCredentials(id: number, username: string): void {
        this._id = id;
        this._username = username;
        this._authenticated = true;
    }

    public setSSOTicket(ticket: string): void {
        this._ssoTicket = ticket;
    }

    public sendResponse(message: any): void {
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

    public sendResponses(messages: any[]): void {
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

    public disconnect(): void {
        this._authenticated = false;

        try {
            // Close the session if it exists
            if (this._session) {
                // Close the socket connection
                this._session.close();
                logger.info(`Disconnected client: ${this._connectionId}`);
            }
        } catch (error) {
            logger.error(`Error disconnecting client: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            this._session = null as any;
        }
    }
}