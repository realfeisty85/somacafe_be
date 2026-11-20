import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserRepoModule } from '../repositories/user-repo/user-repo.module';
import { SecurityModule } from '../modules/security/security.module';
import { LocalStrategy } from './local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants } from './constants';
import { JwtStrategy } from './jwt.strategy';

@Module({
  providers: [AuthService, LocalStrategy, JwtStrategy],
  imports: [
    UserRepoModule,
    SecurityModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '10m' },
    }),
  ],
  exports: [AuthService],
})
export class AuthModule {}
