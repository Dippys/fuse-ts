// File: src/cache/redis.ts
import { createClient } from 'redis';
import dotenv from 'dotenv';
import logger from '@/utils/logger';

// Load environment variables
dotenv.config();

// Initialize Redis Client
const redisClient = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
    password: process.env.REDIS_PASSWORD || undefined,
});

// Event listeners for Redis connection
redisClient.on('connect', () => {
    logger.info('Redis client connected');
});

redisClient.on('error', (err) => {
    logger.error(`Redis connection error: ${err.message}`);
});

// Connect to Redis
const connectRedis = async () => {
    try {
        await redisClient.connect();
        logger.info('Connected to Redis');
    } catch (err) {
        logger.error(`Failed to connect to Redis: ${err instanceof Error ? err.message : String(err)}`);
    }
};

// Pub/Sub setup
const subscribe = async (channel: string, callback: (message: string) => void) => {
    const subscriber = redisClient.duplicate();
    await subscriber.connect();
    await subscriber.subscribe(channel, (message) => {
        logger.info(`Message received on channel "${channel}": ${message}`);
        callback(message);
    });
    return subscriber; // Return for cleanup if needed
};

const publish = async (channel: string, message: string) => {
    await redisClient.publish(channel, message);
    logger.info(`Message published to channel "${channel}": ${message}`);
};

// Initialize connection
connectRedis();

export { redisClient, subscribe, publish };