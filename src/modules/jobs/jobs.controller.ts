import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
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
import { HiringService } from './hiring.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { GetJobsQueryDto } from './dto/get-jobs-query.dto.js';
import {
  CloseJobDto,
  DeclineLeadDto,
  InviteTradespersonDto,
  UpdateJobDto,
} from './dto/job-actions.dto.js';

const MAX_FILES = 10;
const fileUpload = () =>
  FilesInterceptor('attachments', MAX_FILES, {
    storage: memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
  });
const fileTypes = () =>
  new ParseFilePipeBuilder()
    .addFileTypeValidator({
      fileType: /^(image\/(jpeg|png|webp)|application\/pdf)$/,
    })
    .build({ fileIsRequired: false });

/** Homeowner job management. Trades access jobs through /leads. */
@Controller('api/v1/jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('HOMEOWNER')
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly hiring: HiringService,
  ) {}

  @Post()
  @UseInterceptors(fileUpload())
  createJob(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateJobDto,
    @UploadedFiles(fileTypes()) attachments: Express.Multer.File[] = [],
  ) {
    return this.jobs.createJob(user.sub, dto, attachments ?? []);
  }

  @Get()
  getJobs(@CurrentUser() user: JwtPayload, @Query() query: GetJobsQueryDto) {
    return this.jobs.getJobs(user.sub, query);
  }

  @Get(':id')
  getJob(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.jobs.getJobForHomeowner(id, user.sub);
  }

  @Patch(':id')
  updateJob(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobs.updateDescription(id, user.sub, dto.description);
  }

  @Post(':id/attachments')
  @UseInterceptors(fileUpload())
  addAttachments(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @UploadedFiles(fileTypes()) files: Express.Multer.File[] = [],
  ) {
    return this.jobs.addAttachments(id, user.sub, files ?? []);
  }

  @Delete(':id/attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAttachment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.jobs.removeAttachment(id, user.sub, attachmentId);
  }

  @Post(':id/invites')
  @HttpCode(HttpStatus.OK)
  invite(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: InviteTradespersonDto,
  ) {
    return this.jobs.inviteTradesperson(id, user.sub, dto.username);
  }

  @Post(':id/leads/:leadId/shortlist')
  @HttpCode(HttpStatus.OK)
  shortlist(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('leadId') leadId: string,
  ) {
    return this.hiring.shortlist(id, user.sub, leadId);
  }

  @Post(':id/leads/:leadId/decline')
  @HttpCode(HttpStatus.OK)
  decline(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('leadId') leadId: string,
    @Body() dto: DeclineLeadDto,
  ) {
    return this.hiring.decline(id, user.sub, leadId, dto.reason);
  }

  @Post(':id/leads/:leadId/hire')
  @HttpCode(HttpStatus.OK)
  hire(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('leadId') leadId: string,
  ) {
    return this.hiring.hire(id, user.sub, leadId);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.hiring.complete(id, user.sub);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  close(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CloseJobDto,
  ) {
    return this.hiring.close(id, user.sub, dto.reason);
  }
}
