import { LeadsService } from './leads.service.js';
export declare class LeadsController {
    private readonly leadsService;
    constructor(leadsService: LeadsService);
    countLeads(postcode: string, radius: string): Promise<{
        count: number;
    }>;
}
