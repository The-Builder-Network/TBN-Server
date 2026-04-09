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
var MaintenanceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_js_1 = require("../../prisma/prisma.service.js");
let MaintenanceService = MaintenanceService_1 = class MaintenanceService {
    prisma;
    logger = new common_1.Logger(MaintenanceService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async closeStaleJobs() {
        const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
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
        this.logger.log(`closeStaleJobs: closed ${count} stale job(s) (0 interest, >14 days old)`);
    }
    async expireStaleLeads() {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const { count } = await this.prisma.lead.updateMany({
            where: {
                status: 'AVAILABLE',
                createdAt: { lt: cutoff },
            },
            data: { status: 'EXPIRED' },
        });
        if (count > 0) {
            this.logger.log(`expireStaleLeads: expired ${count} lead(s) older than 7 days`);
        }
        else {
            this.logger.log('expireStaleLeads: no stale leads found');
        }
    }
};
exports.MaintenanceService = MaintenanceService;
__decorate([
    (0, schedule_1.Cron)('0 2 * * *', { timeZone: 'UTC' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaintenanceService.prototype, "closeStaleJobs", null);
__decorate([
    (0, schedule_1.Cron)('0 2 * * *', { timeZone: 'UTC' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MaintenanceService.prototype, "expireStaleLeads", null);
exports.MaintenanceService = MaintenanceService = MaintenanceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], MaintenanceService);
//# sourceMappingURL=maintenance.service.js.map