import { Test, TestingModule } from '@nestjs/testing';
import { BookmarkApiController } from './bookmark-api.controller';

describe('BookmarkApiController', () => {
  let controller: BookmarkApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarkApiController],
    }).compile();

    controller = module.get<BookmarkApiController>(BookmarkApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
