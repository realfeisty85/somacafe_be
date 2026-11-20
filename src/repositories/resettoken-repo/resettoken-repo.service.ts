import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResettokenEntity } from './entities/resettoken.entity';
import { UserEntity } from '../user-repo/entities/user.entity';
import * as uuid from 'uuid';
import * as moment from 'moment';

@Injectable()
export class ResettokenRepoService {
  constructor(
    @InjectRepository(ResettokenEntity)
    private resettokenRepository: Repository<ResettokenEntity>,
  ) {}

  async generateToken(): Promise<ResettokenEntity> {
    const newToken = `${uuid.v4().toString()}`;
    const newResetToken = new ResettokenEntity();
    newResetToken.token = newToken;
    newResetToken.isActive = true;
    newResetToken.email = '';
    newResetToken.expires_at = new Date(moment().add(1, 'days').valueOf());

    await this.resettokenRepository.save(newResetToken);
    console.log(newResetToken);
    return Promise.resolve(newResetToken);
  }

  findAll(): Promise<ResettokenEntity[]> {
    return this.resettokenRepository.find();
  }

  findOne(id: string): Promise<ResettokenEntity> {
    return this.resettokenRepository.findOne({ where: { id: parseInt(id) } });
  }

  findByEMail(email: string): Promise<ResettokenEntity> {
    return this.resettokenRepository.findOne({
      where: { email: email, isActive: true },
    });
  }

  findByToken(token: string): Promise<ResettokenEntity> {
    return this.resettokenRepository.findOne({
      where: { token: token, isActive: true },
    });
  }

  async linkEmailToToken(
    email: string,
    token: string,
  ): Promise<ResettokenEntity> {
    const existingToken = await this.findByToken(token);
    if (existingToken) {
      existingToken.email = email;
      await this.resettokenRepository.save(existingToken);
    }

    return Promise.resolve(existingToken);
  }

  async remove(id: string): Promise<void> {
    await this.resettokenRepository.delete(id);
  }

  async redeemToken(
    existingToken: ResettokenEntity,
  ): Promise<ResettokenEntity> {
    try {
      existingToken.isActive = false;
      await this.resettokenRepository.save(existingToken);
      return Promise.resolve(existingToken);
    } catch (e) {
      console.log(`Error while redeeming token id : ${existingToken.id}`);
      console.log(e.getMessage());
      console.log(e.getStackTrace());
    }
    return Promise.resolve(null);
  }
}
