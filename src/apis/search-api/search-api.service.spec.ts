import { Test, TestingModule } from '@nestjs/testing';
import { SearchApiService } from './search-api.service';

describe('SearchApiService', () => {
  let service: SearchApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchApiService],
    }).compile();

    service = module.get<SearchApiService>(SearchApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
