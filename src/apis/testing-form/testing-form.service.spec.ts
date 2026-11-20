import { Test, TestingModule } from '@nestjs/testing';
import { TestingFormService } from './testing-form.service';

describe('TestingFormService', () => {
  let service: TestingFormService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TestingFormService],
    }).compile();

    service = module.get<TestingFormService>(TestingFormService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
