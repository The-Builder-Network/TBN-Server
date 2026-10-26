import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service.js';
import { PostcodeService } from './postcode.service.js';
import { CreditsService } from '../modules/credits/credits.service.js';

/** App-wide services available to every module without importing. */
@Global()
@Module({
  providers: [MailService, PostcodeService, CreditsService],
  exports: [MailService, PostcodeService, CreditsService],
})
export class CommonModule {}
