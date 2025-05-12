// File: src/socket/index.ts
import net from 'net';
import dotenv from 'dotenv';
import logger from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import {PacketRegistry} from "@/network/protocol/PacketRegistry";
import {HabboMessageDecoder} from "@/network/protocol/utils/HabboMessageDecoder";
import {SessionManager} from "@/network/SessionManager";

// Load environment variables
dotenv.config();

// Add at the top of the file
export interface Session {
    connectionId: string;
    socket: net.Socket;
    send: (packet: Buffer) => boolean;
    close: () => void;
}

// Create a map to store active socket connections
const activeConnections = new Map();

// Create TCP server
const server = net.createServer((socket) => {
    const connectionId = uuidv4();

    activeConnections.set(connectionId, socket);

    const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;
    logger.info(`New TCP connection from ${clientAddress} (ID: ${connectionId})`);

// Remove this line:
// socket.setEncoding('utf8');

    socket.on('data', (data) => {
        try {
            // Ensure we have a Buffer
            const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

            //logger.info(`Received data from ${connectionId}, length: ${buffer.length}, hex: ${buffer.toString('hex').substring(0, 60)}...`);

            // Safety check for extremely large packets
            if (buffer.length > 8192) { // Adjust this value based on your protocol's maximum packet size
                logger.warn(`Rejecting oversized packet (${buffer.length} bytes) from ${connectionId}`);
                return;
            }

// Replace SessionManager.createSession with:
            let session = SessionManager.getSession(connectionId);
            if (!session) {
                // Only create a new session if one doesn't exist
                session = SessionManager.createSession({
                    connectionId,
                    socket,
                    send: (packet: Buffer): boolean => {
                        try {
                            socket.write(packet);
                            //logger.info(`Sent packet to ${connectionId}, length: ${packet.length}, hex: ${packet.toString('hex').substring(0, 60)}...`);
                            return true;
                        } catch (error) {
                            logger.error(`Failed to send packet: ${error instanceof Error ? error.message : String(error)}`);
                            return false;
                        }
                    },
                    close: (): void => {
                        socket.end();
                        activeConnections.delete(connectionId);
                        SessionManager.removeSession(connectionId);
                    }
                });
            }

            try {
                // Check if we need to decrypt the data first
                let processedBuffer = buffer;

                if (session.encryption?.isHandshakeFinished() && session.encryption) {

                    // Clone the buffer to avoid modifying the original data
                    processedBuffer = Buffer.from(buffer);
                    // Apply RC4 decryption on the incoming data
                    const rc4 = session.encryption.getRC4();
                    if (rc4) {
                        rc4.parse(processedBuffer);
                        logger.debug(`Decrypted incoming packet from ${connectionId}`);
                    } else {
                        logger.warn(`Encryption is enabled but RC4 is not initialized for ${connectionId}`);
                    }
                }

                // Decode the packet with additional error handling
                const clientPacket = HabboMessageDecoder.decode(processedBuffer);

                // Handle the packet
                PacketRegistry.getInstance().handlePacket(session, clientPacket.header, clientPacket);
            } catch (decodeError) {
                logger.warn(`Failed to decode packet: ${decodeError instanceof Error ? decodeError.message : String(decodeError)}`);
            }
        } catch (error) {
            logger.error(`Error processing packet: ${error instanceof Error ? error.message : String(error)}`);
        }
    });

    socket.on('close', () => {
        logger.info(`Connection closed: ${connectionId}`);
        activeConnections.delete(connectionId);
        SessionManager.removeSession(connectionId);
    });

    socket.on('error', (err) => {
        logger.error(`Socket error for ${connectionId}: ${err.message}`);
        activeConnections.delete(connectionId);
    });
});

// Start the TCP server
const startTcpServer = () => {
    const port = Number(process.env.TCP_PORT) || 2095;
    const host = process.env.HOST || '127.0.0.1';

    server.listen(port, host, () => {
        logger.info(`TCP server listening on ${host}:${port}`);
    });

    server.on('error', (err) => {
        logger.error(`TCP server error: ${err.message}`);
    });
};

// Function to send data to a specific client
const sendToClient = (connectionId: string, data: string): boolean => {
    const socket = activeConnections.get(connectionId);
    if (socket) {
        socket.write(data);
        logger.debug(`Sent data to ${connectionId}: ${data}`);
        return true;
    }
    logger.warn(`Failed to send data: Client ${connectionId} not found`);
    return false;
};

// Function to broadcast to all clients
const broadcastToAll = (data: string): number => {
    let successCount = 0;
    activeConnections.forEach((socket) => {
        socket.write(data);
        successCount++;
    });

    logger.info(`Broadcast message to ${successCount} clients`);
    return successCount;
};

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Shutting down TCP server...');

    activeConnections.forEach((socket) => {
        socket.end();
    });

    server.close(() => {
        logger.info('TCP server closed');
    });
});

export {
    startTcpServer,
    sendToClient,
    broadcastToAll,
    activeConnections
};