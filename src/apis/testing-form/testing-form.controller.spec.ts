import { Test, TestingModule } from '@nestjs/testing';
import { TestingFormController } from './testing-form.controller';

describe('TestingFormController', () => {
  let controller: TestingFormController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestingFormController],
    }).compile();

    controller = module.get<TestingFormController>(TestingFormController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
