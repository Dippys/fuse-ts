// src/crypto/HabboEncryption.ts
import { HabboRSACrypto } from './HabboRSACrypto';
import { HabboDiffieHellman } from './HabboDiffieHellman';
import { HabboRC4 } from './HabboRC4';

export class HabboEncryption {
    private readonly crypto: HabboRSACrypto;
    private readonly diffie: HabboDiffieHellman;
    private rc4: HabboRC4 | null = null;
    private _handshakeFinished: boolean = false;

    constructor(e: string, n: string, d?: string) {
        this.crypto = new HabboRSACrypto(e, n, d!);
        this.diffie = new HabboDiffieHellman(this.crypto);
    }

    public getCrypto(): HabboRSACrypto {
        return this.crypto;
    }

    public getDiffie(): HabboDiffieHellman {
        return this.diffie;
    }

    /**
     * Initialize RC4 encryption with the shared key
     */
    public initRC4(sharedKey: Uint8Array): void {
        this.rc4 = new HabboRC4(sharedKey);
    }

    /**
     * Get the RC4 instance for encryption/decryption
     */
    public getRC4(): HabboRC4 | null {
        return this.rc4;
    }

    /**
     * Set handshake completion status
     */
    public setHandshakeFinished(value: boolean): void {
        this._handshakeFinished = value;
    }

    /**
     * Check if handshake is complete
     */
    public isHandshakeFinished(): boolean {
        return this._handshakeFinished;
    }
}