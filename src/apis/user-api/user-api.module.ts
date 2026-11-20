import { Module } from '@nestjs/common';
import { UserApiController } from './user-api.controller';
import { UserApiService } from './user-api.service';
import { UserRepoModule } from '../../repositories/user-repo/user-repo.module';
import { SecurityModule } from 'src/modules/security/security.module';
import { BlockRepoModule } from '../../repositories/block-repo/block-repo.module';
import { MailModule } from '../../modules/mail/mail.module';
import { FollowRepoModule } from '../../repositories/follow-repo/follow-repo.module';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from '../../auth/constants';

@Module({
  controllers: [UserApiController],
  providers: [UserApiService],
  imports: [
    UserRepoModule,
    SecurityModule,
    BlockRepoModule,
    MailModule,
    FollowRepoModule,
    JwtModule.register({
      secret: process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-secret',
      signOptions: { expiresIn: '30d' },
    }),
  ],
  exports: [UserApiService],
})
export class UserApiModule {}
