import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { HiringService } from '../jobs/hiring.service.js';
import {
  NotificationsService,
  type NotifyInput,
} from '../notifications/notifications.service.js';

// Arbitrary constant keys for pg advisory locks (one per task).
const LOCK_EXPIRE_LEADS = 74_210_001;
const LOCK_EXPIRE_JOBS = 74_210_002;

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hiring: HiringService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Hourly: new leads nobody responded to within their window expire. */
  @Cron(CronExpression.EVERY_HOUR)
  async expireLeads(): Promise<void> {
    const count = await this.prisma.$transaction(async (tx) => {
      const [{ locked }] = await tx.$queryRaw<
        { locked: boolean }[]
      >`SELECT pg_try_advisory_xact_lock(${LOCK_EXPIRE_LEADS}) AS locked`;
      if (!locked) return 0;
      const res = await tx.lead.updateMany({
        where: { status: 'AVAILABLE', expiresAt: { lte: new Date() } },
        data: { status: 'EXPIRED' },
      });
      return res.count;
    });
    if (count) this.logger.log(`expireLeads: expired ${count} lead(s)`);
  }

  /**
   * Hourly: open job listings past their expiry close as EXPIRED; trades still
   * waiting get their reserved credits back and are told the job closed.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireJobs(): Promise<void> {
    const notices: NotifyInput[] = [];
    const count = await this.prisma.$transaction(
      async (tx) => {
        const [{ locked }] = await tx.$queryRaw<
          { locked: boolean }[]
        >`SELECT pg_try_advisory_xact_lock(${LOCK_EXPIRE_JOBS}) AS locked`;
        if (!locked) return 0;
        const jobs = await tx.job.findMany({
          where: { status: 'ACTIVE', expiresAt: { lte: new Date() } },
          select: { id: true, title: true, homeownerId: true },
          take: 200,
        });
        for (const job of jobs) {
          await tx.job.update({
            where: { id: job.id },
            data: {
              status: 'EXPIRED',
              closedAt: new Date(),
              closeReason: 'Listing expired',
            },
          });
          const affected = await this.hiring.closeOpenLeads(
            tx,
            job.id,
            'Job listing expired',
          );
          notices.push(
            {
              userId: job.homeownerId,
              type: 'JOB_CLOSED',
              title: `Your job "${job.title}" has expired`,
              body: 'Post it again if you still need a tradesperson.',
              linkUrl: `/homeowner/my-jobs/${job.id}`,
            },
            ...affected.map<NotifyInput>((l) => ({
              userId: l.tradespersonId,
              type: 'JOB_CLOSED',
              title: `"${job.title}" is no longer available`,
              body:
                l.released > 0
                  ? `${l.released} reserved credits have been returned to your balance.`
                  : undefined,
              linkUrl: `/tradesperson/my-leads/${l.id}`,
            })),
          );
        }
        return jobs.length;
      },
      { timeout: 60_000 },
    );
    if (count) {
      this.logger.log(`expireJobs: expired ${count} job(s)`);
      await this.notifications.notifyMany(notices);
    }
  }
}
