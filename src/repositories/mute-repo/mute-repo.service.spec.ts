import { Test, TestingModule } from '@nestjs/testing';
import { MuteRepoService } from './mute-repo.service';

describe('MuteRepoService', () => {
  let service: MuteRepoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MuteRepoService],
    }).compile();

    service = module.get<MuteRepoService>(MuteRepoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
