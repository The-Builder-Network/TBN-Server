import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { SearchService } from './search.service.js';
import { SearchTradespeopleQueryDto } from './dto/search-tradespeople-query.dto.js';

@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('tradespeople')
  async searchTradespeople(
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: SearchTradespeopleQueryDto,
  ) {
    return this.searchService.searchTradespeople(query);
  }
}
