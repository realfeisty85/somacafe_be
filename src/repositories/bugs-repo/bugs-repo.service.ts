import { Injectable } from '@nestjs/common';
import { BugEntity } from './entities/bug.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { NewBugDto } from './dto/new.bug.dto';
import { BugReportEntity } from './entities/bug.report.entity';
import { NewBugReportDto } from './dto/new.bug.report.dto';

@Injectable()
export class BugsRepoService {
  constructor(
    @InjectRepository(BugEntity)
    private bugsRepository: Repository<BugEntity>,

    @InjectRepository(BugReportEntity)
    private bugReportRepo: Repository<BugReportEntity>,
  ) {}

  findAll(): Promise<BugEntity[]> {
    return this.bugsRepository.find();
  }

  async findOne(id: string): Promise<BugEntity> {
    const res: BugEntity = await this.bugsRepository.findOne({
      where: { id: parseInt(id) },
    });
    return Promise.resolve(res);
  }

  async remove(id: string): Promise<void> {
    await this.bugsRepository.delete(id);
  }

  async submitBug(newBugDto: NewBugDto): Promise<BugEntity> {
    const newBug = new BugEntity();
    newBug.bug = newBugDto.bug;
    newBug.errorreason = newBugDto.errorreason;
    newBug.imageMeta = '';
    newBug.imageUpload = newBugDto.imageUpload;
    newBug.user_id = parseInt(newBugDto.userId);

    console.log(newBug);

    await this.bugsRepository.save(newBug);

    return Promise.resolve(newBug);
  }

  async reportBug(report: NewBugReportDto): Promise<BugReportEntity> {
    const res = await this.bugReportRepo.save(report);

    return Promise.resolve(res);
  }
}
