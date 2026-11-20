import { Test, TestingModule } from '@nestjs/testing';
import { FollowApiController } from './follow-api.controller';

describe('FollowApiController', () => {
  let controller: FollowApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FollowApiController],
    }).compile();

    controller = module.get<FollowApiController>(FollowApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
