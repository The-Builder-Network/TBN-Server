import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service.js';
import { JobsModule } from '../jobs/jobs.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [JobsModule, NotificationsModule],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
