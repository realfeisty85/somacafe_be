import { Module } from '@nestjs/common';
import { ReportApiService } from './report-api.service';
import { ReportApiController } from './report-api.controller';
import { ReportRepoModule } from '../../repositories/report-repo/report-repo.module';
import { PostRepoModule } from 'src/repositories/post-repo/post-repo.module';

@Module({
  providers: [ReportApiService],
  controllers: [ReportApiController],
  imports: [ReportRepoModule],
  exports: [ReportApiService],
})
export class ReportApiModule {}
