import { Module } from '@nestjs/common';
import { LoginApiController } from './login-api.controller';
import { LoginApiService } from './login-api.service';
import { AuthModule } from '../../auth/auth.module';
import { UserApiModule } from '../user-api/user-api.module';

@Module({
  controllers: [LoginApiController],
  providers: [LoginApiService],
  imports: [AuthModule, UserApiModule, AuthModule],
})
export class LoginApiModule {}
