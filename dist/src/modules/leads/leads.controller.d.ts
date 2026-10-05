import { LeadsService } from './leads.service.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { GetLeadsQueryDto } from './dto/get-leads-query.dto.js';
import { ExpressInterestDto } from './dto/express-interest.dto.js';
export declare class LeadsController {
    private readonly leadsService;
    constructor(leadsService: LeadsService);
    countLeads(postcode: string, radius: string): Promise<{
        count: number;
    }>;
    getLeads(user: JwtPayload, query: GetLeadsQueryDto): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            perPage: number;
            totalPages: number;
        };
    }>;
    getLead(user: JwtPayload, id: string): Promise<any>;
    expressInterest(user: JwtPayload, id: string, dto: ExpressInterestDto): Promise<any>;
}
