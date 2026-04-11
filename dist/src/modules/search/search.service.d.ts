import { PrismaService } from '../../prisma/prisma.service.js';
import type { SearchTradespeopleQueryDto } from './dto/search-tradespeople-query.dto.js';
export declare class SearchService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    searchTradespeople(query: SearchTradespeopleQueryDto): Promise<{
        data: {
            userId: string;
            username: string;
            name: string;
            avatarUrl: string | null;
            companyName: string | null;
            trade: string | null;
            bio: string | null;
            postcode: string | null;
            avgRating: number;
            reviewCount: number;
            completedJobs: number;
            verified: boolean;
            guarantee: boolean;
            services: string[];
        }[];
        meta: {
            page: number;
            perPage: number;
            total: number;
            totalPages: number;
        };
    }>;
}
