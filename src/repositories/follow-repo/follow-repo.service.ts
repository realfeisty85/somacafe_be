import { Injectable } from '@nestjs/common';
import { AddFollowRequestDto } from './dto/add.follow.request.dto';
import { UserEntity } from '../user-repo/entities/user.entity';
import { UserRepoService } from '../user-repo/user-repo.service';
import { InjectRepository } from '@nestjs/typeorm';
import { BugEntity } from '../bugs-repo/entities/bug.entity';
import { Repository } from 'typeorm';
import { FollowEntity } from './entities/follow.entity';
import { FollowTypes } from '../types/follow.types';
import { DeleteResult } from 'typeorm/query-builder/result/DeleteResult';

@Injectable()
export class FollowRepoService {
  constructor(
    @InjectRepository(FollowEntity)
    private followRepository: Repository<FollowEntity>,
    private userRepo: UserRepoService,
  ) {}

  async addFollow(userId: number, followedUserId: number): Promise<boolean> {
    const follow: FollowEntity = new FollowEntity();
    follow.user_id = userId;
    follow.followed_user_id = followedUserId;
    follow.type = FollowTypes.TYPE_FOLLOW;
    await this.followRepository.save(follow);
    return Promise.resolve(true);
  }

  async deleteFollow(follow: FollowEntity): Promise<DeleteResult> {
    return await this.followRepository.delete(follow.id);
  }

  async loadFollow(
    userId: number,
    followedUserId: number,
  ): Promise<FollowEntity> {
    return await this.followRepository.findOne({
      where: { user_id: userId, followed_user_id: followedUserId },
    });
  }

  async findFollowing(userId, pg, limit?: number): Promise<FollowEntity[]> {
    const limitToUse = limit ?? 20;
    return await this.followRepository.find({
      where: {
        user_id: userId,
      },
      take: limitToUse,
      skip: (pg - 1) * limitToUse,
    });
  }

  async findFollowingCount(userId: number): Promise<number> {
    return await this.followRepository.count({
      where: {
        user_id: userId,
      },
    });
  }

  async findFollowers(userId, pg: number): Promise<FollowEntity[]> {
    if (!pg) {
      pg = 1;
    }
    return await this.followRepository.find({
      where: { followed_user_id: userId },
      take: 20,
      skip: (pg - 1) * 20,
    });
  }

  async findFollowersCount(userId: number): Promise<number> {
    return await this.followRepository.count({
      where: {
        followed_user_id: userId,
      },
    });
  }

  async followUser(body: AddFollowRequestDto): Promise<boolean> {
    try {
      if (body.type === FollowTypes.TYPE_FOLLOW.toString()) {
        const requestingUser: UserEntity = await this.userRepo.findOne(
          body.user_id,
        );
        if (requestingUser && requestingUser.id > 0) {
          const followedUser: UserEntity = await this.userRepo.findOne(
            body.followed_user_id,
          );
          if (followedUser && followedUser.id > 0) {
            console.log(
              `${requestingUser.id} is Following ${followedUser.id} `,
            );
            const following: FollowEntity = await this.followRepository.findOne(
              {
                where: {
                  user_id: requestingUser.id,
                  followed_user_id: followedUser.id,
                  type: FollowTypes.TYPE_FOLLOW,
                },
              },
            );
            if (following && following.id > 0) {
            } else {
              const follow: FollowEntity = new FollowEntity();
              follow.user_id = requestingUser.id;
              follow.followed_user_id = followedUser.id;
              follow.type = FollowTypes.TYPE_FOLLOW;
              await this.followRepository.save(follow);
              return Promise.resolve(true);
            }
          }
        }
      }
      if (body.type === FollowTypes.TYPE_DELETED.toString()) {
        const requestingUser: UserEntity = await this.userRepo.findOne(
          body.user_id,
        );
        if (requestingUser && requestingUser.id > 0) {
          const followedUser: UserEntity = await this.userRepo.findOne(
            body.followed_user_id,
          );
          if (followedUser && followedUser.id > 0) {
            console.log(
              `${requestingUser.id} is Following ${followedUser.id} `,
            );
            const following: FollowEntity = await this.followRepository.findOne(
              {
                where: {
                  user_id: requestingUser.id,
                  followed_user_id: followedUser.id,
                  type: FollowTypes.TYPE_FOLLOW,
                },
              },
            );
            if (following && following.id > 0) {
              await this.followRepository.delete(following.id);
            }
          }
        }
      }
    } catch (e) {
      console.log(`Error logging follow ${body}`);
      console.log(e.getMessage());
      console.log(e.getStackTrace());
    }

    return Promise.resolve(false);
  }

  async isFollowing(body: AddFollowRequestDto): Promise<boolean> {
    const following: FollowEntity = await this.followRepository.findOne({
      where: {
        user_id: parseInt(body.user_id),
        followed_user_id: parseInt(body.followed_user_id),
        type: FollowTypes.TYPE_FOLLOW,
      },
    });

    if (following && following.id > 0) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }
}
