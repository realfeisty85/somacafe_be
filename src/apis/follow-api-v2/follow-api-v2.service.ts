import { Injectable } from '@nestjs/common';
import { FollowRepoService } from '../../repositories/follow-repo/follow-repo.service';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';
import { UserApiService } from '../user-api/user-api.service';
import { type } from 'os';
import { DeleteResult } from 'typeorm';
import { NewNotificationEvent } from '../../repositories/notifications-repo/dto/new.notification.event';
import { NotificationEnumTypes } from '../../repositories/types/notification.enum.types';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class FollowApiV2Service {
  constructor(
    private readonly followRepo: FollowRepoService,
    private readonly userApi: UserApiService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getAllFollowing(user: UserEntity, pg, username: string): Promise<any> {
    const userToSearch = await this.userApi.getProfileByUsername(
      { username: username },
      user.id.toString(),
      true,
    );

    const following = await this.followRepo.findFollowing(userToSearch.id, pg);

    const updated = Promise.all(
      following.map(async (f) => {
        const profile = await this.userApi.getProfileById({
          userId: String(f['followed_user_id']),
        });
        if (profile) {
          const {
            id,
            username,
            displayName,
            bio,
            ava_src,
            profile_background_url,
            birthday,
          } = profile;

          return {
            id,
            username,
            displayName,
            bio,
            ava_src,
            profile_background_url,
            birthday,
            isFollowed: await this.followRepo.isFollowing({
              user_id: user.id.toString(),
              followed_user_id: f['followed_user_id'].toString(),
              type: '',
            }),
          };
        }
        return null;
      }),
    );
    return Promise.resolve(updated);
  }

  async getAllFollowers(user: UserEntity, pg, username: string): Promise<any> {
    const userToSearch = await this.userApi.getProfileByUsername(
      { username: username },
      user.id.toString(),
      true,
    );
    const following = await this.followRepo.findFollowers(userToSearch.id, pg);

    const updated = Promise.all(
      following.map(async (f) => {
        const profile = await this.userApi.getProfileById({
          userId: String(f['user_id']),
        });
        if (profile) {
          const {
            id,
            username,
            displayName,
            bio,
            ava_src,
            profile_background_url,
            birthday,
          } = profile;

          return {
            id,
            username,
            displayName,
            bio,
            ava_src,
            profile_background_url,
            birthday,
            isFollowed: await this.followRepo.isFollowing({
              user_id: user.id.toString(),
              followed_user_id: f['user_id'].toString(),
              type: '',
            }),
          };
        }
        return null;
      }),
    );
    return Promise.resolve(updated);
  }

  async toggleFollow(user: UserEntity, userHash: string): Promise<any> {
    const userToToggle = await this.userApi.getProfileByUserHash(
      {
        userHash: userHash,
      },
      false,
    );

    if (userToToggle.id === user.id) {
      return Promise.resolve({
        isFollowed: false,
      });
    }

    let follow;
    if (typeof userToToggle.id === 'string') {
      follow = await this.followRepo.loadFollow(
        user.id,
        parseInt(userToToggle.id),
      );
    } else {
      follow = await this.followRepo.loadFollow(user.id, userToToggle.id);
    }

    if (follow && follow['id'] > 0) {
      const deleted: DeleteResult = await this.followRepo.deleteFollow(follow);
      if (deleted.affected === 1) {
        return Promise.resolve({
          isFollowed: false,
        });
      }
    }

    let followRes;
    if (typeof userToToggle.id === 'string') {
      follow = await this.followRepo.addFollow(
        user.id,
        parseInt(userToToggle.id),
      );
    } else {
      follow = await this.followRepo.addFollow(user.id, userToToggle.id);
    }

    ///// Emit //////
    const eventEmit: NewNotificationEvent = new NewNotificationEvent();

    eventEmit.fromUser = user.id;
    eventEmit.user = userToToggle.id;
    eventEmit.type = NotificationEnumTypes.FOLLOW;

    this.eventEmitter.emit('new.follow', eventEmit);

    ///// Emit //////

    return Promise.resolve({
      isFollowed: true,
    });
  }
}
