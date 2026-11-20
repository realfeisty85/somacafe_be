import { Test, TestingModule } from '@nestjs/testing';
import { BlockRepoService } from './block-repo.service';

describe('BlockRepoService', () => {
  let service: BlockRepoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockRepoService],
    }).compile();

    service = module.get<BlockRepoService>(BlockRepoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
