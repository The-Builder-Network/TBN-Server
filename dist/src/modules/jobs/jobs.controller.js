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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const jwt_auth_guard_js_1 = require("../auth/guards/jwt-auth.guard.js");
const roles_guard_js_1 = require("../auth/guards/roles.guard.js");
const roles_decorator_js_1 = require("../auth/decorators/roles.decorator.js");
const current_user_decorator_js_1 = require("../auth/decorators/current-user.decorator.js");
const jobs_service_js_1 = require("./jobs.service.js");
const create_job_dto_js_1 = require("./dto/create-job.dto.js");
const get_jobs_query_dto_js_1 = require("./dto/get-jobs-query.dto.js");
const update_job_status_dto_js_1 = require("./dto/update-job-status.dto.js");
const common_2 = require("@nestjs/common");
let JobsController = class JobsController {
    jobsService;
    constructor(jobsService) {
        this.jobsService = jobsService;
    }
    async createJob(user, dto, attachments = []) {
        return this.jobsService.createJob(user.sub, dto, attachments ?? []);
    }
    async getJobs(user, query) {
        return this.jobsService.getJobs(user.sub, query);
    }
    async getJob(user, id) {
        return this.jobsService.getJob(id, user.sub, user.role);
    }
    async updateJobStatus(user, id, dto) {
        return this.jobsService.updateJobStatus(id, user.sub, dto);
    }
};
exports.JobsController = JobsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_js_1.Roles)('HOMEOWNER'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('attachments', 5, {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 15 * 1024 * 1024 },
    })),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new common_2.ValidationPipe({ transform: true, whitelist: true }))),
    __param(2, (0, common_1.UploadedFiles)(new common_1.ParseFilePipeBuilder()
        .addFileTypeValidator({
        fileType: /^(image\/jpeg|image\/png|application\/pdf)$/,
    })
        .build({ fileIsRequired: false }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_job_dto_js_1.CreateJobDto, Array]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "createJob", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_js_1.Roles)('HOMEOWNER'),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Query)(new common_2.ValidationPipe({ transform: true, whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, get_jobs_query_dto_js_1.GetJobsQueryDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getJobs", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "getJob", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_js_1.Roles)('HOMEOWNER'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, current_user_decorator_js_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)(new common_2.ValidationPipe({ whitelist: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_job_status_dto_js_1.UpdateJobStatusDto]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "updateJobStatus", null);
exports.JobsController = JobsController = __decorate([
    (0, common_1.Controller)('api/v1/jobs'),
    (0, common_1.UseGuards)(jwt_auth_guard_js_1.JwtAuthGuard, roles_guard_js_1.RolesGuard),
    __metadata("design:paramtypes", [jobs_service_js_1.JobsService])
], JobsController);
//# sourceMappingURL=jobs.controller.js.map