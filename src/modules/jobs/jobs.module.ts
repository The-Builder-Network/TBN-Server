import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { PostcodeService } from './postcode.service.js';
import { UploadsModule } from '../uploads/uploads.module.js';

@Module({
  imports: [UploadsModule],
  controllers: [JobsController],
  providers: [JobsService, PostcodeService],
  exports: [JobsService],
})
export class JobsModule {}
