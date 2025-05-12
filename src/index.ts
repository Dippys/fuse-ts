// File: src/index.ts
import dotenv from 'dotenv';
import logger from '@/utils/logger';
import { prisma } from '@/database';
import { startTcpServer } from '@/network/sockets';
import {HandlerRegistry} from "@/network/handlers/HandlerRegistry";



// Load environment variables early
dotenv.config();


const logo = "\n ________  __    __   ______   ________  ________   ______  \n"+
    "|        \\|  \\  |  \\ /      \\ |        \\|        \\ /      \\ \n"+
    "| $$$$$$$$| $$  | $$|  $$$$$$\\| $$$$$$$$ \\$$$$$$$$|  $$$$$$\\\n"+
    "| $$__    | $$  | $$| $$___\\$$| $$__       | $$   | $$___\\$$\n"+
    "| $$  \\   | $$  | $$ \\$$    \\ | $$  \\      | $$    \\$$    \\ \n"+
    "| $$$$$   | $$  | $$ _\\$$$$$$\\| $$$$$      | $$    _\\$$$$$$\\\n"+
    "| $$      | $$__/ $$|  \\__| $$| $$_____    | $$   |  \\__| $$\n"+
    "| $$       \\$$    $$ \\$$    $$| $$     \\   | $$    \\$$    $$\n"+
    " \\$$        \\$$$$$$   \\$$$$$$  \\$$$$$$$$    \\$$     \\$$$$$$ \n"+
    "We back at it boys                                            ";


// Main application bootstrap
async function bootstrap() {
    try {
        logger.info(logo);
        logger.info('Starting Habbo Hotel emulator...');

        // Verify database connection
        await prisma.$connect();
        logger.info('Connected to PostgreSQL database');

        HandlerRegistry.getInstance();
        logger.info('Registered all message handlers');

        // Start TCP server for game connections
        startTcpServer();

        logger.info('Habbo Hotel emulator started successfully');
        logger.info(`TCP server running on port ${process.env.TCP_PORT || 2095}`);
    } catch (error) {
        logger.error(`Failed to start application: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled promise rejection: ${String(reason)}`);
    process.exit(1);
});

// Start the application
bootstrap();