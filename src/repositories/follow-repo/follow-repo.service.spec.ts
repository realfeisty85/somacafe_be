import { Test, TestingModule } from '@nestjs/testing';
import { FollowRepoService } from './follow-repo.service';

describe('FollowRepoService', () => {
  let service: FollowRepoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FollowRepoService],
    }).compile();

    service = module.get<FollowRepoService>(FollowRepoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
