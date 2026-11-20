import { Test, TestingModule } from '@nestjs/testing';
import { ResetApiService } from './reset-api.service';

describe('ResetApiService', () => {
  let service: ResetApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResetApiService],
    }).compile();

    service = module.get<ResetApiService>(ResetApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
