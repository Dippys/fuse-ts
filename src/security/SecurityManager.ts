// src/security/SecurityManager.ts
import { PrismaClient } from '@prisma/client';
import logger from '@/utils/logger';

export class SecurityManager {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    /**
     * Validates an SSO ticket and retrieves the associated player ID
     * @param ssoTicket The SSO ticket to validate
     * @returns The player ID if the ticket is valid
     * @throws Error if the ticket is invalid or expired
     */
    public async getUserIdFromSSOTicket(ssoTicket: string): Promise<string> {
        try {
            // select a user from the database SSO column
            const ticket = await this.prisma.user.findFirst({
                where: {
                    ssoTicket: ssoTicket
                },
                select: {
                    id: true,
                    ssoTicket: true,
                    createdAt: true
                }
            })

            // Check if ticket exists and is not expired
            if (!ticket) {
                return "";
            }


            // empty ticket after use
            await this.prisma.user.update({
                where: {
                    id: ticket.id
                },
                data: {
                    ssoTicket: ""
                }
            });

            logger.debug(`Validated SSO ticket for user ID: ${ticket.id}`);

            return ticket.id;
        } catch (error) {
            logger.error(`SSO ticket validation failed: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

}

// Export a singleton instance
export const securityManager = new SecurityManager();