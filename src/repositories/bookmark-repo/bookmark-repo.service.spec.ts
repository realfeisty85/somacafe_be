import { Test, TestingModule } from '@nestjs/testing';
import { BookmarkRepoService } from './bookmark-repo.service';

describe('BookmarkRepoService', () => {
  let service: BookmarkRepoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BookmarkRepoService],
    }).compile();

    service = module.get<BookmarkRepoService>(BookmarkRepoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
