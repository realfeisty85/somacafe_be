import { Module } from '@nestjs/common';
import { FollowRepoService } from './follow-repo.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FollowEntity } from './entities/follow.entity';
import { UserRepoModule } from '../user-repo/user-repo.module';

@Module({
  providers: [FollowRepoService],
  imports: [TypeOrmModule.forFeature([FollowEntity]), UserRepoModule],
  exports: [FollowRepoService],
})
export class FollowRepoModule {}
