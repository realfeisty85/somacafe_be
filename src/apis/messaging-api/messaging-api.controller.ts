import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { RoomListDto } from './dto/room.list.dto';
import * as rethink from 'rethinkdb';
import { MessagingApiService } from './messaging-api.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UserApiService } from '../user-api/user-api.service';
import { NewChatDto } from './dto/new.chat.dto';
import { NewChatRoomDto } from './dto/new.chat.room.dto';
import { NewMessageReqDto } from './dto/new.message.req.dto';
import { NewMessageDto } from './dto/new.message.dto';
import * as crypto from 'crypto';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface LinkMetadata {
  title: string;
  description: string;
  image: string;
}
const pageSize = 20;

@Controller('messaging/v1')
export class MessagingApiController {
  constructor(
    private api: MessagingApiService,
    private readonly userApi: UserApiService,
  ) {}

  @Get('admin/setup')
  async setupMessagingDb(@Res() res) {
    const result = await this.api.setup();
    return res.send({
      result,
    });
  }

  @Get('admin/resetdb')
  async resetDb(@Res() res) {
    return res.send({
      result: false,
    });

    // const result = await this.api.resetDb();
    // return res.send({
    //   result,
    // });
  }

  @Get('room/list')
  @UseGuards(JwtAuthGuard)
  async listUserChats(
    @Res() res,
    @Req() req,
    @Query() query: RoomListDto,
  ): Promise<string> {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      const chatList = await this.api.listChats(user);
      return res.status(HttpStatus.OK).json(chatList);
    }
  }

  @Post('room/add')
  @UseGuards(JwtAuthGuard)
  async addChat(
    @Body() newChat: NewChatDto,
    @Res() res,
    @Req() req,
  ): Promise<string> {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      const newChatRoom = new NewChatRoomDto();
      newChatRoom.userId = user.getIdAsHash();
      newChatRoom.roomName = newChat.roomName;
      newChatRoom.users = newChat.users;
      newChatRoom.crc = crypto
        .createHash('md5')
        .update([newChatRoom.userId, ...newChat.users].sort().join('-'))
        .digest('hex');

      const newChatR = await this.api.addChatRoom(newChatRoom);

      return res.status(HttpStatus.CREATED).json(newChatR);
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Unable to create chatroom' });
  }

  @Post('send/:roomHash')
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    // @Body() newMessage: NewMessageReqDto,
    @Body('msg') newMessage: string,
    @Param('roomHash') roomHash: string,
    @Res() res,
    @Req() req,
  ): Promise<string> {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      try {
        const msg = new NewMessageDto();
        msg.roomId = roomHash;
        msg.msg = newMessage; //.msg.trim();
        msg.from = user.getIdAsHash();

        const newMsg = await this.api.sendMessage(msg);
        return res.status(HttpStatus.CREATED).json(newMsg);
      } catch (e) {
        console.log('Send Message Error');
        console.log(e);
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: 'Unable to send message' });
      }
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Unable to send message' });
  }

  @Put('rename/room/:roomHash')
  @UseGuards(JwtAuthGuard)
  async renameRoom(
    @Body('name') newName: string,
    @Param('roomHash') roomHash: string,
    @Res() res,
    @Req() req,
  ): Promise<string> {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      try {
        const room = await this.api.renameRoom(roomHash, newName);
        return res.status(HttpStatus.CREATED).json({
          result: 200,
          message: room ? 'Room Updated' : 'Room Unchanged',
        });
      } catch (e) {
        console.log('Send Message Error');
        console.log(e);
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: 'Unable to send message' });
      }
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Unable to send message' });
  }

  @Get('unread')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@Res() res, @Req() req): Promise<string> {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      try {
        const count = await this.api.getUnreadCount(user);
        return res.status(HttpStatus.CREATED).json({ count });
      } catch (e) {
        console.log('Send Message Error');
        console.log(e);
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: 'Unable to send message' });
      }
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Unable to send message' });
  }

  @Get('room/:roomHash')
  @UseGuards(JwtAuthGuard)
  async getRoomInfo(
    @Body() newMessage: NewMessageReqDto,
    @Param('roomHash') roomHash: string,
    @Res() res,
    @Req() req,
  ): Promise<string> {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      try {
        const info = await this.api.getRoomInfo(roomHash, user);
        if (info === null) {
          return res
            .status(HttpStatus.CREATED)
            .json({ message: 'Not allowed' });
        }
        return res.status(HttpStatus.CREATED).json(info);
      } catch (e) {
        console.log('Send Message Error');
        console.log(e);
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ message: 'Unable to send message' });
      }
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Unable to send message' });
  }

  @Get('read/:roomHash')
  @UseGuards(JwtAuthGuard)
  async readMessages(
    @Body() newMessage: NewMessageReqDto,
    @Param('roomHash') roomHash: string,
    @Query('since') since: string,
    @Query('last') last: string,
    @Query('page') page: number,
    @Res() res,
    @Req() req,
  ): Promise<string> {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      if (page === 0 || !page) {
        page = 1;
      }

      let messageList = await this.api.readMessages(
        roomHash,
        user.getIdAsHash(),
        page,
        pageSize,
        since,
      );

      if (messageList === '' || typeof messageList === 'undefined') {
        messageList = [];
      }

      return res.status(HttpStatus.OK).json(messageList);
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Unable to read messages' });
  }

  @Delete('/admin/remove/user')
  @UseGuards(JwtAuthGuard)
  async removeUser(
    @Query('roomHash') roomHash: string,
    @Query('usr') usr: string,
    @Res() res,
    @Req() req,
  ): Promise<string> {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const removeResult = await this.api.removeUser(user, roomHash, usr);

      return res.status(HttpStatus.OK).json({ message: removeResult });
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Unable to read messages' });
  }

  @Post('/admin/add/user')
  @UseGuards(JwtAuthGuard)
  async addUserToRoom(
    @Body('roomHash') roomHash: string,
    @Body('usr') usr: string,
    @Res() res,
    @Req() req,
  ): Promise<string> {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const addResult = await this.api.addUser(user, roomHash, usr);

      return res.status(HttpStatus.OK).json({ message: addResult });
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Unable to read messages' });
  }

  @Delete('user/room/leave')
  @UseGuards(JwtAuthGuard)
  async leaveRoom(
    @Query('roomHash') roomHash: string,
    @Res() res,
    @Req() req,
  ): Promise<string> {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const addResult = await this.api.leaveRoom(user, roomHash);

      return res.status(HttpStatus.OK).json({ message: addResult });
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Unable to read messages' });
  }

  @Delete('user/room/hide')
  @UseGuards(JwtAuthGuard)
  async hideRoom(
    @Query('roomHash') roomHash: string,
    @Res() res,
    @Req() req,
  ): Promise<string> {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const addResult = await this.api.hideRoom(user, roomHash);

      return res.status(HttpStatus.OK).json({ message: addResult });
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Unable to read messages' });
  }

  @Get('search')
  @UseGuards(JwtAuthGuard)
  async searchUsers(
    @Query('q') userName: string,
    @Res() res,
    @Req() req,
  ): Promise<string> {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      if (!userName) {
        userName = '';
      }
      const searchResult = await this.api.searchUsers(user, userName);
      return res.status(HttpStatus.OK).json({ message: searchResult });
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Unable to read messages' });
  }

  @Post('msg/edit')
  @UseGuards(JwtAuthGuard)
  async editMessage(
    @Query('id') messageId: string,
    @Body('message') messageText: string,
    @Res() res,
    @Req() req,
  ): Promise<string> {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const searchResult = await this.api.editMessage(
        user,
        messageId,
        messageText,
      );
      return res.status(HttpStatus.OK).json({ message: searchResult });
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Unable to read messages' });
  }

  @Delete('msg/delete')
  @UseGuards(JwtAuthGuard)
  async delMessage(
    @Query('id') messageId: string,
    @Res() res,
    @Req() req,
  ): Promise<string> {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const searchResult = await this.api.delMessage(user, messageId);
      return res.status(HttpStatus.OK).json({ message: searchResult });
    }

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Unable to read messages' });
  }

  @Get('link/metadata')
  async linkMetadata(
    @Query('url') url: string,
    @Res() res,
    @Req() req,
  ) {
    try {
      const metadata = await this.getLinkMetadata(url);
      res.status(200).send({
        status: 200,
        metadata,
      });
    } catch (e) {
      res.status(500).json({
        status: 500,
        message: 'Failed to fetch link metadata',
        error: e.message,
      });
    }
  }
  private async getLinkMetadata(url: string): Promise<LinkMetadata> {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      const metadata: LinkMetadata = {
        title: $('meta[property="og:title"]').attr('content') || $('title').text() || '',
        description: $('meta[property="og:description"]').attr('content') || '',
        image: $('meta[property="og:image"]').attr('content') || '',
      };

      return metadata;
    } catch (error) {
      throw new Error('Failed to fetch metadata: ' + error);
    }
  }
}
