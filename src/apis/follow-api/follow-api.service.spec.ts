import { Test, TestingModule } from '@nestjs/testing';
import { FollowApiService } from './follow-api.service';

describe('FollowApiService', () => {
  let service: FollowApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FollowApiService],
    }).compile();

    service = module.get<FollowApiService>(FollowApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
