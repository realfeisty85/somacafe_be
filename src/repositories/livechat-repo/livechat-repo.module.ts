/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LiveChatEntity } from './entities/livechat.entity';
import { LiveChatBlockListEntity } from './entities/livechat.block.entity';
import { LiveChatMuteListEntity } from './entities/livechat.mute.entity';
import { LiveChatWarningListEntity } from './entities/livechat.warning.entity';
import { UserEntity } from '../user-repo/entities/user.entity';
import { LivechatRepoService } from './livechat-repo.service';
import { LiveChatUsersListEntity } from './entities/livechat.users.entity';
import { PostHashtagsEntity } from '../post-repo/entities/post.hashtags.entity';

@Module({
  providers: [LivechatRepoService],
  imports: [
    TypeOrmModule.forFeature([
      LiveChatEntity,
      LiveChatUsersListEntity,
      LiveChatBlockListEntity,
      LiveChatWarningListEntity,
      LiveChatMuteListEntity,
      PostHashtagsEntity,
      UserEntity,
    ]),
  ],
  exports: [LivechatRepoService],
})
export class LivechatRepoModule {}
