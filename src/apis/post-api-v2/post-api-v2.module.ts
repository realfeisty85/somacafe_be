import { Module } from '@nestjs/common';
import { PostApiV2Controller } from './post-api-v2.controller';
import { PostApiV2Service } from './post-api-v2.service';
import { PostApiModule } from '../post-api/post-api.module';
import { UserApiModule } from '../user-api/user-api.module';
import { ReportApiModule } from '../report-api/report-api.module';
import { PostGateway } from './post-api-v2.gateway';

@Module({
  controllers: [PostApiV2Controller],
  providers: [PostGateway, PostApiV2Service],
  imports: [PostApiModule, UserApiModule, ReportApiModule],
})
export class PostApiV2Module {}
