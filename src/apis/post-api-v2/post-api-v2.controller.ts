import {
  Body,
  Controller,
  Delete,
  Param,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Put,
  UploadedFiles,
} from '@nestjs/common';
import { FeedPostDto } from '../../repositories/post-repo/dto/feed.post.dto';
import { PostApiService } from '../post-api/post-api.service';
import { PostApiV2Service } from './post-api-v2.service';
import { PostGateway } from './post-api-v2.gateway';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UserApiService } from '../user-api/user-api.service';
import { PostByHashDto } from '../../repositories/post-repo/dto/post.by.hash.dto';
import * as crypto from 'crypto';
import { PostLikeToggleRequestDto } from './dto/post.like.toggle.request.dto';
import { PostFetchRequestDto } from './dto/post.fetch.request.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NewPostEventDto } from './dto/new.post.event.dto';
import { ReportEntity } from '../../repositories/report-repo/entities/report.entity';
import { ReportApiService } from '../report-api/report-api.service';
import { AddReportV2Dto } from '../../repositories/report-repo/dto/add.report.v2.dto';
import {
  FileInterceptor,
  FilesInterceptor,
  AnyFilesInterceptor,
} from '@nestjs/platform-express';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';
import { PostByUsernameDto } from '../../repositories/post-repo/dto/post.by.username.dto';
import { LinkMetaEntity } from '../../repositories/post-repo/entities/link.meta.entity';
import { LoggingInterceptor } from '../logging/logging.interceptor';
@UseInterceptors(LoggingInterceptor)
@Controller('post/v2')
export class PostApiV2Controller {
  constructor(
    private readonly postApi: PostApiService,
    private readonly userApi: UserApiService,
    private readonly reportApi: ReportApiService,
    private readonly postGateway: PostGateway,
    private postApiServiceV2: PostApiV2Service,
    private eventEmitter: EventEmitter2,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('posts-feed')
  async postFeed(@Query() query: FeedPostDto, @Req() req, @Res() res) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      let result = await this.postApi.generateUserPostFeedByUserHashOrId(
        query,
        null,
        user.id,
      );
      if (query.h) {
        result = [await this.postApi.fixPosts(result, user, true)];
      } else {
        result = await this.postApi.fixPosts(result, user);
      }

      //const pp = await this.postApi.postFeedByUser(user, query.pg);

      if (result) {
        if (query.h && result.length === 1) {
          res.status(200).json({ status: 200, post: result[0] });
        } else {
          res.status(200).json({ status: 200, posts: result });
        }
        return;
      }
    }
    res.status(500).json({ status: 500, message: 'No data' });
  }

  @UseGuards(JwtAuthGuard)
  @Get('feed')
  async postFeedv3(
    @Query('pg') pg: number,
    @Query('h') postHash: string,
    @Query('type') postType: string,
    @Query('u') username: string,
    @Req() req,
    @Res() res,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      let theUser: any = user;
      if (username && username !== '') {
        const profileUser = await this.userApi.getProfileByUsername(
          {
            username: username,
          },
          user.id.toString(),
          true,
        );
        if (profileUser && Number(profileUser.id) > 0) {
          theUser = profileUser;
        }
      }

      const result = await this.postApi.generatePostFeedv3(
        theUser,
        pg,
        user,
        postHash,
        postType,
      );
      //result = await this.postApi.fixPosts(result, user);
      if (postHash) {
        return res.status(200).json({ status: 200, post: result });
      }
      return res.status(200).json({ status: 200, posts: result });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('posts-meta')
  async postMetaFeed(
    @Query('type') postType: string,
    @Query('pg') pg: number,
    @Query('h') postHash: string,
    @Req() req,
    @Res() res,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      let result = await this.postApi.userPostFeedByType(
        user,
        postType,
        postHash,
        pg,
      );
      result = await this.postApi.fixPosts(result, user);
      res.status(200).json({ status: 200, posts: result });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('vote')
  async voteOnPoll(
    @Body('postId') postId: string,
    @Body('voteId') voteId: number,
    @Req() req,
    @Res() res,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      const result = await this.postApi.voteOnPollv2(user, postId, voteId);

      const result2 = await this.postApi.generateUserPostFeedByUserHashOrId(
        { limit: '', max_post_id: '', user_id: '', h: postId },
        null,
        user.id,
      );

      res.status(200).json({ status: 200, posts: result2 });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-userhash')
  async postByHash(@Query() query: PostByHashDto, @Req() req, @Res() res) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const site_user_id = user.id;
      let profileUser;

      if (query.h) {
        profileUser = await this.userApi.getProfileByUserHash(
          {
            userHash: query.h,
            pg: query.pg,
          },
          false,
          user,
        );
      } else {
        profileUser = await this.userApi.getProfileByUserHash(
          {
            userHash: user.getIdAsHash(),
            pg: query.pg,
          },
          false,
          user,
        );
      }

      if (profileUser?.id) {
        const user_id = profileUser.id;
        const fp = new FeedPostDto();
        fp.site_user_id = String(site_user_id);
        fp.user_id = String(user_id);
        fp.pg = query.pg;

        let result = await this.getPostDataByLookup(user, profileUser, fp);
        result = await this.postApi.fixPosts(result, user);

        res.status(200).json(result);
        return;
      }
      res.status(500).json({ message: 'Error retrieving data', status: 500 });
      return;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('by-username')
  async postByUsername(
    @Query() query: PostByUsernameDto,
    @Req() req,
    @Res() res,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const site_user_id = user.id;
      let profileUser;

      if (query.u) {
        profileUser = await this.userApi.getProfileByUsername(
          {
            username: query.u,
          },
          user.id.toString(),
          true,
        );
      } else {
        profileUser = await this.userApi.getProfileByUserHash(
          {
            userHash: user.getIdAsHash(),
            pg: query.pg,
          },
          false,
          user,
        );
      }

      if (!profileUser?.id) {
        res.status(500);
        return;
      }

      const user_id = profileUser.id;
      const fp = new FeedPostDto();
      if (query.isStream) fp.isStream = true;
      fp.site_user_id = String(site_user_id);
      fp.user_id = String(user_id);
      fp.pg = query.pg;

      const result = await this.getPostDataByLookup(user, profileUser, fp);
      result.posts = await this.postApi.fixPosts(result.posts, user);
      res.status(200).json(result);
    }
  }

  async getPostDataByLookup(user: UserEntity, profileUser, fp) {
    const result = await this.postApi.generateUserProfilePostFeed(
      fp,
      false,
      user,
    );
    const parsedPposts = await Promise.all(
      result.map(async (p: any) => {
        if (p['quoted_post'] && p['quoted_post']['user_id']) {
          if (p['quoted_post']['user_id'] === user.id) {
            p['quoted_post']['mine'] = true;
          }
        }
        if (p['gallery']) {
          p['gallery'] = JSON.stringify(
            JSON.parse(p['gallery'])?.map((i) => {
              if (i['src']) {
                if (i['src'].indexOf('http') > -1) {
                  return i;
                }

                if (i['src'].indexOf(process.env.IMAGES_URL) === -1) {
                  i['src'] = `${process.env.IMAGES_URL}${i['src']}`;
                  return i;
                }

                return i;
              } else {
                if (i.indexOf(process.env.IMAGES_URL) === -1) {
                  return `${process.env.IMAGES_URL}${i}`;
                } else {
                  return i;
                }
              }
            }),
          );
        }
        return p;
      }),
    );

    const profileData = {
      id: crypto
        .createHash('md5')
        .update(`USERID:${profileUser.id}`)
        .digest('hex'),
      username: profileUser.username,
      displayName: profileUser.displayName,
      email: profileUser.email,
      bio: profileUser.bio,
      created_at: profileUser.created_at,
      ava_src: profileUser.ava_src,
      followers_count: profileUser.followers_count,
      following_count: profileUser.following_count,
      profile_background_url: profileUser.profile_background_url,
      birthday: profileUser.birthday,
      isFollowed: profileUser['isFollowed'],
      isMuted: profileUser['isMuted'] ?? false,
      isBlocked: profileUser['isBlocked'] ?? false,
      isFollowingMe: profileUser['isFollowingMe'] ?? false,
    };

    return Promise.resolve({
      status: 200,
      posts: parsedPposts,
      profile: profileData,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('like/toggle')
  async toggleLike(
    @Body() body: PostLikeToggleRequestDto,
    @Req() req,
    @Res() res,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const existingLike = await this.postApi.likePost({
        status: '1',
        user_id: String(user.id),
        post_hash: body.post,
      });
      res
        .status(200)
        .json({ status: 200, message: existingLike['like_result'] });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('fetch')
  async fetchPost(@Query() query: PostFetchRequestDto, @Req() req, @Res() res) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      let postEntry = await this.postApi.postByHash(query.h);
      postEntry = await this.postApi.fixPosts(postEntry, user, true);
      res.status(200).json({ status: 200, message: postEntry });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('fetch/my/replies')
  async fetchReplies(
    @Query('pg') pg: number,
    @Query('u') username: string,
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
      let profileUser;
      if (username && username !== '') {
        profileUser = await this.userApi.getProfileByUsername(
          {
            username: username,
          },
          user.id.toString(),
          true,
        );
      } else {
        profileUser = user;
      }
      let replies = await this.postApi.fetchReplies(profileUser, pg);
      replies = await this.postApi.fixPosts(replies, user);

      res.status(200).json({ status: 200, message: replies });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('fetch/my/likes')
  async fetchLikes(
    @Query('pg') pg: number,
    @Query('h') h: string,
    @Query('u') username: string,
    @Req() req,
    @Res() res,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      let profileUser;
      if (h && h !== '') {
        profileUser = await this.userApi.getProfileByUserHash(
          {
            userHash: h,
          },
          false,
          user,
        );
        profileUser = await this.userApi.getUserRepo().findOne(profileUser.id);
      }

      if (username && username !== '') {
        profileUser = await this.userApi.getProfileByUsername(
          {
            username: username,
          },
          user.id.toString(),
          true,
        );
      }

      if (!pg) {
        pg = 1;
      }

      if (profileUser) {
        let likes = await this.postApi.fetchLikes(profileUser, pg);
        likes = await this.postApi.fixPosts(likes, user);
        res.status(200).json({ status: 200, message: likes });
      }
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('fetch/my/media')
  async fetchPostsWithMedia(
    @Query('pg') pg: number,
    @Query('h') h: string,
    @Query('u') username: string,
    @Req() req,
    @Res() res,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      let profileUser;

      profileUser = user;
      if (h && h !== '') {
        profileUser = await this.userApi.getProfileByUserHash(
          {
            userHash: h,
          },
          false,
          user,
        );
        profileUser = await this.userApi.getUserRepo().findOne(profileUser.id);
      }
      if (username && username !== '') {
        profileUser = await this.userApi.getProfileByUsername(
          {
            username: username,
          },
          user.id.toString(),
          true,
        );
      }

      if (!pg) {
        pg = 1;
      }
      let withMedia = await this.postApi.fetchPostsWithMedia(profileUser, pg);
      withMedia = await this.postApi.fixPosts(withMedia, user);

      res.status(200).json({ status: 200, message: withMedia });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('new')
  @UseInterceptors(AnyFilesInterceptor())
  async newPost(
    @UploadedFiles() files,
    @Body('content') postContent: string,
    @Body('parentPostHash') parentPostHash: string,
    @Body('privacy') privacy: number,
    //@Body('attachments') attachments: any,
    @Body('gif') gif: string,
    @Body('type') postType: string,
    @Body('gallery') gallery: string[],
    @Body('poll') pollConfig: any,
    @Body('attachments[]') attach: any,
    @Body('metaInfo') metaInfo: string,
    @Req() req,
    @Res() res,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      if (parentPostHash) {
        const canUserPost = await this.postApi.canPost(user, parentPostHash);
        if (canUserPost === false) {
          res
            .status(500)
            .json({ status: 500, message: 'Not allowed to post.' });
          return;
        }
      }
      if (pollConfig) {
        pollConfig = JSON.parse(pollConfig);
      }

      let newPost = await this.postApi.addPostv2(
        user,
        postContent,
        parentPostHash,
        privacy,
        files,
        gif,
        postType,
        gallery,
        null,
        pollConfig,
        null,
        attach,
        metaInfo,
      );
      // //TODO: handle mention links to users
      // const mentioned = await this.parseMentions(newPost);

      const newEvent = new NewPostEventDto();
      newEvent.content = postContent;
      newEvent.user = user;
      newEvent.event = 'post.new';
      newEvent.post = JSON.parse(JSON.stringify(newPost));

      this.eventEmitter.emit('post.new', newEvent);

      // const post = await this.postApi.loadById(newPost);
      newPost['id'] = newPost.getIdAsHash();
      newPost['user_id'] = user.getIdAsHash();

      newPost = await this.postApi.fixPosts(newPost, user, true);

      res.status(200).json({ status: 200, message: newPost });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put('update/:postHash')
  @UseInterceptors(AnyFilesInterceptor())
  async updatePost(
    @UploadedFiles() files,

    @Body('content') postContent: string,
    @Body('parentPostHash') parentPostHash: string,
    @Body('privacy') privacy: number,
    @Body('attachments') attachments: string[],
    @Body('gif') gif: string,
    @Body('type') postType: string,
    @Body('gallery') gallery: string[],
    @Body('poll') poll: string[],
    @Param('postHash') postHash: string,
    @Body('metaInfo') metaInfo: string,
    @Req() req,
    @Res() res,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      let newPost = await this.postApi.addPostv2(
        user,
        postContent,
        parentPostHash,
        privacy,
        files,
        gif,
        postType,
        gallery,
        postHash,
        poll,
        attachments,
        null,
        metaInfo,
      );
      // //TODO: handle mention links to users
      // const mentioned = await this.parseMentions(newPost);

      const newEvent = new NewPostEventDto();
      newEvent.content = postContent;
      newEvent.user = user;
      newEvent.event = 'post.update';
      newEvent.post = JSON.parse(JSON.stringify(newPost));

      this.eventEmitter.emit('post.new', newEvent);

      // const post = await this.postApi.loadById(newPost);
      newPost['id'] = newPost.getIdAsHash();
      newPost['user_id'] = user.getIdAsHash();
      newPost = await this.postApi.fixPosts(newPost, user, true);

      res.status(200).json({ status: 200, message: newPost });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('trends')
  async listHashtagsAll(
    @Query('pg') pg: number,
    @Body() query,
    @Req() req,
    @Res() res,
  ) {
    try {
      const user = await this.userApi
        .getUserRepo()
        .getUserBySessionId(req['user']['userId']);

      if (user) {
        //console.logJSON.stringify(query));
        const result = await this.postApi.listAllHashtags(pg);
        res.status(200).json({ status: 200, result });
      }
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({ status: 500 });
    }

    return;
  }

  @UseGuards(JwtAuthGuard)
  @Post('report')
  async addReport(@Body() body: AddReportV2Dto, @Res() res, @Req() req) {
    try {
      const user = await this.userApi
        .getUserRepo()
        .getUserBySessionId(req['user']['userId']);

      if (user) {
        const result: ReportEntity = await this.reportApi.newReport(user, body);
        res.status(200).send(result);
        return;
      }
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({ status: 500 });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('remove/:hash')
  async deletePost(@Param('hash') postHash: string, @Res() res, @Req() req) {
    try {
      const user = await this.userApi
        .getUserRepo()
        .getUserBySessionId(req['user']['userId']);

      if (user) {
        const post: any = await this.postApi.postByHash(postHash, false, true);
        const result = await this.postApi.deleteUserPost(
          post.id,
          user.id,
          post,
        );
        res.status(200).send({ status: 200, result, message: 'Post deleted' });
        return;
      }
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({ status: 500, message: 'Post not deleted' });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('image/add')
  @UseInterceptors(FileInterceptor('image'))
  async addImage(
    @UploadedFile() image: Express.Multer.File,
    @Res() res,
    @Req() req,
  ) {
    try {
      const user = await this.userApi
        .getUserRepo()
        .getUserBySessionId(req['user']['userId']);

      if (user) {
        const savedImage = await this.postApi.addImage(image, user);
        const { image_path, user_id, temp_hash } = savedImage;
        res.status(200).send({
          status: 200,
          image: {
            url: `${process.env.IMAGES_URL}${image_path}`,
            path: image_path,
            temp_hash,
          },
        });
        return;
      }
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({
        status: 500,
        message: 'Post not deleted',
        err: e,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('meta-links')
  async linkMetaLookup(@Query('url') url: string, @Res() res, @Req() req) {
    try {
      const user = await this.userApi
        .getUserRepo()
        .getUserBySessionId(req['user']['userId']);

      if (user && url.toLowerCase().indexOf('soma.cafe/u/') === -1) {
        const linkMeta: LinkMetaEntity = await this.postApi.extractLinkMeta(
          url,
        );
        res.status(200).send({
          status: 200,
          meta: linkMeta.meta,
        });
        return;
      }
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({
        status: 500,
        message: 'Meta not found',
        err: e,
      });
    }
  }

  @Get('copy/:id')
  async copyUrl(@Param('id') postHash: string, @Res() res, @Req() req) {
    try {
      const post = await this.postApi.getPublicPostByHash(postHash);

      res.status(200).send({
        status: 200,
        post,
      });
    } catch (e) {
      res.status(500).json({
        status: 500,
        message: 'Meta not found',
        err: e,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/who/liked')
  async usersWhoLiked(
    @Query('h') postHash: string,
    @Query('pg') pg: number,
    @Res() res,
    @Req() req,
  ) {
    try {
      const user = await this.userApi
        .getUserRepo()
        .getUserBySessionId(req['user']['userId']);

      if (user) {
        const userList = await this.postApi.usersWhoLiked(postHash, user, pg);
        res.status(200).send({
          status: 200,
          userList,
        });
        return;
      }
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({
        status: 500,
        message: 'Meta not found',
        err: e,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/who/shared')
  async usersWhoShared(
    @Query('h') postHash: string,
    @Query('pg') pg: number,
    @Res() res,
    @Req() req,
  ) {
    try {
      const user = await this.userApi
        .getUserRepo()
        .getUserBySessionId(req['user']['userId']);

      if (user) {
        const userList = await this.postApi.usersWhoShared(postHash, user, pg);
        res.status(200).send({
          status: 200,
          userList,
        });
        return;
      }
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({
        status: 500,
        message: 'Meta not found',
        err: e,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('list/quoted')
  async listQuoted(
    @Query('h') postHash: string,
    @Query('pg') pg: number,
    @Res() res,
    @Req() req,
  ) {
    try {
      const user = await this.userApi
        .getUserRepo()
        .getUserBySessionId(req['user']['userId']);

      if (user) {
        const postList = await this.postApi.listQuoted(postHash, user, pg);
        res.status(200).send({
          status: 200,
          postList,
        });
        return;
      }
    } catch (e) {
      res.status(500).json({
        status: 500,
        message: 'Meta not found',
        err: e,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('generate-origin-video-thumbnail')
  async generateOriginVideoThumbnail(
    @Body('src') videoSrc: any,
    @Req() req,
    @Res() res,
  ) {
    try {
      this.postGateway.sendThumbnailProgress(1);
      const thumbnails = await this.postApiServiceV2.createOriginThumbnails(
        videoSrc.src,
        (progress) => this.postGateway.sendThumbnailProgress(progress),
      );
      this.postGateway.sendThumbnailProgress(100);
      this.postGateway.sendThumbnailProgress(null);
      if (thumbnails && thumbnails.length > 0) {
        res.status(200).send({
          status: 200,
          message: 'Thumbnails created!',
          thumbnails,
        });
        return;
      }
      res.status(500).json({
        status: 500,
        message: 'Failed to generate thumbnails',
      });
    } catch (e) {
      console.log(e);
      res.status(500).json({
        status: 500,
        message: 'Failed to generate thumbnails',
        err: e,
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor())
  @Post('generate-video-thumbnail')
  async generateVideoThumbnail(@UploadedFiles() files, @Res() res, @Req() req) {
    try {
      this.postGateway.sendThumbnailProgress(1);

      const thumbnails = await this.postApiServiceV2.createThumbnails(
        files[0].buffer,
        (progress) => this.postGateway.sendThumbnailProgress(progress),
      );
      this.postGateway.sendThumbnailProgress(100);
      this.postGateway.sendThumbnailProgress(null);

      if (thumbnails && thumbnails.length > 0) {
        res.status(200).send({
          status: 200,
          message: 'Thumbnails created!',
          thumbnails,
        });
        return;
      }
      res.status(500).json({
        status: 500,
        message: 'Failed to generate thumbnails',
      });
    } catch (e) {
      console.log(e);
      res.status(500).json({
        status: 500,
        message: 'Failed to generate thumbnails',
        err: e,
      });
    }
  }
}
