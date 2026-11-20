/*
https://docs.nestjs.com/providers#services
*/

import { Injectable } from '@nestjs/common';
import { socketEventCode } from './chat.eventcode';
import { Socket, Server } from 'socket.io';
import { LivechatRepoService } from 'src/repositories/livechat-repo/livechat-repo.service';
import { PostApiService } from 'src/apis/post-api/post-api.service';

@Injectable()
export class ChatService {
  constructor(
    private readonly liveChatService: LivechatRepoService,
    private readonly postApiService: PostApiService,
  ) {}
  async handleJoin(server: Server, client: Socket, data: any) {
    if (data.streamId && data.name) {
      console.log(`Client ${client.id} joined room: ${data.streamId}`);
      client.join(data.streamId);
      await this.liveChatService.addUser(data);
      const chatHistory = await this.liveChatService.getAllChat(data.streamId);
      const parsedChat = chatHistory.map((chat) => {
        return {
          createdAt: Number(new Date(chat.created_at)),
          from: chat.userhash,
          id: chat.hash,
          msg: chat.comment,
          sentAt: chat.created_at,
          mine: data.id === chat.userhash,
          countLikes: chat.count_likes,
          parentChat: chat.parentChat,
          user: {
            name: chat.displayName,
            img: chat.ava_src,
            username: chat.username,
          },
        };
      });
      server
        .to(client.id)
        .emit(socketEventCode.SOCKET_CHAT_HISTORY, JSON.stringify(parsedChat));
      const alert = {
        type: 'success',
        username: data.name,
        message: 'Chat Room Connected',
      };
      server
        .to(client.id)
        .emit(socketEventCode.SOCKET_ALERT, JSON.stringify(alert));

      const activeUsers = await this.liveChatService.getAllActiveUser(
        data.streamId,
      );
      server
        .to(data.streamId)
        .emit(
          socketEventCode.SOCKET_RESPONSE_ACTIVE_USERS,
          JSON.stringify(activeUsers),
        );

      const hashTags = await this.postApiService.listAnyHashtags();
      server
        .to(client.id)
        .emit(
          socketEventCode.SOCKET_RESPONSE_ANY_HASH_TAGS,
          JSON.stringify(hashTags),
        );

      const blockedList = await this.liveChatService.listBlockedUserList(
        data.streamId,
      );
      server
        .to(client.id)
        .emit(
          socketEventCode.SOCKET_RESPONSE_BLOCKED_LIST,
          JSON.stringify(blockedList),
        );

      const mutedList = await this.liveChatService.listMutedUserList(
        data.streamId,
      );
      server
        .to(client.id)
        .emit(
          socketEventCode.SOCKET_RESPONSE_MUTED_LIST,
          JSON.stringify(mutedList),
        );

      const warnedList = await this.liveChatService.listWarnedUserList(
        data.streamId,
      );
      server
        .to(client.id)
        .emit(
          socketEventCode.SOCKET_RESPONSE_WARNED_LIST,
          JSON.stringify(warnedList),
        );
    } else {
    }
  }

  async newChat(server: Server, client: Socket, data: any) {
    console.log(`Client ${client.id} sent new message`);
    const newMessage = await this.liveChatService.newChatMsg(data);
    if (newMessage) {
      client
        .to(data.streamId)
        .emit(
          socketEventCode.SOCKET_NEW_MESSAGE_ARRIVED,
          JSON.stringify({ ...newMessage, mine: false }),
        );

      server
        .to(client.id)
        .emit(
          socketEventCode.SOCKET_NEW_MESSAGE_ARRIVED,
          JSON.stringify(newMessage),
        );

      const alert = {
        type: 'success',
        message: 'New message arrived',
      };
      client
        .to(data.streamId)
        .emit(socketEventCode.SOCKET_ALERT, JSON.stringify(alert));
    } else {
      const alert = {
        type: 'error',
        message: 'Message did not sent',
      };
      server
        .to(client.id)
        .emit(socketEventCode.SOCKET_ALERT, JSON.stringify(alert));
    }
  }

  async editChat(server: Server, client: Socket, data: any) {
    const result = this.liveChatService.editChatMsg(data);
    if (result) {
      client
        .to(data.streamId)
        .emit(socketEventCode.SOCKET_MESSAGE_EDITED, JSON.stringify(data));

      server
        .to(client.id)
        .emit(socketEventCode.SOCKET_MESSAGE_EDITED, JSON.stringify(data));
    }
  }

  async deleteChat(server: Server, client: Socket, data: any) {
    const { id, streamId } = data;
    const owner = await this.liveChatService.deleteChatMsg(id);
    client
      .to(streamId)
      .emit(socketEventCode.SOCKET_MESSAGE_DELETED, JSON.stringify(data));

    server
      .to(client.id)
      .emit(socketEventCode.SOCKET_MESSAGE_DELETED, JSON.stringify(data));

    const alert = {
      type: 'success',
      receiver: owner.hash,
      message: 'Your message deleted by streamer',
    };
    client
      .to(streamId)
      .emit(socketEventCode.SOCKET_ALERT, JSON.stringify(alert));
  }

  async likeChat(server: Server, client: Socket, data: any) {
    const { id, streamId, likedUser } = data;
    const { owner, commenter } = await this.liveChatService.likeChatMsg(
      id,
      likedUser,
    );

    server
      .to(streamId)
      .emit(socketEventCode.SOCKET_CHAT_LIKED, JSON.stringify(data));
    const alert = {
      type: 'success',
      receiver: owner.hash,
      message: `Your comment was liked by @${commenter.username}`,
    };
    client
      .to(streamId)
      .emit(socketEventCode.SOCKET_ALERT, JSON.stringify(alert));
  }

  async blockUser(server: Server, client: Socket, data: any) {
    const { owner, blockedUser, hash } = await this.liveChatService.blockUser(
      data,
    );
    const { isHost, streamId } = data;
    server
      .to(data.streamId)
      .emit(
        socketEventCode.SOCKET_USER_BLOCKED,
        JSON.stringify({ ...data, hash }),
      );
    const message = isHost
      ? `You've been blocked`
      : `You no longer see @${owner.username} messages`;
    const alert = {
      type: 'success',
      receiver: blockedUser.hash,
      message: message,
    };
    client
      .to(streamId)
      .emit(socketEventCode.SOCKET_ALERT, JSON.stringify(alert));
  }

  async muteUser(server: Server, client: Socket, data: any) {
    const { owner, mutedUser, hash } = await this.liveChatService.muteUser(
      data,
    );
    const { isHost, streamId } = data;
    server
      .to(data.streamId)
      .emit(
        socketEventCode.SOCKET_USER_MUTED,
        JSON.stringify({ ...data, hash }),
      );
    const message = isHost
      ? `You've been muted`
      : `You can no longer reply @${owner.username}`;
    const alert = {
      type: 'success',
      receiver: mutedUser.hash,
      message: message,
    };
    client
      .to(streamId)
      .emit(socketEventCode.SOCKET_ALERT, JSON.stringify(alert));
  }

  async warnUser(server: Server, client: Socket, data: any) {
    const hash = await this.liveChatService.warnUser(data);
    server
      .to(data.streamId)
      .emit(
        socketEventCode.SOCKET_USER_WARNED,
        JSON.stringify({ ...data, hash }),
      );
  }
}
