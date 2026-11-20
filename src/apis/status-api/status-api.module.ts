import { Module } from '@nestjs/common';
import { StatusApiController } from './status-api.controller';
import { StatusApiService } from './status-api.service';
import { UserApiService } from '../user-api/user-api.service';
import { PostApiModule } from '../post-api/post-api.module';
import { UserRepoModule } from '../../repositories/user-repo/user-repo.module';
import { UserApiModule } from '../user-api/user-api.module';
import { PostRepoModule } from '../../repositories/post-repo/post-repo.module';
import { MessagingApiModule } from '../messaging-api/messaging-api.module';
import { NotificationsApiModule } from '../notifications-api/notifications-api.module';

@Module({
  imports: [
    PostApiModule,
    UserApiModule,
    UserRepoModule,
    PostRepoModule,
    MessagingApiModule,
    NotificationsApiModule,
  ],
  controllers: [StatusApiController],
  providers: [StatusApiService],
})
export class StatusApiModule {}
