import { Module } from '@nestjs/common';
import { SearchApiService } from './search-api.service';
import { SearchApiController } from './search-api.controller';
import { UserRepoModule } from '../../repositories/user-repo/user-repo.module';

@Module({
  providers: [SearchApiService],
  controllers: [SearchApiController],
  imports: [UserRepoModule],
})
export class SearchApiModule {}
