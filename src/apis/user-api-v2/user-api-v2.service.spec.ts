import { Test, TestingModule } from '@nestjs/testing';
import { UserApiV2Service } from './user-api-v2.service';

describe('UserApiV2Service', () => {
  let service: UserApiV2Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserApiV2Service],
    }).compile();

    service = module.get<UserApiV2Service>(UserApiV2Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
