import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketServer,
  WebSocketGateway,
} from '@nestjs/websockets';

import { Socket, Server } from 'socket.io';
import { PostApiV2Service } from './post-api-v2.service';

@WebSocketGateway({
  cors: {
    origin: ['http://192.168.0.124:3000', 'https://soma.cafe'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class PostGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly postService: PostApiV2Service) {}

  afterInit(server: Server) {
    console.log('Socket Server is running now.');
  }

  handleConnection(client: Socket) {
    console.log('user connected - post gateway');
  }

//   @SubscribeMessage('TEST_MESSAGE_26-01')
//   async test(client: Socket, formData: any) {
//     console.log('here and now')
//   }

//   @SubscribeMessage('SOCKET_VIDEO_UPLOAD_PROGRESS')
//   async handleVideoThumbnailProgress(client: Socket, formData: any) {
//     console.log('handleVideoThumbnailProgress', formData)
//     this.postService.test(this.server, client, 'test');
//   }

sendThumbnailProgress(data) {
    // Handle your HTTPS request logic here

    // Emit a socket event to the front end'
    this.server.emit('SOCKET_VIDEO_UPLOAD_PROGRESS', data);
  }

  handleDisconnect(client: Socket) {
    console.log('user disconnected');
  }
}
