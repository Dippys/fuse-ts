// File: src/database/index.ts
import { PrismaClient } from '@prisma/client';
import { redisClient } from '@/cache/redis';
import logger from '@/utils/logger';

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Closing database connections...');
    await prisma.$disconnect();
    await redisClient.quit();
    process.exit(0);
});

export { redisClient };