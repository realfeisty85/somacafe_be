import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindConditions, FindOneOptions, In, Repository } from 'typeorm';

import { StreamEntity } from './entities/stream.entity';

@Injectable()
export class StreamRepoService {
  @InjectRepository(StreamEntity)
  private repo: Repository<StreamEntity>;

  async getAllByUsedIds(
    userIds: number[],
    page: number,
    limit: number,
    isActive: boolean,
  ) {
    const skip = (page - 1) * limit;

    return this.repo.find({
      skip,
      take: limit,
      where: {
        user_id: In(userIds),
        active: isActive,
      },
      order: {
        created_at: 'DESC',
      },
    });
  }

  async getCountByUserIds(userIds: number[], isActive: boolean) {
    return this.repo.count({
      where: {
        user_id: In(userIds),
        active: isActive,
      },
    });
  }

  async getOneByStreamId(streamId: string, isActive?: boolean) {
    const where: FindConditions<StreamEntity> = {
      stream_id: streamId,
    };

    if (isActive !== undefined) {
      where.active = isActive;
    }

    const options: FindOneOptions<StreamEntity> = {
      where,
      order: {
        created_at: 'DESC',
      },
    };

    const stream = await this.repo.findOne(options);

    return stream;
  }

  async addOne(streamId: string, userId: number, postHash: string) {
    const entity = new StreamEntity();

    entity.stream_id = streamId;
    entity.user_id = userId;
    entity.post_hash = postHash;

    const newStream = await this.repo.save(entity);

    return newStream;
  }

  async finishOneByStreamId(streamId: string) {
    const stream = await this.repo.findOne({
      where: {
        stream_id: streamId,
        active: true,
      },
    });

    stream.active = false;

    await this.repo.save(stream);
  }
}
