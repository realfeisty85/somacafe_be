import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Put,
  Param,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { StreamApiService } from './stream-api.service';
import { UserApiService } from '../user-api/user-api.service';
import { PostApiService } from '../post-api/post-api.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  EVENT_STREAM_RECORD_READY,
  EVENT_STREAM_ENDED,
  QUERY_FLAG_FALSE,
  STREAMS_LIMIT_DEFAULT,
  STREAMS_PAGE_DEFAULT,
  EVENT_STREAM_STARTED,
} from './constants';
import { formVideoPostContent } from './helpers/form-video-post-content';
import { extractUserHashFromStreamId } from './helpers/extract-user-hash-from-stream-id';
import { PostEntity } from 'src/repositories/post-repo/entities/post.entity';

require('dotenv').config();

const recordsFolderPath = process.env.STREAM_RECORDS_FOLDER_PATH;

@Controller('stream/v1')
export class StreamApiController {
  constructor(
    private streamService: StreamApiService,
    private readonly userService: UserApiService,
    private readonly postService: PostApiService,
  ) {}

  @Get('following')
  @UseGuards(JwtAuthGuard)
  async getAllFollowing(@Query() query: any, @Req() req: any) {
    const {
      page = STREAMS_PAGE_DEFAULT,
      limit = STREAMS_LIMIT_DEFAULT,
      active,
    } = query;
    const user = await this.userService
      .getUserRepo()
      .getUserBySessionId(req.user.userId);

    if (!user) {
      throw new NotFoundException('User is not found');
    }

    const isActive = active !== QUERY_FLAG_FALSE;

    return this.streamService.getAllFollowing(user.id, page, limit, isActive);
  }

  @Get('streaminfo')
  @UseGuards(JwtAuthGuard)
  async getStreaminfo(@Query() query: any, @Res() res) {
    const streamId = query.stream_id;
    const stream = await this.streamService.getOneByStreamId(streamId);
    const streamPost = await this.postService.postByHash(stream.post_hash);
    console.log('streamPost');
    res.status(200).json(Promise.resolve(streamPost));
  }

  @Get('following/count')
  @UseGuards(JwtAuthGuard)
  async getFollowingCount(@Req() req: any) {
    const user = await this.userService
      .getUserRepo()
      .getUserBySessionId(req.user.userId);

    if (!user) {
      throw new NotFoundException('User is not found');
    }

    return this.streamService.getFollowingCount(user.id, true);
  }

  @UseGuards(JwtAuthGuard)
  @Put('updateMeta/:stream_id')
  @UseInterceptors(FileInterceptor('attachment'))
  async updateStreamPost(
    @UploadedFile() attachment,
    @Body('title') streamTitle: string,
    @Body('description') streamDescription: string,
    @Body('privacy') privacy: number,
    @Req() req,
    @Param('stream_id') streamId: string,
  ) {
    const user = await this.userService
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      const stream = await this.streamService.getOneByStreamId(streamId);
      if (stream) {
        const { post_hash } = stream;
        const streamPost: any = await this.postService.postByHash(
          post_hash,
          false,
          true,
        );
        return await this.postService.updateLinkMeta(
          streamPost,
          streamTitle,
          privacy,
          streamDescription,
          attachment,
        );
      }
    } else throw new NotFoundException('User is not found');
  }

  @Post('listener')
  async handleStreamEvent(@Body() body: any) {
    switch (body.action) {
      case EVENT_STREAM_STARTED: {
        const streamId = body.id;
        const userHash = extractUserHashFromStreamId(streamId);
        const user = await this.userService
          .getUserRepo()
          .findUserByhash(userHash, null);

        if (user) {
          await this.streamService.addOne(streamId, user.id);
          await this.streamService.startRecording(streamId);
        }

        break;
      }
      case EVENT_STREAM_ENDED:
        await this.streamService.finishOneByStreamId(body.id);
        break;

      case EVENT_STREAM_RECORD_READY: {
        const recordName = body.vodName;
        const fullPath = `${recordsFolderPath}/${recordName}.mp4`;
        const content = formVideoPostContent(fullPath);
        const streamId = body.id;
        const stream = await this.streamService.getOneByStreamId(streamId);
        const streamPost = await this.postService.postByHash(
          stream.post_hash,
          true,
        );

        const user = await this.userService
          .getUserRepo()
          .findOne(String(stream.user_id));
        await this.postService.updateStreamPost(
          content,
          streamPost as PostEntity,
        );
        // await this.postService.addPostv2(
        //   user,
        //   content,
        //   null,
        //   '0' as any,
        //   null,
        //   null,
        //   null,
        //   null,
        //   null,
        // );
        break;
      }

      default:
        break;
    }
  }
}
