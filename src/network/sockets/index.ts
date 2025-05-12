// File: src/socket/index.ts
import net from 'net';
import dotenv from 'dotenv';
import logger from '@/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { PacketRegistry } from "@/network/protocol/PacketRegistry";
import { HabboMessageDecoder } from "@/network/protocol/utils/HabboMessageDecoder";
import {EnhancedSession, SessionManager} from "@/network/SessionManager";

// Load environment variables
dotenv.config();

// Session interface
export interface Session {
    connectionId: string;
    socket: net.Socket;
    send: (packet: Buffer) => boolean;
    close: () => void;
}

// Active connections tracking
const activeConnections = new Map<string, net.Socket>();

// Configuration
const MAX_PACKET_SIZE = 8192; // 8KB max packet size
const CONNECTION_TIMEOUT = 60000; // 60 seconds timeout
const SERVER_STATUS_INTERVAL = 5000; // 5 seconds for status reporting
const SERVER_RESTART_DELAY = 5000; // 5 seconds delay before restart attempts

/**
 * Creates a new TCP server instance
 */
function createServer(): net.Server {
    const server = net.createServer((socket) => {
        // Set socket options for better stability
        socket.setKeepAlive(true, 30000);
        socket.setNoDelay(true);
        socket.setTimeout(CONNECTION_TIMEOUT);

        const connectionId = uuidv4();
        const clientAddress = `${socket.remoteAddress}:${socket.remotePort}`;

        // Track the new connection
        activeConnections.set(connectionId, socket);
        logger.info(`New TCP connection from ${clientAddress} (ID: ${connectionId})`);

        // Create session
        const session = setupSession(connectionId, socket);

        // Handle socket timeouts
        socket.on('timeout', () => {
            logger.warn(`Connection ${connectionId} timed out`);
            closeConnection(connectionId, socket, 'timeout');
        });

        // Handle incoming data
        socket.on('data', (data) => {
            try {
                handleIncomingData(session, data);
            } catch (error) {
                logger.error(`Error handling data from ${connectionId}: ${error instanceof Error ? error.message : String(error)}`);
            }
        });

        // Handle socket close
        socket.on('close', (hadError) => {
            logger.info(`Connection closed: ${connectionId}${hadError ? ' (had error)' : ''}`);
            cleanupConnection(connectionId);
        });

        // Handle socket errors
        socket.on('error', (err) => {
            logger.error(`Socket error for ${connectionId}: ${err.message}`);
            closeConnection(connectionId, socket, 'error');
        });
    });

    // Add error handler for the server itself
    server.on('error', (err) => {
        logger.error(`TCP server error: ${err.message}`);

        // Don't let the server crash, attempt recovery
        setTimeout(() => {
            try {
                if (!server.listening) {
                    startTcpServer();
                }
            } catch (e) {
                logger.error(`Failed to recover server: ${e instanceof Error ? e.message : String(e)}`);
            }
        }, SERVER_RESTART_DELAY);
    });

    return server;
}

/**
 * Sets up a new session for a connection
 */
function setupSession(connectionId: string, socket: net.Socket): EnhancedSession {
    // Create the session object
    const session: Session = {
        connectionId,
        socket,
        send: (packet: Buffer): boolean => {
            try {
                const result = socket.write(packet);
                return result;
            } catch (error) {
                logger.error(`Failed to send packet: ${error instanceof Error ? error.message : String(error)}`);
                return false;
            }
        },
        close: (): void => {
            closeConnection(connectionId, socket, 'session-close');
        }
    };

    return SessionManager.createSession(session);
}

/**
 * Handles processing of incoming data from a client
 */
function handleIncomingData(session: EnhancedSession, data: Buffer | string): void {
    // Ensure we have a Buffer
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

    // Safety check for extremely large packets
    if (buffer.length > MAX_PACKET_SIZE) {
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
function closeConnection(connectionId: string, socket: net.Socket, reason: string): void {
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
function cleanupConnection(connectionId: string): void {
    // Remove from active connections
    if (activeConnections.has(connectionId)) {
        activeConnections.delete(connectionId);
        logger.debug(`Removed ${connectionId} from active connections`);
    }
}

/**
 * Starts the TCP server
 */
function startTcpServer(): void {
    const server = createServer();
    const port = Number(process.env.TCP_PORT) || 2095;
    const host = process.env.HOST || '127.0.0.1';

    server.listen(port, host, () => {
        logger.info(`TCP server listening on ${host}:${port}`);
    });

    // Periodically log server status
    const statusInterval = setInterval(() => {
        logger.info(`Server status: listening=${server.listening}, connections=${activeConnections.size}`);
    }, SERVER_STATUS_INTERVAL);

    // Ensure interval doesn't keep process alive
    statusInterval.unref();
}

/**
 * Sends data to a specific client
 */
function sendToClient(connectionId: string, data: Buffer | string): boolean {
    const socket = activeConnections.get(connectionId);
    if (!socket) {
        logger.warn(`Failed to send data: Client ${connectionId} not found`);
        return false;
    }

    try {
        const result = socket.write(data);
        return result;
    } catch (error) {
        logger.error(`Error sending to client ${connectionId}: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}

/**
 * Broadcasts data to all connected clients
 */
function broadcastToAll(data: Buffer | string): number {
    let successCount = 0;

    activeConnections.forEach((socket, connectionId) => {
        try {
            if (socket.writable) {
                socket.write(data);
                successCount++;
            }
        } catch (error) {
            logger.error(`Error broadcasting to ${connectionId}: ${error instanceof Error ? error.message : String(error)}`);
        }
    });

    logger.info(`Broadcast message to ${successCount}/${activeConnections.size} clients`);
    return successCount;
}

/**
 * Set up graceful shutdown
 */
function setupGracefulShutdown(): void {
    // Handle termination signals
    const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];

    signals.forEach(signal => {
        process.on(signal, () => {
            logger.info(`Received ${signal}, shutting down TCP server...`);

            // Close all active connections
            activeConnections.forEach((socket, connectionId) => {
                logger.debug(`Closing connection ${connectionId} during shutdown`);
                try {
                    socket.end();
                    socket.unref();
                } catch (error) {
                    logger.debug(`Error closing socket during shutdown: ${error}`);
                    socket.destroy();
                }
            });

            // Clear the active connections map
            activeConnections.clear();

            // Exit after a short delay to allow logs to flush
            setTimeout(() => {
                logger.info('TCP server shutdown complete');
                process.exit(0);
            }, 1000);
        });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
        logger.error(`Uncaught exception: ${err.message}\n${err.stack}`);
        // Continue running, but log the error
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger.error(`Unhandled promise rejection: ${reason}`);
        // Continue running, but log the error
    });
}

// Initialize shutdown handlers
setupGracefulShutdown();

// Export functions and objects
export {
    startTcpServer,
    sendToClient,
    broadcastToAll,
    activeConnections
};