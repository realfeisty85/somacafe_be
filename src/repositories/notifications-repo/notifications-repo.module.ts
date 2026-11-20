import { Module } from '@nestjs/common';
import { NotificationsRepoService } from './notifications-repo.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersNotifyConfigEntity } from './entities/users.notify.config.entity';
import { UsersNotifyEntity } from './entities/users.notify.entity';
import { PostApiModule } from '../../apis/post-api/post-api.module';
import { UserEntity } from '../user-repo/entities/user.entity';
import { PostEntity } from '../post-repo/entities/post.entity';
import { HttpModule } from '@nestjs/axios';
import { UserRepoModule } from '../user-repo/user-repo.module';

@Module({
  providers: [NotificationsRepoService],
  exports: [NotificationsRepoService],
  imports: [
    UserRepoModule,
    HttpModule,
    TypeOrmModule.forFeature([
      UsersNotifyConfigEntity,
      UsersNotifyEntity,
      UserEntity,
      PostEntity,
    ]),
  ],
})
export class NotificationsRepoModule {}
