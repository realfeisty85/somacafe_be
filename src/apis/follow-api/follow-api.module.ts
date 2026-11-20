import { Module } from '@nestjs/common';
import { FollowApiController } from './follow-api.controller';
import { FollowApiService } from './follow-api.service';
import { FollowRepoModule } from '../../repositories/follow-repo/follow-repo.module';

@Module({
  controllers: [FollowApiController],
  providers: [FollowApiService],
  imports: [FollowRepoModule],
})
export class FollowApiModule {}
