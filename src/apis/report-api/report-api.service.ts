import { Injectable } from '@nestjs/common';
import { AddReportDto } from '../../repositories/report-repo/dto/add.report.dto';
import { ReportRepoService } from '../../repositories/report-repo/report-repo.service';
import { ReportEntity } from '../../repositories/report-repo/entities/report.entity';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';
import { AddReportV2Dto } from '../../repositories/report-repo/dto/add.report.v2.dto';

@Injectable()
export class ReportApiService {
  constructor(private reportRepo: ReportRepoService) {}
  // async add(body: AddReportDto): Promise<ReportEntity> {
  //   console.log('report body -----------------------');
  //   // console.log(body);
  //
  //   const result: ReportEntity = await this.reportRepo.add(body);
  //   return Promise.resolve(result);
  // }

  async newReport(
    reportingUser: UserEntity,
    report: AddReportV2Dto,
  ): Promise<ReportEntity> {
    console.log('report body -----------------------');
    console.log(report);

    const result: ReportEntity = await this.reportRepo.add(
      reportingUser,
      report,
    );
    return Promise.resolve(result);
  }
}
