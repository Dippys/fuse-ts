// src/socket/handlers.ts
import net from 'net';
import logger from '@/utils/logger';
import { EnhancedSession } from '@/types/Session';
import { SessionManager } from '@/network/SessionManager';
import { PacketRegistry } from "@/network/protocol/PacketRegistry";
import { HabboMessageDecoder } from "@/network/protocol/utils/HabboMessageDecoder";
import { activeConnections } from './TcpServer';

/**
 * Handles processing of incoming data from a client
 */
export function handleIncomingData(
    session: EnhancedSession,
    data: Buffer | string,
    maxPacketSize: number
): void {
    // Ensure we have a Buffer
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    // Safety check for extremely large packets
    if (buffer.length > maxPacketSize) {
        logger.warn(`Rejecting oversized packet (${buffer.length} bytes) from ${session.connectionId}`);
        return;
    }

    try {
        // Handle encryption if needed
        let processedBuffer = buffer;
        if (session.encryption?.isHandshakeFinished && session.encryption?.isHandshakeFinished()) {
            // Clone the buffer to avoid modifying the original data
            processedBuffer = Buffer.from(buffer);

            // Apply RC4 decryption
            const rc4 = session.encryption.getRC4?.();
            if (rc4) {
                rc4.parse(processedBuffer);
                logger.debug(`Decrypted incoming packet from ${session.connectionId}`);
            } else {
                logger.warn(`Encryption is enabled but RC4 is not initialized for ${session.connectionId}`);
            }
        }

        // Decode and handle the packet
        const clientPacket = HabboMessageDecoder.decode(processedBuffer);
        PacketRegistry.getInstance().handlePacket(session, clientPacket.header, clientPacket);
    } catch (error) {
        logger.warn(`Failed to process packet: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Closes a connection and performs cleanup
 */
export function closeConnection(connectionId: string, socket: net.Socket, reason: string): void {
    logger.debug(`Closing connection ${connectionId} (reason: ${reason})`);

    // Remove from session manager first to prevent multiple cleanup attempts
    if (SessionManager.getSession(connectionId)) {
        SessionManager.removeSession(connectionId);
    }

    // Check if socket is still valid and end it safely
    if (!socket.destroyed) {
        try {
            // End the socket cleanly
            socket.end();
            socket.unref();

            // If socket doesn't close in reasonable time, force destroy it
            setTimeout(() => {
                if (!socket.destroyed) {
                    logger.debug(`Force destroying socket for ${connectionId}`);
                    socket.destroy();
                }
            }, 1000);
        } catch (error) {
            logger.error(`Error ending socket: ${error instanceof Error ? error.message : String(error)}`);

            // Force destroy as a last resort
            try {
                socket.destroy();
            } catch (destroyError) {
                logger.error(`Failed to destroy socket: ${destroyError}`);
            }
        }
    }

    // Remove from active connections map
    cleanupConnection(connectionId);
}

/**
 * Cleans up connection resources
 */
export function cleanupConnection(connectionId: string): void {
    // Remove from active connections
    if (activeConnections.has(connectionId)) {
        activeConnections.delete(connectionId);
        logger.debug(`Removed ${connectionId} from active connections`);
    }
}