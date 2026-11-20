import { Injectable } from '@nestjs/common';
import { MuteEntity } from './entities/mute.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class MuteRepoService {
  constructor(
    @InjectRepository(MuteEntity)
    private muteRepository: Repository<MuteEntity>,
  ) {}

  async findMutedForUser(
    user_id: string,
    checking_user_id: string,
  ): Promise<MuteEntity> {
    return Promise.resolve(
      await this.muteRepository.findOne({
        where: {
          user_id: parseInt(user_id),
          muted_user_id: parseInt(checking_user_id),
        },
      }),
    );
  }

  async find(options): Promise<MuteEntity[]> {
    return await this.muteRepository.find(options);
  }

  async save(entry: MuteEntity): Promise<MuteEntity> {
    return await this.muteRepository.save(entry);
  }

  async remove(entry: MuteEntity) {
    return await this.muteRepository.delete(entry.id);
  }
}
