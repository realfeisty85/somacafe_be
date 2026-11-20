import { Test, TestingModule } from '@nestjs/testing';
import { ResetApiController } from './reset-api.controller';

describe('ResetApiController', () => {
  let controller: ResetApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResetApiController],
    }).compile();

    controller = module.get<ResetApiController>(ResetApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
