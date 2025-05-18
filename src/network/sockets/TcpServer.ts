// src/socket/TcpServer.ts
import net from 'net';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/utils/logger';
import { Session } from '@/types/Session';
import { SessionManager } from '@/network/SessionManager';
import { handleIncomingData, closeConnection, cleanupConnection } from './handlers';

// Configuration
const MAX_PACKET_SIZE = 8192; // 8KB max packet size
const CONNECTION_TIMEOUT = 60000; // 60 seconds timeout
const SERVER_STATUS_INTERVAL = 5000; // 5 seconds for status reporting
const SERVER_RESTART_DELAY = 5000; // 5 seconds delay before restart attempts

// Active connections tracking - exported for use in handlers
export const activeConnections = new Map<string, net.Socket>();

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

        // Create base session
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

        // Create enhanced session through session manager
        const enhancedSession = SessionManager.createSession(session);

        // Handle socket timeouts
        socket.on('timeout', () => {
            logger.warn(`Connection ${connectionId} timed out`);
            closeConnection(connectionId, socket, 'timeout');
        });

        // Handle incoming data
        socket.on('data', (data) => {
            try {
                handleIncomingData(enhancedSession, data, MAX_PACKET_SIZE);
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
 * Starts the TCP server
 */
export function startTcpServer(): void {
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
export function sendToClient(connectionId: string, data: Buffer | string): boolean {
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
export function broadcastToAll(data: Buffer | string): number {
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
export function setupGracefulShutdown(): void {
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