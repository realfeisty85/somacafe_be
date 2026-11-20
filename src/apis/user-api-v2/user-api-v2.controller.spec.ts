import { Test, TestingModule } from '@nestjs/testing';
import { UserApiV2Controller } from './user-api-v2.controller';

describe('UserApiV2Controller', () => {
  let controller: UserApiV2Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserApiV2Controller],
    }).compile();

    controller = module.get<UserApiV2Controller>(UserApiV2Controller);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
