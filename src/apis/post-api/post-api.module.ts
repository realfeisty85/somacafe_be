import { Module } from '@nestjs/common';
import { PostApiController } from './post-api.controller';
import { PostApiService } from './post-api.service';
import { PostRepoModule } from '../../repositories/post-repo/post-repo.module';
import { UserRepoModule } from '../../repositories/user-repo/user-repo.module';

@Module({
  imports: [PostRepoModule, UserRepoModule],
  controllers: [PostApiController],
  providers: [PostApiService],
  exports: [PostApiService],
})
export class PostApiModule {}
