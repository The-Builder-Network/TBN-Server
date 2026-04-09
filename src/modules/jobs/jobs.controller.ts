import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipeBuilder,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/auth.service.js';
import { JobsService } from './jobs.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { GetJobsQueryDto } from './dto/get-jobs-query.dto.js';
import { UpdateJobStatusDto } from './dto/update-job-status.dto.js';
import { ValidationPipe } from '@nestjs/common';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  @Roles('HOMEOWNER')
  @UseInterceptors(
    FilesInterceptor('attachments', 5, {
      storage: memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB per file
    }),
  )
  async createJob(
    @CurrentUser() user: JwtPayload,
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: CreateJobDto,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^(image\/jpeg|image\/png|application\/pdf)$/,
        })
        .build({ fileIsRequired: false }),
    )
    attachments: Express.Multer.File[] = [],
  ) {
    return this.jobsService.createJob(user.sub, dto, attachments ?? []);
  }

  @Get()
  @Roles('HOMEOWNER')
  async getJobs(
    @CurrentUser() user: JwtPayload,
    @Query(new ValidationPipe({ transform: true, whitelist: true }))
    query: GetJobsQueryDto,
  ) {
    return this.jobsService.getJobs(user.sub, query);
  }

  @Get(':id')
  async getJob(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.jobsService.getJob(id, user.sub, user.role);
  }

  @Patch(':id')
  @Roles('HOMEOWNER')
  @HttpCode(HttpStatus.OK)
  async updateJobStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true })) dto: UpdateJobStatusDto,
  ) {
    return this.jobsService.updateJobStatus(id, user.sub, dto);
  }
}
