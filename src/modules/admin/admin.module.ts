import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { ReviewsModule } from '../reviews/reviews.module.js';

@Module({
  imports: [NotificationsModule, UploadsModule, JobsModule, ReviewsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
