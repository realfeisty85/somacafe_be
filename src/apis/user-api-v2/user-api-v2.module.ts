import { Module } from '@nestjs/common';
import { UserApiV2Controller } from './user-api-v2.controller';
import { UserApiModule } from '../user-api/user-api.module';
import { MailModule } from '../../modules/mail/mail.module';
import { ResetApiModule } from '../reset-api/reset-api.module';
import { UserRepoModule } from '../../repositories/user-repo/user-repo.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../../auth/auth.module';
import { jwtConstants } from '../../auth/constants';
import { PostApiModule } from '../post-api/post-api.module';
import { BlockApiModule } from '../block-api/block-api.module';
import { MuteApiModule } from '../mute-api/mute-api.module';
import { ReportApiModule } from '../report-api/report-api.module';

@Module({
  controllers: [UserApiV2Controller],
  imports: [
    UserApiModule,
    MailModule,
    ResetApiModule,
    UserRepoModule,
    PostApiModule,
    BlockApiModule,
    MuteApiModule,
    AuthModule,
  ],
})
export class UserApiV2Module {}
