import { LeadStatus } from '@prisma/client';
export declare class GetLeadsQueryDto {
    status?: LeadStatus;
    serviceSlug?: string;
    maxDistanceMiles?: number;
    sort?: string;
    order?: 'asc' | 'desc';
    page?: number;
    perPage?: number;
}
