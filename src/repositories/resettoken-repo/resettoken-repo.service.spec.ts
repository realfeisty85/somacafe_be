import { Test, TestingModule } from '@nestjs/testing';
import { ResettokenRepoService } from './resettoken-repo.service';

describe('ResettokenRepoService', () => {
  let service: ResettokenRepoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResettokenRepoService],
    }).compile();

    service = module.get<ResettokenRepoService>(ResettokenRepoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
