import { Test, TestingModule } from '@nestjs/testing';
import { ReportApiService } from './report-api.service';

describe('ReportApiService', () => {
  let service: ReportApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportApiService],
    }).compile();

    service = module.get<ReportApiService>(ReportApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
