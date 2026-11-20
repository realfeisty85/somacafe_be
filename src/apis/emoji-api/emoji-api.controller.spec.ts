import { Test, TestingModule } from '@nestjs/testing';
import { EmojiApiController } from './emoji-api.controller';

describe('EmojiApiController', () => {
  let controller: EmojiApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmojiApiController],
    }).compile();

    controller = module.get<EmojiApiController>(EmojiApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
