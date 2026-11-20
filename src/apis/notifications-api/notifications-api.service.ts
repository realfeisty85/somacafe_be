import { Injectable } from '@nestjs/common';
import { NotificationsRepoService } from '../../repositories/notifications-repo/notifications-repo.service';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';
import { UsersNotifyConfigEntity } from '../../repositories/notifications-repo/entities/users.notify.config.entity';
import { NotificationSettingsConfigDto } from '../../repositories/notifications-repo/dto/notification.settings.config.dto';
import { PostEntity } from '../../repositories/post-repo/entities/post.entity';
import { OnEvent } from '@nestjs/event-emitter';
import { UserRepoService } from '../../repositories/user-repo/user-repo.service';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class NotificationsApiService {
  constructor(
    private notifyRepoService: NotificationsRepoService,
    private userRepo: UserRepoService,
  ) {}

  async loadSettings(user: UserEntity): Promise<NotificationSettingsConfigDto> {
    const config = await this.notifyRepoService.load(user);
    if (config) {
      delete config['id'];
      delete config['user_id'];

      const conf = {
        mentions: config.mentions === 1,
        shares: config.shares === 1,
        likes: config.likes === 1,
        replies: config.replies === 1,
        follower: config.follower === 1,
        messages: config.messages === 1,
      };

      return Promise.resolve(conf);
    } else {
      const defaultConfig = {
        mentions: false,
        shares: false,
        likes: false,
        replies: false,
        follower: false,
        messages: false,
      };
      return Promise.resolve(defaultConfig);
    }
  }

  async markAsAllRead(user: UserEntity) {
    if (user) {
      this.notifyRepoService.markAsAllRead(user);
    }
  }

  async saveSettings(
    user: UserEntity,
    settings: NotificationSettingsConfigDto,
  ): Promise<NotificationSettingsConfigDto> {
    const config = await this.notifyRepoService.load(user);
    let newConfig = new UsersNotifyConfigEntity();
    if (config) {
      config.follower = settings.follower ? 1 : 0;
      config.likes = settings.likes ? 1 : 0;
      config.mentions = settings.mentions ? 1 : 0;
      config.messages = settings.messages ? 1 : 0;
      config.replies = settings.replies ? 1 : 0;
      config.shares = settings.shares ? 1 : 0;
      await this.notifyRepoService.save(config);
      newConfig = config;
    } else {
      newConfig.user_id = user.id;
      newConfig.follower = settings.follower ? 1 : 0;
      newConfig.likes = settings.likes ? 1 : 0;
      newConfig.mentions = settings.mentions ? 1 : 0;
      newConfig.messages = settings.messages ? 1 : 0;
      newConfig.replies = settings.replies ? 1 : 0;
      newConfig.shares = settings.shares ? 1 : 0;
      await this.notifyRepoService.save(newConfig);
    }

    const conf = {
      mentions: newConfig.mentions === 1,
      shares: newConfig.shares === 1,
      likes: newConfig.likes === 1,
      replies: newConfig.replies === 1,
      follower: newConfig.follower === 1,
      messages: newConfig.messages === 1,
    };

    return Promise.resolve(conf);
  }

  async trackMentions(
    postId: any,
    userId: any,
    mentionedUserId: number,
    post: any,
  ) {
    const track = await this.notifyRepoService.trackMention(
      postId,
      userId,
      mentionedUserId,
      post,
    );
    console.log(track);
  }

  async trackShare(user: UserEntity, post: PostEntity) {
    const track = await this.notifyRepoService.trackShare(
      post.id,
      user.id,
      post.user_id,
      post,
    );
  }

  @OnEvent('new.follow')
  async trackFollow(payload) {
    if (payload) {
      const track = await this.notifyRepoService.trackFollow(
        payload.user,
        payload.fromUser,
      );
    }
  }

  @OnEvent('message.new')
  async trackNewMessage(payload) {
    if (payload) {
      if (payload.event === 'message.new') {
        const fromUserHash = payload.messageDetails.message.from;
        const toUsers = [
          ...payload.messageDetails.room.users,
          payload.messageDetails.room.creator,
        ].filter((u) => u !== fromUserHash);

        const fromUser = await this.userRepo.findUserByhash(fromUserHash, null);
        await Promise.all(
          toUsers.map(async (t) => {
            const toUser = await this.userRepo.findUserByhash(t, null);
            const track = await this.notifyRepoService.trackMessaged(
              toUser.id,
              fromUser.id,
              payload.messageDetails.room.id,
              payload.messageDetails.message.msg
                ?.replace(/[^\x00-\x7F]/g, '')
                .substring(0, 100),
            );
          }),
        );
      }
    }
  }

  async trackComment(
    userId: number,
    mainPostUserId: number | string,
    parent_post_id: number | string,
  ) {
    //this.postNotification();
    const track = await this.notifyRepoService.trackComment(
      userId,
      mainPostUserId,
      parent_post_id,
    );
  }

  async getNotificationsList(user: UserEntity, pg: number): Promise<any> {
    const list = await this.notifyRepoService.getNotificationsList(user, pg);
    return Promise.resolve(list);
  }

  async trackQuotes(userId: number, mainPost: PostEntity, post: PostEntity) {
    const track = await this.notifyRepoService.trackQuotes(
      userId,
      mainPost.user_id,
      mainPost.id,
      post.id,
      post.post,
    );
    return track;
  }

  async countNotifications(user: UserEntity) {
    const list = await this.notifyRepoService.countNotifications(user);
    return Promise.resolve(list);
  }
}
