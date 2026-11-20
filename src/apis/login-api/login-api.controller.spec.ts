import { Test, TestingModule } from '@nestjs/testing';
import { LoginApiController } from './login-api.controller';

describe('LoginApiController', () => {
  let controller: LoginApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LoginApiController],
    }).compile();

    controller = module.get<LoginApiController>(LoginApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
