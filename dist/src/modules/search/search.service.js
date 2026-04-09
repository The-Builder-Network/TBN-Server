"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
let SearchService = class SearchService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async searchTradespeople(query) {
        const { query: searchTerm, serviceSlug, sort = 'rating', order = 'desc', page = 1, perPage = 20, } = query;
        const where = {
            verificationStatus: 'APPROVED',
        };
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
        const sortMap = {
            rating: 'avgRating',
            reviewCount: 'reviewCount',
            completedJobs: 'completedJobs',
        };
        const [total, profiles] = await Promise.all([
            this.prisma.tradespersonProfile.count({ where: where }),
            this.prisma.tradespersonProfile.findMany({
                where: where,
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
            services: p.services.map((s) => s.serviceSlug),
        }));
        return {
            data,
            meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
        };
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], SearchService);
//# sourceMappingURL=search.service.js.map