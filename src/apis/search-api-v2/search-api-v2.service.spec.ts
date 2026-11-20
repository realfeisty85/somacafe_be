import { Test, TestingModule } from '@nestjs/testing';
import { SearchApiV2Service } from './search-api-v2.service';

describe('SearchApiV2Service', () => {
  let service: SearchApiV2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchApiV2Service],
    }).compile();

    service = module.get<SearchApiV2Service>(SearchApiV2Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
