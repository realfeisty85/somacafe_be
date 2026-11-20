import { Test, TestingModule } from '@nestjs/testing';
import { MuteApiService } from './mute-api.service';

describe('MuteApiService', () => {
  let service: MuteApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MuteApiService],
    }).compile();

    service = module.get<MuteApiService>(MuteApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
