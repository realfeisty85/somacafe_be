import { Test, TestingModule } from '@nestjs/testing';
import { EmojiApiService } from './emoji-api.service';

describe('EmojiApiService', () => {
  let service: EmojiApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmojiApiService],
    }).compile();

    service = module.get<EmojiApiService>(EmojiApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
