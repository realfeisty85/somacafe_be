import { Module } from '@nestjs/common';
import { PostRepoService } from './post-repo.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepoModule } from '../user-repo/user-repo.module';
import { PostEntity } from './entities/post.entity';
import { MuteRepoModule } from '../mute-repo/mute-repo.module';
import { LikeEntity } from './entities/like.entity';
import { CommentEntity } from './entities/comment.entity';
import { PollOptionEntity } from './entities/poll.option.entity';
import { PollEntity } from './entities/poll.entity';
import { PollVoteEntity } from './entities/poll.vote.entity';
import { PostHashtagsEntity } from './entities/post.hashtags.entity';
import { HttpModule } from '@nestjs/axios';
import { LinkMetaEntity } from './entities/link.meta.entity';
import { PostMentionsEntity } from './entities/post.mentions.entity';
import { FollowRepoModule } from '../follow-repo/follow-repo.module';
import { PostTempImageEntity } from './entities/post.temp.image.entity';
import { NotificationsRepoModule } from '../notifications-repo/notifications-repo.module';
import { NotificationsApiModule } from '../../apis/notifications-api/notifications-api.module';

@Module({
  providers: [PostRepoService],
  imports: [
    TypeOrmModule.forFeature([
      PostEntity,
      LikeEntity,
      CommentEntity,
      PollOptionEntity,
      PollEntity,
      PollVoteEntity,
      PostHashtagsEntity,
      LinkMetaEntity,
      PostMentionsEntity,
      PostTempImageEntity,
    ]),
    HttpModule.register({
      // headers:{
      //   'User-Agent' : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.41 Safari/537.36'
      // }
    }),
    UserRepoModule,
    MuteRepoModule,
    FollowRepoModule,
    NotificationsApiModule,
  ],
  exports: [PostRepoService],
})
export class PostRepoModule {}
