import { Module } from '@nestjs/common';
import { BugsRepoService } from './bugs-repo.service';
import { BugEntity } from './entities/bug.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BugReportEntity } from './entities/bug.report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BugEntity, BugReportEntity])],
  providers: [BugsRepoService],
  exports: [TypeOrmModule, BugsRepoService],
})
export class BugsRepoModule {}
