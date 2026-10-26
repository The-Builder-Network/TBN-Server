import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller.js';
import { JobsService } from './jobs.service.js';
import { HiringService } from './hiring.service.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [UploadsModule, NotificationsModule],
  controllers: [JobsController],
  providers: [JobsService, HiringService],
  exports: [JobsService, HiringService],
})
export class JobsModule {}
