import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { UsersNotifyConfigEntity } from './entities/users.notify.config.entity';
import { UserEntity } from '../user-repo/entities/user.entity';
import { NotificationEnumTypes } from '../types/notification.enum.types';
import { PostEntity } from '../post-repo/entities/post.entity';
import { UsersNotifyEntity } from './entities/users.notify.entity';
import { OnEvent } from '@nestjs/event-emitter';
import { NewNotificationEvent } from './dto/new.notification.event';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { UserTokensEntity } from '../user-repo/entities/user.tokens.entity';

const SEARCH_PAGE_SIZE = 20;

@Injectable()
export class NotificationsRepoService {
  constructor(
    @InjectRepository(UsersNotifyConfigEntity)
    private notifyRepository: Repository<UsersNotifyConfigEntity>,
    @InjectRepository(UsersNotifyEntity)
    private notificationsRepo: Repository<UsersNotifyEntity>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
    @InjectRepository(PostEntity)
    private postRepo: Repository<PostEntity>,

    @InjectRepository(UserTokensEntity)
    private userTokensRepository: Repository<UserTokensEntity>,
    private http: HttpService,
  ) {}

  async save(entry: UsersNotifyConfigEntity): Promise<UsersNotifyConfigEntity> {
    return await this.notifyRepository.save(entry);
  }

  async load(user: UserEntity) {
    return await this.notifyRepository.findOne({ where: { user_id: user.id } });
  }

  @OnEvent('new.notification')
  async addNotification(payload: NewNotificationEvent): Promise<any> {
    try {
      const notify = new UsersNotifyEntity();

      if (
        payload.user &&
        payload.fromUser &&
        payload.user > 0 &&
        payload.fromUser > 0 &&
        payload.user === payload.fromUser
      ) {
        return;
      }

      notify.message = `New ${payload.type.valueOf()} Notification`;
      if (payload.message) {
        notify.message = payload.message;
      }

      notify.type = payload.type;
      if (payload.user) {
        notify.user_id = payload.user;
      }
      if (payload.fromUser) {
        notify.from_user_id = payload.fromUser;
      }
      if (payload.post) {
        if (typeof payload.post === 'string') {
          notify.post_id = parseInt(payload.post);
        } else {
          notify.post_id = payload.post;
        }
      } else {
        notify.post_id = 0;
      }

      await this.notificationsRepo.save(notify);
      this.push(notify);
    } catch (e) {
      if (e['code'] !== 'ER_DUP_ENTRY') {
        console.log(e);
      }
    }
  }

  async trackMention(
    postId: number,
    fromUserId: number | string,
    mentionedUserId: number,
    post: any,
  ): Promise<UsersNotifyEntity> {
    const entry = new UsersNotifyEntity();
    entry.type = NotificationEnumTypes.MENTTION;
    entry.from_user_id = fromUserId;
    entry.user_id = mentionedUserId;
    entry.status = 1;
    entry.post_id = postId;
    entry.message = `User ${fromUserId} mentioned User ${mentionedUserId} in a ${post.postType}`;
    await this.notificationsRepo.save(entry);
    this.push(entry);
    return Promise.resolve(entry);
  }

  async trackShare(
    postId: number | string,
    fromUserId: number,
    sharedUserId: number | string,
    post: PostEntity,
  ): Promise<UsersNotifyEntity> {
    const entry = new UsersNotifyEntity();
    entry.type = NotificationEnumTypes.SHARE;
    entry.from_user_id = fromUserId;
    entry.user_id = sharedUserId;
    entry.status = 1;
    entry.post_id = postId;
    entry.message = `User ${fromUserId} shared User ${sharedUserId} post ${postId}`;

    await this.notificationsRepo.save(entry);
    this.push(entry);
    return Promise.resolve(entry);
  }

  async trackFollow(
    sharedUserId: number,
    fromUserId: number,
  ): Promise<UsersNotifyEntity> {
    const entry = new UsersNotifyEntity();
    entry.type = NotificationEnumTypes.FOLLOW;
    entry.from_user_id = fromUserId;
    entry.user_id = sharedUserId;
    entry.status = 1;
    entry.post_id = 0;
    entry.message = `User ${fromUserId} followed User ${sharedUserId}`;

    await this.notificationsRepo.save(entry);
    this.push(entry);
    return Promise.resolve(entry);
  }

  async trackComment(
    userId: number,
    mainPostUserId: number | string,
    parent_post_id: number | string,
  ) {
    const entry = new UsersNotifyEntity();
    entry.type = NotificationEnumTypes.REPLY;
    entry.from_user_id = userId;
    entry.user_id = mainPostUserId;
    entry.status = 1;
    entry.post_id = parent_post_id;
    entry.message = `User ${userId} replied to User ${mainPostUserId} on Post ${parent_post_id}`;

    await this.notificationsRepo.save(entry);
    this.push(entry);
    return Promise.resolve(entry);
  }

  async trackMessaged(
    toId: number,
    fromId: number,
    roomId: string,
    message: string,
  ) {
    const entry = new UsersNotifyEntity();
    entry.type = NotificationEnumTypes.MESSAGE;
    entry.from_user_id = fromId;
    entry.user_id = toId;
    entry.status = 1;
    entry.post_id = 0;
    entry.message = message;
    entry.room_id = roomId;

    await this.notificationsRepo.save(entry);
    this.push(entry);
    return Promise.resolve(entry);
  }

  async getNotificationsList(user: UserEntity, pg: number): Promise<any> {
    if (!pg) {
      pg = 1;
    }

    const notifyConfig = await this.notifyRepository.findOne({
      where: { user_id: user.id },
      select: [
        'mentions',
        'shares',
        'likes',
        'replies',
        'follower',
        'messages',
        'quotes',
        'streamer',
      ],
    });

    const allowed = [];
    if (notifyConfig?.likes === 1) {
      allowed.push(NotificationEnumTypes.LIKE);
    }
    if (notifyConfig?.shares === 1) {
      allowed.push(NotificationEnumTypes.SHARE);
    }
    if (notifyConfig?.mentions === 1) {
      allowed.push(NotificationEnumTypes.MENTTION);
    }
    if (notifyConfig?.replies === 1) {
      allowed.push(NotificationEnumTypes.REPLY);
    }
    if (notifyConfig?.follower === 1) {
      allowed.push(NotificationEnumTypes.FOLLOW);
    }
    if (notifyConfig?.messages === 1) {
      allowed.push(NotificationEnumTypes.MESSAGE);
    }
    if (notifyConfig?.quotes === 1) {
      allowed.push(NotificationEnumTypes.QUOTE);
    }
    if (notifyConfig?.streamer === 1) {
      allowed.push(NotificationEnumTypes.STREAM);
    }

    const list = await this.notificationsRepo.find({
      where: {
        user_id: user.id,
        //status: 1,
        from_user_id: Not(user.id),
        type: In(allowed),
      },
      select: [
        'id',
        'user_id',
        'from_user_id',
        'post_id',
        'type',
        'status',
        'room_id',
        'created_at',
        'message',
      ],
      order: { created_at: 'DESC' },
      take: SEARCH_PAGE_SIZE,
      skip: (pg - 1) * SEARCH_PAGE_SIZE,
    });

    await Promise.all(
      list.map(async (n) => {
        let user;
        if (typeof n.user_id === 'string') {
          user = await this.userRepo.findOne({
            where: { id: parseInt(n.user_id) },
            select: ['username', 'hash'],
          });
        } else {
          user = await this.userRepo.findOne({
            where: { id: n.user_id },
            select: ['username', 'hash'],
          });
        }

        if (user && user['hash'] !== '') {
          n['user'] = user;
          delete n['user_id'];
        }

        let userFrom;
        if (typeof n.from_user_id === 'string') {
          userFrom = await this.userRepo.findOne({
            where: { id: parseInt(n.from_user_id) },
            select: ['username', 'hash', 'ava_src'],
          });
        } else {
          userFrom = await this.userRepo.findOne({
            where: { id: n.from_user_id },
            select: ['username', 'hash', 'ava_src'],
          });
        }

        if (userFrom && userFrom['hash'] !== '') {
          n['from_user'] = userFrom;
          delete n['from_user_id'];
        }

        if (n.post_id > 0) {
          const post = await this.postRepo.findOne({
            where: {
              id: n.post_id,
            },
            select: ['post', 'hash'],
          });
          if (post && post['hash'] !== '') {
            n['post'] = post;
            delete n['post_id'];
          }
        }
        if (n.type.toString() !== 'MESSAGE') {
          delete n['room_id'];
          delete n['message'];
        }

        this.markAsRead(n['id']);
        delete n['id'];
      }),
    );

    return Promise.resolve(list);
  }

  async trackQuotes(
    userId: number,
    mainPostUserId: number | string,
    mainPostId: number | string,
    postId: number | string,
    post: string,
  ) {
    const entry = new UsersNotifyEntity();
    entry.type = NotificationEnumTypes.QUOTE;
    entry.from_user_id = userId;
    entry.user_id = mainPostUserId;
    entry.status = 1;
    entry.post_id = mainPostId;
    entry.message = post;
    entry.room_id = null;

    await this.notificationsRepo.save(entry);
    this.push(entry);
    return Promise.resolve(entry);
  }

  async getAllowedList(userId: any): Promise<any> {
    const notifyConfig = await this.notifyRepository.findOne({
      where: { user_id: userId },
      select: [
        'mentions',
        'shares',
        'likes',
        'replies',
        'follower',
        'messages',
        'quotes',
        'streamer',
      ],
    });

    const allowed = [];
    if (notifyConfig) {
      if (notifyConfig.likes === 1) {
        allowed.push(NotificationEnumTypes.LIKE);
      }
      if (notifyConfig.shares === 1) {
        allowed.push(NotificationEnumTypes.SHARE);
      }
      if (notifyConfig.mentions === 1) {
        allowed.push(NotificationEnumTypes.MENTTION);
      }
      if (notifyConfig.replies === 1) {
        allowed.push(NotificationEnumTypes.REPLY);
      }
      if (notifyConfig.follower === 1) {
        allowed.push(NotificationEnumTypes.FOLLOW);
      }
      if (notifyConfig.messages === 1) {
        allowed.push(NotificationEnumTypes.MESSAGE);
      }
      if (notifyConfig.quotes === 1) {
        allowed.push(NotificationEnumTypes.QUOTE);
      }
      if (notifyConfig.streamer === 1) {
        allowed.push(NotificationEnumTypes.STREAM);
      }
    }

    return Promise.resolve(allowed);
  }

  async countNotifications(user: UserEntity): Promise<any> {
    const allowed = await this.getAllowedList(user.id);
    const list = await this.notificationsRepo.count({
      where: {
        user_id: user.id,
        status: 1,
        from_user_id: Not(user.id),
        type: In(allowed),
      },
    });

    return Promise.resolve(list);
  }

  private markAsRead(notificationId: number) {
    this.notificationsRepo.update({ id: notificationId }, { status: 0 });
  }

  async markAsAllRead(user: UserEntity) {
    this.notificationsRepo.update({ user_id: user.id }, { status: 0 });
  }

  async push(notify: UsersNotifyEntity) {
    const allowed: number[] = await this.getAllowedList(notify.user_id);
    if (allowed.indexOf(notify.type) === -1) {
      return;
    }

    const allowedRecipients = [1, 2, 24];
    // const allowedRecipients = [1,30];

    // if(allowedRecipients.indexOf(<number>notify.user_id) === -1){
    //   return;
    // }

    let conf: UserTokensEntity;
    if (typeof notify.user_id === 'string') {
      conf = await this.userTokensRepository.findOne({
        where: {
          user_id: parseInt(notify.user_id),
          type: '1',
        },
      });
    } else {
      conf = await this.userTokensRepository.findOne({
        where: {
          user_id: notify.user_id,
          type: '1',
        },
      });
    }

    if (conf?.value) {
      const key = process.env.FCM_SERVER_KEY || '';

      let notifyTypeLabel = 'Notification';
      let notifyUrl = 'https://soma.cafe/notifications';

      if (notify.type === NotificationEnumTypes.LIKE) {
        notifyTypeLabel = 'Like';
      }
      if (notify.type === NotificationEnumTypes.SHARE) {
        notifyTypeLabel = 'Share';
      }
      if (notify.type === NotificationEnumTypes.MENTTION) {
        notifyTypeLabel = 'Mention';
      }
      if (notify.type === NotificationEnumTypes.REPLY) {
        notifyTypeLabel = 'Reply';
      }
      if (notify.type === NotificationEnumTypes.FOLLOW) {
        notifyTypeLabel = 'Follower';
      }
      if (notify.type === NotificationEnumTypes.MESSAGE) {
        notifyTypeLabel = 'Message';
        notifyUrl = 'https://soma.cafe/messaging';
      }
      if (notify.type === NotificationEnumTypes.QUOTE) {
        notifyTypeLabel = 'Quote';
      }
      if (notify.type === NotificationEnumTypes.STREAM) {
        notifyTypeLabel = 'Stream Starting';
      }

      const params = {
        registration_ids: [conf?.value],
        data: {
          title: 'Soma Cafe Notification',
          body: `You have a new ${notifyTypeLabel}`,
          url: notifyUrl,
        },
      };

      let ava: UserEntity;
      if (typeof notify.from_user_id === 'string') {
        ava = await this.userRepo.findOne({
          where: { id: parseInt(notify.from_user_id) },
          select: ['ava_src'],
        });
      } else {
        ava = await this.userRepo.findOne({
          where: { id: notify.from_user_id },
          select: ['ava_src'],
        });
      }

      if (ava?.ava_src) {
        params['data']['image'] = ava?.ava_src;
      }

      const result = await this.http.request({
        method: 'POST',
        url: 'https://fcm.googleapis.com/fcm/send',
        headers: {
          Authorization: `key=${key}`,
        },
        data: params,
      });
      const res = await lastValueFrom(result);
      console.log('Notification result', JSON.stringify(res?.data));
    }
  }
}
