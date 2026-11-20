import { Test, TestingModule } from '@nestjs/testing';
import { MuteApiController } from './mute-api.controller';

describe('MuteApiController', () => {
  let controller: MuteApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MuteApiController],
    }).compile();

    controller = module.get<MuteApiController>(MuteApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
