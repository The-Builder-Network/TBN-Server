import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { SearchTradespeopleQueryDto } from './dto/search-tradespeople-query.dto.js';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchTradespeople(query: SearchTradespeopleQueryDto) {
    const {
      query: searchTerm,
      serviceSlug,
      guarantee,
      sort = 'rating',
      order = 'desc',
      page = 1,
      perPage = 20,
    } = query;

    const where: Record<string, unknown> = {
      verificationStatus: 'APPROVED',
    };

    // Text search on company name, bio, or trade
    if (searchTerm) {
      where.OR = [
        { companyName: { contains: searchTerm, mode: 'insensitive' } },
        { bio: { contains: searchTerm, mode: 'insensitive' } },
        { trade: { contains: searchTerm, mode: 'insensitive' } },
        { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    if (serviceSlug) {
      where.services = { some: { serviceSlug } };
    }

    if (guarantee !== undefined) {
      where.guarantee = guarantee;
    }

    const sortMap: Record<string, string> = {
      rating: 'avgRating',
      reviewCount: 'reviewCount',
      completedJobs: 'completedJobs',
    };

    const [total, profiles] = await Promise.all([
      this.prisma.tradespersonProfile.count({ where: where as never }),
      this.prisma.tradespersonProfile.findMany({
        where: where as never,
        orderBy: { [sortMap[sort] ?? 'avgRating']: order },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          services: { select: { serviceSlug: true } },
        },
      }),
    ]);

    const data = profiles.map((p) => ({
      userId: p.user.id,
      username: p.username,
      name: p.user.name,
      avatarUrl: p.user.avatarUrl,
      companyName: p.companyName,
      trade: p.trade,
      bio: p.bio ? p.bio.slice(0, 200) : null,
      postcode: p.postcode,
      avgRating: p.avgRating,
      reviewCount: p.reviewCount,
      completedJobs: p.completedJobs,
      verified: p.verificationStatus === 'APPROVED',
      guarantee: p.guarantee,
      services: p.services.map((s) => s.serviceSlug),
    }));

    return {
      data,
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    };
  }
}
