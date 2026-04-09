import { PrismaService } from '../../prisma/prisma.service.js';
export declare class LeadsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    countAvailableLeadsNear(_postcode: string, _radiusMiles: number): Promise<number>;
}
