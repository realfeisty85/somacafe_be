import { Test, TestingModule } from '@nestjs/testing';
import { ReportRepoService } from './report-repo.service';

describe('ReportRepoService', () => {
  let service: ReportRepoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportRepoService],
    }).compile();

    service = module.get<ReportRepoService>(ReportRepoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
