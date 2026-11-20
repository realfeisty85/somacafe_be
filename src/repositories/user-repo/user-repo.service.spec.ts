import { Test, TestingModule } from '@nestjs/testing';
import { UserRepoService } from './user-repo.service';

describe('UserService', () => {
  let service: UserRepoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserRepoService],
    }).compile();

    service = module.get<UserRepoService>(UserRepoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
