import { Module } from '@nestjs/common';
import { FollowApiV2Controller } from './follow-api-v2.controller';
import { FollowApiV2Service } from './follow-api-v2.service';
import { UserApiModule } from '../user-api/user-api.module';
import { FollowRepoModule } from '../../repositories/follow-repo/follow-repo.module';
import { FollowApiModule } from '../follow-api/follow-api.module';

@Module({
  controllers: [FollowApiV2Controller],
  providers: [FollowApiV2Service],
  imports: [UserApiModule, FollowRepoModule, FollowApiModule],
})
export class FollowApiV2Module {}
