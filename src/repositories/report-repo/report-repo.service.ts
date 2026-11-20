import { Injectable } from '@nestjs/common';
import { AddReportDto } from './dto/add.report.dto';
import { ReportEntity } from './entities/report.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepoService } from '../user-repo/user-repo.service';
import { UserEntity } from '../user-repo/entities/user.entity';
import { PostRepoService } from '../post-repo/post-repo.service';
import { PostEntity } from '../post-repo/entities/post.entity';
import { AddReportV2Dto } from './dto/add.report.v2.dto';
import { PollEntity } from '../post-repo/entities/poll.entity';

@Injectable()
export class ReportRepoService {
  constructor(
    @InjectRepository(ReportEntity)
    private reportRepository: Repository<ReportEntity>,
    private userRepository: UserRepoService,
    private postRepository: PostRepoService,
  ) {}
  async add(reportingUser: UserEntity, report: AddReportV2Dto) {
    const post: PostEntity | PollEntity =
      await this.postRepository.getPostByLongHash(report.post, false, true);

    const postUser: UserEntity = await this.userRepository.findOne(
      post.user_id.toString(),
    );

    let newAdd = new ReportEntity();
    if (postUser && postUser.id > 0) {
      if (reportingUser && reportingUser.id > 0) {
        const existingReport = await this.reportRepository.findOne({
          where: {
            post_id: post.id,
            user_id: reportingUser.id,
          },
        });

        if (existingReport && existingReport.id > 0) {
          newAdd = existingReport;
        } else {
          newAdd.post_id = post.id;
          newAdd.user_id = reportingUser.id;
          newAdd.reason = report.reason;
          console.log('New REport', newAdd);
          await this.reportRepository.save(newAdd);
        }
        const pp = new PostEntity();
        pp.id = post.id;

        newAdd.post_id = post.id;
        newAdd.user_id = reportingUser.id;
      }
    }

    return newAdd;
  }
}
