import { PrismaService } from '../../prisma/prisma.service.js';
export declare class MaintenanceService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    closeStaleJobs(): Promise<void>;
    expireStaleLeads(): Promise<void>;
}
