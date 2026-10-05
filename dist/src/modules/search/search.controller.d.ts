import { SearchService } from './search.service.js';
import { SearchTradespeopleQueryDto } from './dto/search-tradespeople-query.dto.js';
export declare class SearchController {
    private readonly searchService;
    constructor(searchService: SearchService);
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
