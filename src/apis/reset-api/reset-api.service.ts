import { Injectable } from '@nestjs/common';
import { ResettokenRepoService } from '../../repositories/resettoken-repo/resettoken-repo.service';
import { LinktokenDto } from '../../repositories/resettoken-repo/dto/linktoken.dto';
import { ResettokenEntity } from '../../repositories/resettoken-repo/entities/resettoken.entity';
import { ValidatetokenDto } from '../../repositories/resettoken-repo/dto/validatetoken.dto';
import { UserApiService } from '../user-api/user-api.service';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';

@Injectable()
export class ResetApiService {
  constructor(
    private resettoken: ResettokenRepoService,
    private userApi: UserApiService,
  ) {}

  async getToken(): Promise<string> {
    const token: ResettokenEntity = await this.resettoken.generateToken();
    return Promise.resolve(token.token);
  }

  async linkEmailToToken(body: LinktokenDto): Promise<ResettokenEntity> {
    const existingToken = await this.resettoken.linkEmailToToken(
      body.email,
      body.token,
    );

    return Promise.resolve(existingToken);
  }

  async validateToken(body: ValidatetokenDto): Promise<boolean> {
    const existingToken: ResettokenEntity = await this.resettoken.findByToken(
      body.token,
    );
    if (existingToken && existingToken.isActive) {
      if (existingToken.email !== '' && existingToken.email !== null) {
        return Promise.resolve(true);
      }
    }

    return Promise.resolve(false);
  }

  async resetPassword(password, confirmPassword, token): Promise<boolean> {
    let existingToken: ResettokenEntity = await this.resettoken.findByToken(
      token,
    );
    if (existingToken && existingToken.isActive) {
      if (existingToken.email !== '' && existingToken.email !== null) {
        if (password === confirmPassword) {
          const updatedUser: UserEntity =
            await this.userApi.resetPasswordByUser(
              existingToken.email,
              password,
            );
          if (updatedUser) {
            existingToken = await this.resettoken.redeemToken(existingToken);
            if (!existingToken.isActive) {
              return Promise.resolve(true);
            }
          }
        }
      }
    }

    return Promise.resolve(false);
  }

  async resetProfilePassword(
    currentPwd,
    pwd,
    confirmPwd,
    userId,
  ): Promise<boolean> {
    const result = this.userApi.resetProfilePasswordByUserId(
      currentPwd,
      pwd,
      confirmPwd,
      userId,
    );

    return Promise.resolve(result);
  }
}
