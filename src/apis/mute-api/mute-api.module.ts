import { Module } from '@nestjs/common';
import { MuteApiService } from './mute-api.service';
import { MuteRepoModule } from '../../repositories/mute-repo/mute-repo.module';
import { PostRepoModule } from '../../repositories/post-repo/post-repo.module';
import { UserRepoModule } from '../../repositories/user-repo/user-repo.module';

@Module({
  providers: [MuteApiService],
  exports: [MuteApiService],
  imports: [MuteRepoModule, PostRepoModule, UserRepoModule],
})
export class MuteApiModule {}
