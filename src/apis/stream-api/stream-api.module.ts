import { Module } from '@nestjs/common';

import { HttpModule } from '@nestjs/axios';
import { StreamApiController } from './stream-api.controller';
import { StreamApiService } from './stream-api.service';
import { StreamRepoModule } from 'src/repositories/stream-repo/stream-repo.module';
import { UserApiModule } from '../user-api/user-api.module';
import { FollowRepoModule } from 'src/repositories/follow-repo/follow-repo.module';
import { PostApiModule } from '../post-api/post-api.module';

@Module({
  controllers: [StreamApiController],
  providers: [StreamApiService],
  exports: [StreamApiService],
  imports: [
    StreamRepoModule,
    UserApiModule,
    FollowRepoModule,
    PostApiModule,
    HttpModule,
  ],
})
export class StreamApiModule {}
