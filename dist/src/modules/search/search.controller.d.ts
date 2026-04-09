import { SearchService } from './search.service.js';
import { SearchTradespeopleQueryDto } from './dto/search-tradespeople-query.dto.js';
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
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
