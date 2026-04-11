import { Module } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { UploadsModule } from '../uploads/uploads.module.js';
import { PostcodeService } from '../jobs/postcode.service.js';
import { JobsModule } from '../jobs/jobs.module.js';

@Module({
  imports: [PrismaModule, UploadsModule, JobsModule],
  controllers: [UsersController],
  providers: [UsersService, PostcodeService],
  exports: [UsersService],
})
export class UsersModule {}
