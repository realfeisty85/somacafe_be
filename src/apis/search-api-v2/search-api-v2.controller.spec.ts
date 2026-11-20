import { Test, TestingModule } from '@nestjs/testing';
import { SearchApiV2Controller } from './search-api-v2.controller';

describe('SearchApiV2Controller', () => {
  let controller: SearchApiV2Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchApiV2Controller],
    }).compile();

    controller = module.get<SearchApiV2Controller>(SearchApiV2Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
