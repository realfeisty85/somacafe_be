import { Test, TestingModule } from '@nestjs/testing';
import { BlockApiService } from './block-api.service';

describe('BlockApiService', () => {
  let service: BlockApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockApiService],
    }).compile();

    service = module.get<BlockApiService>(BlockApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
