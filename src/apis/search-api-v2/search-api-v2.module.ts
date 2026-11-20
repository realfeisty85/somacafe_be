import { Module } from '@nestjs/common';
import { SearchApiV2Controller } from './search-api-v2.controller';
import { SearchApiV2Service } from './search-api-v2.service';
import { PostApiModule } from '../post-api/post-api.module';
import { UserApiModule } from '../user-api/user-api.module';
import { UserRepoModule } from '../../repositories/user-repo/user-repo.module';
import { PostRepoModule } from '../../repositories/post-repo/post-repo.module';

@Module({
  controllers: [SearchApiV2Controller],
  providers: [SearchApiV2Service],
  imports: [PostApiModule, UserApiModule, UserRepoModule, PostRepoModule],
})
export class SearchApiV2Module {}
