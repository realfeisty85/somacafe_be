import { UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketServer,
  WebSocketGateway,
} from '@nestjs/websockets';

import { socketEventCode } from './chat.eventcode';

import { Socket, Server } from 'socket.io';
import { ChatService } from './chat.service';

@WebSocketGateway(Number(process.env.WSS_PORT), {
  transports: ['websocket'],
  cors: {
    origin: ['http://localhost:3000', 'https://soma.cafe'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  cookie: true,
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server;

  constructor(private readonly chatService: ChatService) {}

  afterInit(server: Server) {
    console.log('Socket Server is running now.');
  }

  handleConnection(client: Socket) {
    console.log('user connected');
  }

  @SubscribeMessage(socketEventCode.SOCKET_ROOM_CONNECT)
  handleJoin(client: Socket, data: string) {
    this.chatService.handleJoin(this.server, client, JSON.parse(data));
  }

  @SubscribeMessage(socketEventCode.SOCKET_NEW_TEST_MESSAGE)
  handleTestMessage(client: Socket, data: string) {
    client.emit('test message arrived', data);
  }

  @SubscribeMessage(socketEventCode.SOCKET_ROOM_LEAVE)
  handleLeave(client: any, roomId: string) {
    console.log(`Client ${client.id} leaved room: ${roomId}`);
    client.leave(roomId);
  }

  @SubscribeMessage(socketEventCode.SOCKET_NEW_MESSAGE)
  async handleNewMessage(client: Socket, data: string) {
    const reqMsg = JSON.parse(data);
    this.chatService.newChat(this.server, client, reqMsg);
  }

  @SubscribeMessage(socketEventCode.SOCKET_MESSAGE_EDIT)
  async handleEditMessage(client: Socket, data: string) {
    this.chatService.editChat(this.server, client, JSON.parse(data));
  }

  @SubscribeMessage(socketEventCode.SOCKET_MESSAGE_DELETE)
  async handleDeleteMessage(client: Socket, data: string) {
    this.chatService.deleteChat(this.server, client, JSON.parse(data));
  }

  @SubscribeMessage(socketEventCode.SOCKET_CHAT_LIKE)
  async handleLikeMessage(client: Socket, data: string) {
    this.chatService.likeChat(this.server, client, JSON.parse(data));
  }

  @SubscribeMessage(socketEventCode.SOCKET_USER_BLOCK)
  async handleBlockUser(client: Socket, data: string) {
    this.chatService.blockUser(this.server, client, JSON.parse(data));
  }

  @SubscribeMessage(socketEventCode.SOCKET_USER_MUTE)
  async handleMuteuser(client: Socket, data: string) {
    this.chatService.muteUser(this.server, client, JSON.parse(data));
  }

  @SubscribeMessage(socketEventCode.SOCKET_USER_WARNING)
  async handleWarnUser(client: Socket, data: string) {
    this.chatService.warnUser(this.server, client, JSON.parse(data));
  }

  handleDisconnect(client: Socket) {
    console.log('user disconnected');
  }
}
