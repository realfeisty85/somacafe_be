import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FeedPostDto } from '../../repositories/post-repo/dto/feed.post.dto';
import { PostApiService } from '../post-api/post-api.service';
import { UserApiService } from '../user-api/user-api.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SearchApiV2Service } from './search-api-v2.service';
import MentionsRequestDto from '../../repositories/user-repo/dto/mentions.request.dto';

@Controller('search/v2')
export class SearchApiV2Controller {
  constructor(
    private readonly postApi: PostApiService,
    private readonly userApi: UserApiService,
    private readonly api: SearchApiV2Service,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('latest')
  async searchLatest(
    @Query('q') query: string,
    @Query('pg') pg: number,
    @Req() req,
    @Res() res,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      if (!pg) {
        pg = 1;
      }
      if (pg && pg < 1) {
        pg = 1;
      }

      let result = await this.api.searchLatest(query, user, pg);
      result = await this.postApi.fixPosts(result, user);
      res.status(200).json({ status: 200, posts: result });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('images')
  async searchPostsWithImages(
    @Query('q') query: string,
    @Query('pg') pg: number,
    @Req() req,
    @Res() res,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      if (!pg) {
        pg = 1;
      }
      if (pg && pg < 1) {
        pg = 1;
      }

      let result = await this.api.searchPostsWithImages(query, user, pg);
      result = await this.postApi.fixPosts(result, user);
      res.status(200).json({ status: 200, posts: result });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('people')
  async searchPeople(
    @Query('q') query: string,
    @Query('pg') pg: number,
    @Query('limit') limit: number,
    @Req() req,
    @Res() res,
  ) {
    console.log('search people query');
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      if (!pg) {
        pg = 1;
      }
      if (pg && pg < 1) {
        pg = 1;
      }

      const result = await this.api.searchPeople(query, user, pg, limit);
      res.status(200).json({ status: 200, people: result });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('top')
  async searchTop(
    @Query('q') query: string,
    @Query('pg') pg: number,
    @Req() req,
    @Res() res,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      if (!pg) {
        pg = 1;
      }
      if (pg && pg < 1) {
        pg = 1;
      }

      const result = await this.api.searchTopPosts(query, user, pg);
      res.status(200).json({ status: 200, posts: result });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('mentions')
  async userMentionList(@Res() res, @Req() req, @Query('q') q: string) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      const result = await this.userApi.mentnionList(user.id, q);
      if (result) {
        res.status(200).send({ status: 'success', result: result });
      } else {
        res.status(404).send({ status: 'fail', message: 'Result not found' });
      }
    }
  }
}
