import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UploadsService } from '../uploads/uploads.service.js';
import { PostcodeService } from './postcode.service.js';
import { calculateCreditCost } from './credit-cost.helper.js';
import type { CreateJobDto } from './dto/create-job.dto.js';
import type { GetJobsQueryDto } from './dto/get-jobs-query.dto.js';
import type { UpdateJobStatusDto } from './dto/update-job-status.dto.js';
import { JobStatus } from '@prisma/client';

// ── Haversine distance (miles) ────────────────────────────────────────────────
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 3959; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly postcode: PostcodeService,
  ) {}

  // ── Create job ────────────────────────────────────────────────────────────

  async createJob(
    homeownerId: string,
    dto: CreateJobDto,
    attachmentFiles: Express.Multer.File[],
  ) {
    // 1. Geocode postcode
    const geo = await this.postcode.geocode(dto.postcode);

    // 2. Upload attachments to R2
    const uploadedAttachments: {
      fileUrl: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }[] = [];

    for (const file of attachmentFiles) {
      const url = await this.uploads.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        'job-attachments',
      );
      uploadedAttachments.push({
        fileUrl: url,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      });
    }

    // 3. Create Job + attachments in DB
    const job = await this.prisma.job.create({
      data: {
        homeownerId,
        title: dto.title,
        description: dto.description,
        serviceSlug: dto.serviceSlug,
        tradeSlug: dto.tradeSlug,
        postcode: dto.postcode.toUpperCase().trim(),
        placeName: geo.placeName,
        latitude: geo.latitude,
        longitude: geo.longitude,
        answersJson: (dto.answersJson ?? {}) as object,
        status: JobStatus.ACTIVE,
        attachments: {
          create: uploadedAttachments,
        },
      },
    });

    // 4. Run matching algorithm
    const matchedCount = await this.matchTradespersons(job.id, dto.serviceSlug, geo);

    return {
      id: job.id,
      jobNumber: job.jobNumber,
      status: job.status,
      matchedCount,
      createdAt: job.createdAt,
    };
  }

  // ── Matching algorithm ────────────────────────────────────────────────────

  private async matchTradespersons(
    jobId: string,
    serviceSlug: string,
    geo: { latitude: number; longitude: number },
  ): Promise<number> {
    const creditCost = calculateCreditCost(serviceSlug);

    // Fetch all verified tradespeople with the matching service
    const candidates = await this.prisma.tradespersonProfile.findMany({
      where: {
        verificationStatus: 'APPROVED',
        latitude: { not: null },
        longitude: { not: null },
        services: {
          some: { serviceSlug },
        },
      },
      select: {
        userId: true,
        latitude: true,
        longitude: true,
        workRadiusMiles: true,
      },
    });

    const matched: { userId: string; distanceMiles: number }[] = [];

    for (const tp of candidates) {
      if (tp.latitude === null || tp.longitude === null) continue;
      const dist = haversineDistance(
        geo.latitude, geo.longitude,
        tp.latitude, tp.longitude,
      );
      if (dist <= tp.workRadiusMiles) {
        matched.push({ userId: tp.userId, distanceMiles: dist });
      }
    }

    if (matched.length === 0) return 0;

    // Create Lead rows (skip existing ones)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.lead.createMany({
      data: matched.map((m) => ({
        jobId,
        tradespersonId: m.userId,
        creditCost,
        distanceMiles: m.distanceMiles,
        expiresAt,
      })),
      skipDuplicates: true,
    });

    return matched.length;
  }

  // ── Get jobs (paginated, homeowner's own) ─────────────────────────────────

  async getJobs(homeownerId: string, query: GetJobsQueryDto) {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;
    const skip = (page - 1) * perPage;

    const where = {
      homeownerId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [total, jobs] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        skip,
        take: perPage,
        orderBy: {
          [query.sort ?? 'createdAt']: query.order ?? 'desc',
        },
        select: {
          id: true,
          jobNumber: true,
          title: true,
          status: true,
          serviceSlug: true,
          postcode: true,
          placeName: true,
          createdAt: true,
          _count: {
            select: {
              leads: { where: { status: { in: ['INTERESTED', 'SHORTLISTED', 'CONTACTED', 'HIRED'] } } },
            },
          },
        },
      }),
    ]);

    return {
      data: jobs.map((j) => ({
        id: j.id,
        jobNumber: j.jobNumber,
        title: j.title,
        status: j.status,
        serviceSlug: j.serviceSlug,
        postcode: j.postcode,
        placeName: j.placeName,
        interestedCount: j._count.leads,
        createdAt: j.createdAt,
      })),
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  // ── Get job detail ────────────────────────────────────────────────────────

  async getJob(jobId: string, requesterId: string, requesterRole: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        attachments: true,
        leads: {
          where: {
            status: { in: ['INTERESTED', 'SHORTLISTED', 'CONTACTED', 'HIRED'] },
          },
          include: {
            tradesperson: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                tradespersonProfile: {
                  select: {
                    username: true,
                    companyName: true,
                    avgRating: true,
                    reviewCount: true,
                    verificationStatus: true,
                  },
                },
              },
            },
          },
          orderBy: { interestedAt: 'desc' },
        },
        quotes: {
          where: { status: { in: ['PENDING', 'ACCEPTED'] } },
          select: {
            id: true,
            tradespersonId: true,
            message: true,
            amountPence: true,
            estimateRange: true,
            status: true,
          },
        },
      },
    });

    if (!job) throw new NotFoundException('Job not found');

    // Access control: homeowner can only see their own job;
    // tradesperson can see job only if they have a lead for it
    if (requesterRole === 'HOMEOWNER' && job.homeownerId !== requesterId) {
      throw new ForbiddenException('Not your job');
    }
    if (requesterRole === 'TRADESPERSON') {
      const lead = await this.prisma.lead.findFirst({
        where: { jobId, tradespersonId: requesterId },
      });
      if (!lead) throw new ForbiddenException('No lead for this job');
    }

    return {
      id: job.id,
      jobNumber: job.jobNumber,
      title: job.title,
      description: job.description,
      serviceSlug: job.serviceSlug,
      postcode: job.postcode,
      placeName: job.placeName,
      status: job.status,
      answersJson: job.answersJson,
      createdAt: job.createdAt,
      attachments: job.attachments.map((a) => ({
        id: a.id,
        fileUrl: a.fileUrl,
        fileName: a.fileName,
        mimeType: a.mimeType,
      })),
      responses: job.leads.map((lead) => {
        const quote = job.quotes.find((q) => q.tradespersonId === lead.tradespersonId);
        return {
          leadId: lead.id,
          leadStatus: lead.status,
          tradesperson: {
            id: lead.tradesperson.id,
            name: lead.tradesperson.name,
            avatarUrl: lead.tradesperson.avatarUrl,
            username: lead.tradesperson.tradespersonProfile?.username,
            companyName: lead.tradesperson.tradespersonProfile?.companyName,
            avgRating: lead.tradesperson.tradespersonProfile?.avgRating ?? 0,
            reviewCount: lead.tradesperson.tradespersonProfile?.reviewCount ?? 0,
            verified:
              lead.tradesperson.tradespersonProfile?.verificationStatus === 'APPROVED',
          },
          quote: quote
            ? {
                id: quote.id,
                message: quote.message,
                amountPence: quote.amountPence,
                estimateRange: quote.estimateRange,
                status: quote.status,
              }
            : undefined,
        };
      }),
    };
  }

  // ── Update job status ─────────────────────────────────────────────────────

  async updateJobStatus(
    jobId: string,
    homeownerId: string,
    dto: UpdateJobStatusDto,
  ) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });

    if (!job) throw new NotFoundException('Job not found');
    if (job.homeownerId !== homeownerId) throw new ForbiddenException('Not your job');

    const terminal: JobStatus[] = ['CANCELLED', 'CLOSED', 'COMPLETED'];
    if (terminal.includes(job.status)) {
      throw new BadRequestException(`Cannot update a job with status ${job.status}`);
    }

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: dto.status },
    });

    return { id: updated.id, status: updated.status };
  }
}
