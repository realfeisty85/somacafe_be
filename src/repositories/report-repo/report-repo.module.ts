import { Module } from '@nestjs/common';
import { ReportRepoService } from './report-repo.service';
import { ReportEntity } from './entities/report.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserRepoModule } from '../user-repo/user-repo.module';
import { PostRepoModule } from '../post-repo/post-repo.module';

@Module({
  providers: [ReportRepoService],
  imports: [
    TypeOrmModule.forFeature([ReportEntity]),
    UserRepoModule,
    PostRepoModule,
  ],
  exports: [ReportRepoService],
})
export class ReportRepoModule {}
