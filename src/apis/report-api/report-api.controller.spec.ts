import { Test, TestingModule } from '@nestjs/testing';
import { ReportApiController } from './report-api.controller';

describe('ReportApiController', () => {
  let controller: ReportApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportApiController],
    }).compile();

    controller = module.get<ReportApiController>(ReportApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
