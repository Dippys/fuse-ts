import logger from '@/utils/logger';
import {AuthenticationHandler} from "@/network/handlers/auth/AuthenticationHandler";

export class HandlerRegistry {
    private static instance: HandlerRegistry;
    private handlers: any[] = [];

    private constructor() {
        this.registerHandlers();
    }

    public static getInstance(): HandlerRegistry {
        if (!HandlerRegistry.instance) {
            HandlerRegistry.instance = new HandlerRegistry();
        }
        return HandlerRegistry.instance;
    }

    private registerHandlers(): void {
        logger.info('Registering message handlers...');

        // Auth handlers
        this.handlers.push(new AuthenticationHandler());

        // Add more handlers here as they're created

        logger.info(`Registered ${this.handlers.length} message handlers`);
    }
}