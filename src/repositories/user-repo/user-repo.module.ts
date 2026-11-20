import { Module } from '@nestjs/common';
import { UserEntity } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepoService } from './user-repo.service';
import { BlockRepoModule } from '../block-repo/block-repo.module';
import { MuteRepoModule } from '../mute-repo/mute-repo.module';
import { InviteUserEntity } from './entities/invite.user.entity';
import { UserSessionEntity } from './entities/user.session.entity';
import { FollowRepoModule } from '../follow-repo/follow-repo.module';
import { FollowEntity } from '../follow-repo/entities/follow.entity';
import { RedisModule } from '../../modules/redis/redis.module';
import { ContactUsEntity } from './entities/contact.us.entity';
import { UserTokensEntity } from './entities/user.tokens.entity';
import { UserEmojiEntity } from './entities/user.emoji.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      InviteUserEntity,
      UserSessionEntity,
      FollowEntity,
      ContactUsEntity,
      UserTokensEntity,
      UserEmojiEntity,
    ]),
    BlockRepoModule,
    MuteRepoModule,
    RedisModule,
  ],
  providers: [UserRepoService],
  exports: [TypeOrmModule, UserRepoService],
})
export class UserRepoModule {}
