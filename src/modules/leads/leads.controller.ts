import { Controller, Get, Query } from '@nestjs/common';
import { LeadsService } from './leads.service.js';

@Controller('api/v1/leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  /**
   * PUBLIC — Returns the count of available leads within `radius` miles of `postcode`.
   * Used on the tradesperson join page travel-radius step as a trust signal.
   * GET /api/v1/leads/count?postcode=EX379HW&radius=30
   */
  @Get('count')
  async countLeads(
    @Query('postcode') postcode: string,
    @Query('radius') radius: string,
  ) {
    const radiusNum = Math.min(Math.max(parseInt(radius || '30', 10), 1), 200);
    const count = await this.leadsService.countAvailableLeadsNear(
      postcode || '',
      radiusNum,
    );
    return { count };
  }
}
