import { Test, TestingModule } from '@nestjs/testing';
import { StatusApiService } from './status-api.service';

describe('StatusApiService', () => {
  let service: StatusApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StatusApiService],
    }).compile();

    service = module.get<StatusApiService>(StatusApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
