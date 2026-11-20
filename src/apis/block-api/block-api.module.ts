import { Module } from '@nestjs/common';
import { BlockApiController } from './block-api.controller';
import { BlockApiService } from './block-api.service';
import { BlockRepoModule } from '../../repositories/block-repo/block-repo.module';
import { PostRepoModule } from '../../repositories/post-repo/post-repo.module';
import { UserRepoModule } from '../../repositories/user-repo/user-repo.module';

@Module({
  controllers: [BlockApiController],
  providers: [BlockApiService],
  imports: [BlockRepoModule, PostRepoModule, UserRepoModule],
  exports: [BlockApiService],
})
export class BlockApiModule {}
