import { Injectable } from '@nestjs/common';
import { UserEntity } from '../repositories/user-repo/entities/user.entity';
import { LoggedInUserDto } from '../repositories/user-repo/dto/loggedIn.user.dto';
import { UserRepoService } from '../repositories/user-repo/user-repo.service';
import { SecurityService } from '../modules/security/security.service';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { UserSessionEntity } from '../repositories/user-repo/entities/user.session.entity';
import * as moment from 'moment';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserRepoService,
    private readonly securityService: SecurityService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const foundUser: UserEntity = await this.userService.findByEMail(email);
    const user: LoggedInUserDto = new LoggedInUserDto();
    let isValidPassword = false;
    if (foundUser) {
      isValidPassword = this.securityService.comparePassword(
        pass,
        foundUser.password,
      );

      if (isValidPassword) {
        return Promise.resolve({
          id: foundUser.id,
        });
      }
    }

    return Promise.resolve(null);
  }

  async login(user: any) {
    if (user['id']) {
      const newSession: UserSessionEntity = await this.userService.newSession(
        user,
      );

      const payloadAccessToken = {
        sub: newSession.session_id,
      };

      const payloadRefreshToken = {
        sub: newSession.session_id,
      };

      const token = this.jwtService.sign(payloadAccessToken, {
        expiresIn: '10m',
      });
      const decoded = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString('utf8'),
      )?.exp;
      return {
        access_token: token,
        refresh_token: this.jwtService.sign(payloadRefreshToken, {
          secret: process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-secret',
          expiresIn: '30d',
        }),
        access_token_expiry: decoded,
      };
    }
    return {
      error: 'Invalid login',
    };
  }

  async newAccessToken(user: any, refreshToken: string) {
    if (user['id']) {
      const newSession: UserSessionEntity = await this.userService.newSession(
        user,
      );

      const payloadAccessToken = {
        sub: newSession.session_id,
      };

      const token = this.jwtService.sign(payloadAccessToken, {
        expiresIn: '10m',
      });
      const decoded = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString('utf8'),
      )?.exp;
      const result = {
        access_token: token,
        refresh_token: refreshToken,
        access_token_expiry: decoded,
      };

      return result;
    }
    return {
      error: 'Invalid login',
    };
  }

  async refreshToken(user: any, refreshToken: any): Promise<any> {
    if (user) {
      return Promise.resolve(await this.newAccessToken(user, refreshToken));
    }
    return {
      error: 'Invalid login',
    };
    //this.jwtService.verify(user)
  }
}
