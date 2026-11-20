import { Test, TestingModule } from '@nestjs/testing';
import { BlockApiController } from './block-api.controller';

describe('BlockApiController', () => {
  let controller: BlockApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlockApiController],
    }).compile();

    controller = module.get<BlockApiController>(BlockApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
