import { Test, TestingModule } from '@nestjs/testing';
import { LoginApiService } from './login-api.service';

describe('LoginApiService', () => {
  let service: LoginApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LoginApiService],
    }).compile();

    service = module.get<LoginApiService>(LoginApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
