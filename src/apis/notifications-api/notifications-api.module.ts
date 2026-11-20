import { Module } from '@nestjs/common';
import { NotificationsApiService } from './notifications-api.service';
import { NotificationsApiController } from './notifications-api.controller';
import { NotificationsRepoModule } from '../../repositories/notifications-repo/notifications-repo.module';
import { UserApiModule } from '../user-api/user-api.module';
import { UserRepoModule } from '../../repositories/user-repo/user-repo.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  providers: [NotificationsApiService],
  controllers: [NotificationsApiController],
  imports: [NotificationsRepoModule, UserApiModule, UserRepoModule, HttpModule],
  exports: [NotificationsApiService],
})
export class NotificationsApiModule {}
