import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Daily at 02:00 UTC — close ACTIVE jobs that have 0 tradesperson interest
   * and were posted more than 14 days ago.
   */
  @Cron('0 2 * * *', { timeZone: 'UTC' })
  async closeStaleJobs(): Promise<void> {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // Find ACTIVE jobs older than 14 days that have no leads with expressed interest
    const staleJobs = await this.prisma.job.findMany({
      where: {
        status: 'ACTIVE',
        createdAt: { lt: cutoff },
        leads: {
          none: {
            status: { in: ['INTERESTED', 'CONTACTED', 'HIRED'] },
          },
        },
      },
      select: { id: true },
    });

    if (staleJobs.length === 0) {
      this.logger.log('closeStaleJobs: no stale jobs found');
      return;
    }

    const ids = staleJobs.map((j) => j.id);

    const { count } = await this.prisma.job.updateMany({
      where: { id: { in: ids } },
      data: { status: 'CLOSED' },
    });

    this.logger.log(
      `closeStaleJobs: closed ${count} stale job(s) (0 interest, >14 days old)`,
    );
  }

  /**
   * Daily at 02:00 UTC — expire AVAILABLE leads that are older than 7 days.
   * Tradespeople who haven't acted within the window lose the opportunity.
   */
  @Cron('0 2 * * *', { timeZone: 'UTC' })
  async expireStaleLeads(): Promise<void> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { count } = await this.prisma.lead.updateMany({
      where: {
        status: 'AVAILABLE',
        createdAt: { lt: cutoff },
      },
      data: { status: 'EXPIRED' },
    });

    if (count > 0) {
      this.logger.log(
        `expireStaleLeads: expired ${count} lead(s) older than 7 days`,
      );
    } else {
      this.logger.log('expireStaleLeads: no stale leads found');
    }
  }
}
