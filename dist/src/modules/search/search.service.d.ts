import { PrismaService } from '../../prisma/prisma.service.js';
import type { SearchTradespeopleQueryDto } from './dto/search-tradespeople-query.dto.js';
export declare class SearchService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    searchTradespeople(query: SearchTradespeopleQueryDto): Promise<{
        data: any;
        meta: {
            page: number;
            perPage: number;
            total: any;
            totalPages: number;
        };
    }>;
}
