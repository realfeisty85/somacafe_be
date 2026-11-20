import { Module } from '@nestjs/common';
import { ResetApiController } from './reset-api.controller';
import { ResetApiService } from './reset-api.service';
import { ResettokenRepoModule } from '../../repositories/resettoken-repo/resettoken-repo.module';
import { UserApiModule } from '../user-api/user-api.module';
import { MailModule } from '../../modules/mail/mail.module';

@Module({
  controllers: [ResetApiController],
  providers: [ResetApiService],
  imports: [ResettokenRepoModule, UserApiModule, MailModule],
  exports: [ResetApiService],
})
export class ResetApiModule {}
