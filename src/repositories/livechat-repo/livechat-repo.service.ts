/*
https://docs.nestjs.com/providers#services
*/

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LiveChatEntity } from './entities/livechat.entity';
import { LiveChatBlockListEntity } from './entities/livechat.block.entity';
import { Repository, getManager } from 'typeorm';

import { v4 as uuid } from 'uuid';
import { UserEntity } from '../user-repo/entities/user.entity';
import { LiveChatMuteListEntity } from './entities/livechat.mute.entity';
import { LiveChatWarningListEntity } from './entities/livechat.warning.entity';
import { LiveChatUsersListEntity } from './entities/livechat.users.entity';

@Injectable()
export class LivechatRepoService {
  constructor(
    @InjectRepository(LiveChatEntity)
    private liveChatEntity: Repository<LiveChatEntity>,

    @InjectRepository(UserEntity)
    private userEntity: Repository<UserEntity>,

    @InjectRepository(LiveChatUsersListEntity)
    private liveChatUserEntity: Repository<LiveChatUsersListEntity>,

    @InjectRepository(LiveChatBlockListEntity)
    private liveChatBlockEntity: Repository<LiveChatBlockListEntity>,

    @InjectRepository(LiveChatMuteListEntity)
    private liveChatMuteEntity: Repository<LiveChatMuteListEntity>,

    @InjectRepository(LiveChatWarningListEntity)
    private liveChatWarningEntity: Repository<LiveChatWarningListEntity>,
  ) {}

  async getParentChat(parent_id: string): Promise<any> {
    if (parent_id) {
      const parentChat = await this.liveChatEntity.findOne({
        where: { hash: parent_id },
      });
      if (parentChat) {
        const sender = await this.userEntity.findOne({
          id: parentChat.user_id,
        });
        const responseChat = {
          createdAt: Number(new Date(parentChat.created_at)),
          from: sender.hash,
          id: sender.hash,
          parentId: parentChat.id,
          msg: parentChat.comment,
          sentAt: parentChat.created_at,
          mine: false,
          countLikes: parentChat.count_likes,
          user: {
            name: sender.displayName,
            img: sender.ava_src,
            username: sender.username,
          },
        };
        return Promise.resolve(responseChat);
      }
    }
    return Promise.resolve(null);
  }

  async addUser(data): Promise<any> {
    const { id, streamId, isHost } = data;
    const user = await this.userEntity.findOne({
      hash: id,
    });
    if (user) {
      const existedUser = await this.liveChatUserEntity.findOne({
        where: {
          user_id: user.id,
          stream_id: streamId,
          is_owner: isHost,
        },
      });
      if (existedUser) {
        this.liveChatBlockEntity.update(
          {
            hash: existedUser.hash,
          },
          {
            status: true,
          },
        );
      } else {
        const newUser = new LiveChatUsersListEntity();
        newUser.user_id = user.id;
        newUser.stream_id = streamId;
        newUser.is_owner = isHost;
        newUser.status = true;
        newUser.hash = uuid().toString();
        await this.liveChatUserEntity.save(newUser);
      }
    }
  }

  async getAllActiveUser(streamId: string): Promise<any> {
    const entityManager = getManager();
    const activeUsers = await entityManager.query(
      `SELECT
    livechat_users_list.user_id,
    livechat_users_list.stream_id,
    livechat_users_list.is_owner,
    livechat_users_list.status,
    users.username,
    users.displayName,
    users.ava_src 
  FROM
    livechat_users_list
    JOIN users ON livechat_users_list.user_id = users.id 
  WHERE
    status = TRUE and stream_id = ?`,
      [streamId],
    );
    return Promise.resolve(activeUsers);
  }

  async newChatMsg(newChat): Promise<any> {
    const newLiveChat = new LiveChatEntity();
    const sender = await this.userEntity.findOne({
      hash: newChat.userId,
    });
    if (sender) {
      newLiveChat.user_id = sender.id;
      newLiveChat.stream_id = newChat.streamId;
      newLiveChat.comment = newChat.comment;
      newLiveChat.hash = uuid().toString();
      const parentChat = await this.getParentChat(newChat.parentId);
      newLiveChat.parent_id = parentChat?.parentId;
      const savedChat = await this.liveChatEntity.save(newLiveChat);
      const parsedChat = {
        createdAt: Number(new Date(savedChat.created_at)),
        from: sender.hash,
        id: savedChat.hash,
        msg: savedChat.comment,
        sentAt: savedChat.created_at,
        mine: true,
        countLikes: savedChat.count_likes,
        user: {
          name: sender.displayName,
          img: sender.ava_src,
          username: sender.username,
        },
        parentChat: parentChat,
      };
      return Promise.resolve(parsedChat);
    }
    return Promise.resolve({});
  }

  async getAllChat(streamId): Promise<any> {
    const entityManager = getManager();
    const chatHistory = await entityManager.query(
      `SELECT 
    	livechat.user_id, 
	livechat.stream_id, 
	livechat.parent_id, 
	livechat.count_likes, 
	livechat.comment, 
	livechat.id, 
	livechat.created_at, 
	livechat.updated_at, 
  livechat.hash, 
	users.username, 
	users.displayName, 
	users.ava_src,
	users.hash as userhash 
  FROM 
    livechat 
  JOIN 
    users ON livechat.user_id = users.id 
  WHERE 
    stream_id = ?`,
      [streamId],
    );
    const newChatHistory = chatHistory.map((chat: any) => {
      if (chat.parent_id) {
        const parentChat = chatHistory.filter(
          (el: any) => el.id === chat.parent_id,
        );
        if (parentChat.length > 0) {
          const parsedParentChat = {
            createdAt: Number(new Date(parentChat[0].created_at)),
            from: parentChat[0].userhash,
            id: parentChat[0].hash,
            msg: parentChat[0].comment,
            sentAt: parentChat[0].created_at,
            mine: false,
            countLikes: parentChat[0].count_likes,
            parentChat: parentChat[0].parentChat,
            user: {
              name: parentChat[0].displayName,
              img: parentChat[0].ava_src,
              username: parentChat[0].username,
            },
          };
          return { ...chat, parentChat: parsedParentChat };
        }
      }
      return chat;
    });
    return Promise.resolve(newChatHistory);
  }

  async editChatMsg(data: any): Promise<any> {
    const { id, message } = data;
    const chatMsg = this.liveChatEntity.findOne({
      where: {
        hash: id,
      },
    });
    if (chatMsg) {
      await this.liveChatEntity.update({ hash: id }, { comment: message });
      Promise.resolve(true);
    }
    Promise.resolve(false);
  }

  async deleteChatMsg(id: string): Promise<any> {
    const chat = await this.liveChatEntity.findOne({ hash: id });
    const owner = await this.userEntity.findOne({ id: chat.user_id });
    await this.liveChatEntity.delete({ hash: id });
    return Promise.resolve(owner);
  }

  async likeChatMsg(id: string, likedUser: string): Promise<any> {
    const originChat: LiveChatEntity = await this.liveChatEntity.findOne({
      where: { hash: id },
    });
    const owner = await this.userEntity.findOne({
      where: { id: originChat.user_id },
    });
    const commenter = await this.userEntity.findOne({
      where: { hash: likedUser },
    });
    await this.liveChatEntity.update(
      { hash: id },
      { count_likes: originChat.count_likes + 1 },
    );
    return Promise.resolve({ owner, commenter });
  }

  async listBlockedUserList(streamId: string): Promise<any[]> {
    const entityManager = getManager();
    const blockedUserList: any[] = await entityManager.query(
      `SELECT
      USERLIST.hash AS user_id,
      BLOCKEDUSERLIST.hash AS blocked_user_id,
      BLOCKLIST.stream_id,
      BLOCKLIST.is_owner,
      BLOCKLIST.status,
      BLOCKLIST.hash
    FROM
      livechat_block_list AS BLOCKLIST
      LEFT JOIN users AS USERLIST ON BLOCKLIST.user_id = USERLIST.id
      LEFT JOIN users AS BLOCKEDUSERLIST ON BLOCKLIST.blocked_user_id = BLOCKEDUSERLIST.id
    WHERE
      BLOCKLIST.stream_id = ?`,
      [streamId],
    );
    const parsedData: any[] = blockedUserList.map((blockedUser: any) => {
      if (blockedUser) {
        return {
          userId: blockedUser.user_id,
          blockedUserId: blockedUser.blocked_user_id,
          streamId: blockedUser.stream_id,
          isHost: blockedUser.is_owner === 1 ? true : false,
          isBlock: blockedUser.status === 1 ? true : false,
          hash: blockedUser.hash,
        };
      } else return {};
    });
    return Promise.resolve(parsedData);
  }

  async blockUser(data: any): Promise<any> {
    const { userId, blockedUserId, streamId, isHost, isBlock } = data;
    const ownerUser = await this.userEntity.findOne({
      where: { hash: userId },
    });
    const blockUser = await this.userEntity.findOne({
      where: { hash: blockedUserId },
    });

    const blockedUser = await this.liveChatBlockEntity.findOne({
      where: {
        user_id: ownerUser.id,
        blocked_user_id: blockUser.id,
        stream_id: streamId,
      },
    });
    if (blockedUser) {
      await this.liveChatBlockEntity.update(
        { hash: blockedUser.hash },
        { status: isBlock },
      );
      return Promise.resolve({
        owner: ownerUser,
        blockedUser: blockUser,
        hash: blockedUser.hash,
      });
    } else {
      const newBlockUser = new LiveChatBlockListEntity();
      newBlockUser.user_id = ownerUser.id;
      newBlockUser.blocked_user_id = blockUser.id;
      newBlockUser.stream_id = streamId;
      newBlockUser.is_owner = isHost;
      newBlockUser.status = true;
      newBlockUser.hash = uuid().toString();
      const blockedResult = await this.liveChatBlockEntity.save(newBlockUser);
      return Promise.resolve({
        owner: ownerUser,
        blockedUser: blockUser,
        hash: blockedResult.hash,
      });
    }
  }

  async listMutedUserList(streamId: string): Promise<any[]> {
    const entityManager = getManager();
    const mutedUserList: any[] = await entityManager.query(
      `SELECT
      USERLIST.hash AS user_id,
      MUTEDUSERLIST.hash AS muted_user_id,
      MUTELIST.stream_id,
      MUTELIST.is_owner,
      MUTELIST.status,
      MUTELIST.hash
    FROM
      livechat_mute_list AS MUTELIST
      LEFT JOIN users AS USERLIST ON MUTELIST.user_id = USERLIST.id
      LEFT JOIN users AS MUTEDUSERLIST ON MUTELIST.muted_user_id = MUTEDUSERLIST.id
    WHERE
      MUTELIST.stream_id = ?`,
      [streamId],
    );
    const parsedData: any[] = mutedUserList.map((mutedUser: any) => {
      if (mutedUser) {
        return {
          userId: mutedUser.user_id,
          mutedUserId: mutedUser.muted_user_id,
          streamId: mutedUser.stream_id,
          isHost: mutedUser.is_owner === 1 ? true : false,
          isMute: mutedUser.status === 1 ? true : false,
          hash: mutedUser.hash,
        };
      } else return {};
    });
    return Promise.resolve(parsedData);
  }

  async muteUser(data: any): Promise<any> {
    const { userId, mutedUserId, streamId, isHost, isMute } = data;
    const ownerUser = await this.userEntity.findOne({
      where: { hash: userId },
    });
    const muteUser = await this.userEntity.findOne({
      where: { hash: mutedUserId },
    });

    const mutedUser = await this.liveChatMuteEntity.findOne({
      where: {
        user_id: ownerUser.id,
        muted_user_id: muteUser.id,
        stream_id: streamId,
      },
    });

    if (mutedUser) {
      await this.liveChatMuteEntity.update(
        { hash: mutedUser.hash },
        { status: isMute },
      );
      return Promise.resolve({
        owner: ownerUser,
        mutedUser: muteUser,
        hash: mutedUser.hash,
      });
    } else {
      const newMuteUser = new LiveChatMuteListEntity();
      newMuteUser.user_id = ownerUser.id;
      newMuteUser.muted_user_id = muteUser.id;
      newMuteUser.stream_id = streamId;
      newMuteUser.is_owner = isHost;
      newMuteUser.status = isMute;
      newMuteUser.hash = uuid().toString();
      const savedResult = await this.liveChatMuteEntity.save(newMuteUser);
      return Promise.resolve({
        owner: ownerUser,
        mutedUser: muteUser,
        hash: savedResult.hash,
      });
    }
  }

  async listWarnedUserList(streamId: string): Promise<any[]> {
    const entityManager = getManager();
    const warnedUserList: any[] = await entityManager.query(
      `SELECT
      USERLIST.hash AS user_id,
      WARNEDUSERLIST.hash AS warned_user_id,
      WARNINGLIST.stream_id,
      WARNINGLIST.is_owner,
      WARNINGLIST.status,
			WARNINGLIST.updated_at,
      WARNINGLIST.hash
    FROM
      livechat_warning_list AS WARNINGLIST
LEFT JOIN users AS USERLIST ON WARNINGLIST.user_id = USERLIST.id
      LEFT JOIN users AS WARNEDUSERLIST ON WARNINGLIST.warned_user_id = WARNEDUSERLIST.id
    WHERE
      WARNINGLIST.stream_id = ?`,
      [streamId],
    );
    const parsedData: any[] = warnedUserList.map((warnedUser: any) => {
      if (warnedUser) {
        return {
          userId: warnedUser.user_id,
          warnedUserId: warnedUser.warned_user_id,
          streamId: warnedUser.stream_id,
          isHost: warnedUser.is_owner === 1 ? true : false,
          isWarning: warnedUser.status === 1 ? true : false,
          startTime: Number(new Date(warnedUser.updated_at)),
          hash: warnedUser.hash,
        };
      } else return {};
    });
    return Promise.resolve(parsedData);
  }

  async warnUser(data: any): Promise<any> {
    const { userId, warnedUserId, streamId, isHost, isWarning } = data;
    const ownerUser = await this.userEntity.findOne({
      where: { hash: userId },
    });
    const warningUser = await this.userEntity.findOne({
      where: { hash: warnedUserId },
    });

    const warnedUser = await this.liveChatWarningEntity.findOne({
      where: {
        user_id: ownerUser.id,
        warned_user_id: warningUser.id,
        stream_id: streamId,
      },
    });

    if (warnedUser) {
      await this.liveChatWarningEntity.update(
        { hash: warnedUser.hash },
        { status: isWarning },
      );
      return Promise.resolve(warnedUser.hash);
    } else {
      const newWarnedUser = new LiveChatWarningListEntity();
      newWarnedUser.user_id = ownerUser.id;
      newWarnedUser.warned_user_id = warningUser.id;
      newWarnedUser.stream_id = streamId;
      newWarnedUser.is_owner = isHost;
      newWarnedUser.status = isWarning;
      newWarnedUser.hash = uuid().toString();
      const savedResult = await this.liveChatWarningEntity.save(newWarnedUser);
      return Promise.resolve(savedResult.hash);
    }
  }

  async getBlockers(data: any): Promise<any> {
    const { userId, streamId } = data;
    const userInfo = await this.userEntity.findOne({
      where: { hash: userId },
    });
    const blockList: LiveChatBlockListEntity[] =
      await this.liveChatBlockEntity.find({
        where: {
          blocked_user_id: userInfo.id,
          stream_id: streamId,
          status: true,
        },
      });
    if (blockList) {
      return Promise.resolve(blockList);
    } else return Promise.resolve({});
  }

  async getBlcokedUsers(data: any): Promise<any> {
    const { userId, streamId } = data;
    const userInfo: UserEntity = await this.userEntity.findOne({
      where: { hash: userId },
    });
    const blockedUserList: LiveChatBlockListEntity[] =
      await this.liveChatBlockEntity.find({
        where: {
          user_id: userInfo.id,
          stream_id: streamId,
          status: true,
        },
      });
    if (blockedUserList) Promise.resolve(blockedUserList);
    else Promise.resolve({});
  }

  async getMuters(data: any): Promise<any> {
    const { userId, streamId } = data;
    const userInfo = await this.userEntity.findOne({
      where: { hash: userId },
    });
    const muteList: LiveChatMuteListEntity[] =
      await this.liveChatMuteEntity.find({
        where: {
          muted_user_id: userInfo.id,
          stream_id: streamId,
          status: true,
        },
      });
    if (muteList) {
      return Promise.resolve(muteList);
    } else return Promise.resolve({});
  }

  async getMutedUsers(data: any): Promise<any> {
    const { userId, streamId } = data;
    const userInfo: UserEntity = await this.userEntity.findOne({
      where: { hash: userId },
    });
    const mutedUserList: LiveChatMuteListEntity[] =
      await this.liveChatMuteEntity.find({
        where: {
          user_id: userInfo.id,
          stream_id: streamId,
          status: true,
        },
      });
    if (mutedUserList) Promise.resolve(mutedUserList);
    else Promise.resolve({});
  }

  async getWarners(data: any): Promise<any> {
    const { userId, streamId } = data;
    const userInfo = await this.userEntity.findOne({
      where: { hash: userId },
    });
    const warnList: LiveChatWarningListEntity[] =
      await this.liveChatWarningEntity.find({
        where: {
          warned_user_id: userInfo.id,
          stream_id: streamId,
          status: true,
        },
      });
    if (warnList) {
      return Promise.resolve(warnList);
    } else return Promise.resolve({});
  }

  async getWarnedUsers(data: any): Promise<any> {
    const { userId, streamId } = data;
    const userInfo: UserEntity = await this.userEntity.findOne({
      where: { hash: userId },
    });
    const warnedUserList: LiveChatWarningListEntity[] =
      await this.liveChatWarningEntity.find({
        where: {
          user_id: userInfo.id,
          stream_id: streamId,
          status: true,
        },
      });
    if (warnedUserList) Promise.resolve(warnedUserList);
    else Promise.resolve({});
  }
}
