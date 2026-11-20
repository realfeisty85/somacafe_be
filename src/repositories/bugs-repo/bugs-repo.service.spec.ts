import { Test, TestingModule } from '@nestjs/testing';
import { BugsRepoService } from './bugs-repo.service';

describe('BugsRepoService', () => {
  let service: BugsRepoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BugsRepoService],
    }).compile();

    service = module.get<BugsRepoService>(BugsRepoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
