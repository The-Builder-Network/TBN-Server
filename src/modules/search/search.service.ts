import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PostcodeService } from '../../common/postcode.service.js';
import { haversineMiles, postcodeDistrict } from '../../common/geo.js';
import type { SearchTradespeopleQueryDto } from './dto/search-tradespeople-query.dto.js';

const MAX_GEO_CANDIDATES = 2000;

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postcodes: PostcodeService,
  ) {}

  async searchTradespeople(query: SearchTradespeopleQueryDto) {
    const {
      query: term,
      serviceSlug,
      guarantee,
      postcode,
      radiusMiles,
      sort = 'rating',
      order = 'desc',
    } = query;
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 20;

    // Only verified, active trades are listed publicly.
    const where: Prisma.TradespersonProfileWhereInput = {
      verificationStatus: 'APPROVED',
      user: { accountStatus: 'ACTIVE' },
      ...(serviceSlug ? { services: { some: { serviceSlug } } } : {}),
      ...(guarantee !== undefined ? { guarantee } : {}),
      ...(term
        ? {
            OR: [
              { companyName: { contains: term, mode: 'insensitive' } },
              { bio: { contains: term, mode: 'insensitive' } },
              { trade: { contains: term, mode: 'insensitive' } },
              { user: { name: { contains: term, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const include = {
      user: { select: { id: true, name: true, avatarUrl: true } },
      services: { select: { serviceSlug: true } },
    } satisfies Prisma.TradespersonProfileInclude;
    const sortField = {
      rating: 'avgRating',
      reviewCount: 'reviewCount',
      completedJobs: 'completedJobs',
    } as const;

    let total: number;
    let rows: (Prisma.TradespersonProfileGetPayload<{
      include: typeof include;
    }> & { distanceMiles?: number })[];

    if (postcode) {
      // ponytail: distance filter runs in memory over matching profiles (capped);
      // move to PostGIS / a bounding-box prefilter if the trade count grows large.
      const geo = await this.postcodes.geocode(postcode);
      const candidates = await this.prisma.tradespersonProfile.findMany({
        where: { ...where, latitude: { not: null }, longitude: { not: null } },
        include,
        take: MAX_GEO_CANDIDATES,
      });
      const covering = candidates
        .map((p) => ({
          ...p,
          distanceMiles: haversineMiles(
            geo.latitude,
            geo.longitude,
            p.latitude!,
            p.longitude!,
          ),
        }))
        .filter(
          (p) =>
            p.distanceMiles <= p.workRadiusMiles &&
            (!radiusMiles || p.distanceMiles <= radiusMiles),
        );
      const dir = order === 'asc' ? 1 : -1;
      covering.sort((a, b) =>
        sort === 'distance'
          ? a.distanceMiles - b.distanceMiles
          : dir * (a[sortField[sort]] - b[sortField[sort]]),
      );
      total = covering.length;
      rows = covering.slice((page - 1) * perPage, page * perPage);
    } else {
      const orderBy =
        sort === 'distance'
          ? { avgRating: order }
          : { [sortField[sort]]: order };
      [total, rows] = await Promise.all([
        this.prisma.tradespersonProfile.count({ where }),
        this.prisma.tradespersonProfile.findMany({
          where,
          orderBy,
          skip: (page - 1) * perPage,
          take: perPage,
          include,
        }),
      ]);
    }

    return {
      data: rows.map((p) => ({
        userId: p.user.id,
        username: p.username,
        name: p.user.name,
        avatarUrl: p.user.avatarUrl,
        companyName: p.companyName,
        trade: p.trade,
        bio: p.bio ? p.bio.slice(0, 200) : null,
        location: postcodeDistrict(p.postcode),
        distanceMiles:
          p.distanceMiles !== undefined
            ? Math.round(p.distanceMiles * 10) / 10
            : undefined,
        avgRating: p.avgRating,
        reviewCount: p.reviewCount,
        completedJobs: p.completedJobs,
        verified: true,
        guarantee: p.guarantee,
        services: [...new Set(p.services.map((s) => s.serviceSlug))],
      })),
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    };
  }
}
