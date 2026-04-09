import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Count ACTIVE jobs (proxy for available leads) near a postcode.
   * Since we may not have lat/lng for the postcode at this point, we do a simple
   * count of all ACTIVE jobs — in a real scenario you'd geocode the postcode
   * and filter by distance. For the MVP trust-signal this is fine.
   */
  async countAvailableLeadsNear(
    _postcode: string,
    _radiusMiles: number,
  ): Promise<number> {
    const count = await this.prisma.job.count({
      where: { status: 'ACTIVE' },
    });
    return count;
  }
}
