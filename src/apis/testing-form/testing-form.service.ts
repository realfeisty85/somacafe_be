import * as fs from 'fs';
import { v4 as uuid } from 'uuid';
import { Injectable } from '@nestjs/common';
import { BugsRepoService } from '../../repositories/bugs-repo/bugs-repo.service';
import { NewBugDto } from '../../repositories/bugs-repo/dto/new.bug.dto';
import { BugEntity } from '../../repositories/bugs-repo/entities/bug.entity';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';
import { BugReportEntity } from '../../repositories/bugs-repo/entities/bug.report.entity';

@Injectable()
export class TestingFormService {
  constructor(private bugsRepository: BugsRepoService) {}

  async submitBugWithFile(newBug: NewBugDto, imageUpload: Express.Multer.File) {
    // if(imageUpload && )
    console.log('IMG:', imageUpload);
    if (imageUpload && imageUpload['mimetype']) {
      if (imageUpload.mimetype === 'image/png' && imageUpload.size > 0) {
        fs.renameSync(imageUpload.path, `${imageUpload.path}.png`);
        imageUpload.path = `${imageUpload.path}.png`;
      }
    }

    // move uploaded file
    // fs.renameSync()
    // save to db
    newBug.imageUpload = imageUpload.path;
    await this.bugsRepository.submitBug(newBug);
  }

  async submitBug(newBug: NewBugDto) {
    // if(imageUpload && )
    console.log('IMG:', newBug.imageUpload);
    // move uploaded file
    // fs.renameSync()
    // save to db

    await this.bugsRepository.submitBug(newBug);
  }

  async report(
    user: UserEntity,
    bugOption: number,
    bugDescription: string,
    system: string,
    browser: string,
    attach: any,
  ): Promise<BugReportEntity> {
    const newBug = new BugReportEntity();
    newBug.user_id = user.id;
    newBug.bugOption = bugOption;
    newBug.bugDescription = bugDescription;
    newBug.system = system;
    newBug.browser = browser;

    const saved = await this.parsePostImages(attach);
    newBug.attachments = saved;

    const res = await this.bugsRepository.reportBug(newBug);
    return Promise.resolve(res);
  }

  async parsePostImages(attachments: any): Promise<string[]> {
    let attachmentsSaved = [];

    const imageMime = ['png', 'jpg', 'jpeg', 'gif', 'svg'];
    if (attachments.length > 0) {
      attachmentsSaved = await Promise.all(
        attachments.map((att) => {
          console.log({ att });
          // fieldname: 'attachments[]',
          // originalname: '2021-10-14_18-16_newaccount.png',
          // encoding: '7bit',
          // mimetype: 'image/png',
          // destination: './public/uploads/bugs',
          // filename: '85b937af7832d24ae72b7e4176bc7885',
          // path: 'public/uploads/bugs/85b937af7832d24ae72b7e4176bc7885',
          // size: 30261

          const ext = att['originalname'].split('.').pop();
          const newImagename = `${att['path']}.${ext}`;
          fs.renameSync(att['path'], newImagename);
          return {
            type: att['mimetype'],
            url: newImagename.substring(7),
          };
        }),
      );
    }
    return Promise.resolve(attachmentsSaved);
  }
}
