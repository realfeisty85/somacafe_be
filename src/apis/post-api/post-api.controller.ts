import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { PostApiService } from './post-api.service';
import { NewPostDto } from '../../repositories/post-repo/dto/new.post.dto';
import { FeedPostDto } from '../../repositories/post-repo/dto/feed.post.dto';
import { LoggingInterceptor } from '../logging/logging.interceptor';
import { DeletePostDto } from '../../repositories/post-repo/dto/delete.post.dto';
import { EditPostDto } from '../../repositories/post-repo/dto/edit.post.dto';
import { LikePostDto } from '../../repositories/post-repo/dto/like.post.dto';
import {
  PostEntity,
  PostTypes,
} from '../../repositories/post-repo/entities/post.entity';
import { CommentPostDto } from '../../repositories/post-repo/dto/comment.post.dto';
import { CommentEntity } from '../../repositories/post-repo/entities/comment.entity';
import { CreatePollDto } from '../../repositories/post-repo/dto/create.poll.dto';
import { VotePostDto } from '../../repositories/post-repo/dto/vote.post.dto';
import { PollVoteEntity } from '../../repositories/post-repo/entities/poll.vote.entity';
import { PollEntity } from '../../repositories/post-repo/entities/poll.entity';

@UseInterceptors(LoggingInterceptor)
@Controller('post/v1')
export class PostApiController {
  constructor(private readonly postApi: PostApiService) {}

  @Get('fetch-page')
  async fetchPage(@Query() query, @Res() res) {
    const result: any = await this.postApi.fetchPage(query['url']);
    res.status(200).send(result);
  }

  @Post('add-post')
  async addPost(@Body() body: NewPostDto, @Req() req, @Res() res) {
    //console.log(body);

    const result = await this.postApi.addPost(body);

    // console.log(result);
    // console.log('** res');
    if (result && result.id > 0) {
      res.status(200).json({ result: 'success', post: result });
    } else {
      res.status(200).json({ result: 'Error' });
    }
    ////console.loglinkedToken);
  }

  @Post('posts-feed')
  async postFeed(@Body() body: FeedPostDto, @Req() req, @Res() res) {
    ////console.logbody);
    const result = await this.postApi.generateUserPostFeed(body);
    // console.log(result);
    if (result) {
      res.status(200).json({ status: 200, posts: result });
    } else {
      res.status(200).json({ result: 'Error' });
    }

    ////console.loglinkedToken);
  }

  @Post('posts-by-user')
  async postsByUser(@Body() body: FeedPostDto, @Req() req, @Res() res) {
    //console.logbody);
    const result = await this.postApi.generateUserPostFeed(body);

    //console.log(result);
    if (result) {
      res.status(200).json({ status: 200, posts: result });
    } else {
      res.status(200).json({ result: 'Error' });
    }
  }

  @Post('profile-by-user')
  async profileByUser(@Body() body: FeedPostDto, @Req() req, @Res() res) {
    //console.logbody);
    // const result = await this.postApi.generateUserProfilePostFeed(body);
    //console.log(result);
    // if (result) {
    //   res.status(200).json({ status: 200, posts: result });
    // } else {
    //   res.status(200).json({ result: 'Error' });
    // }
  }

  // @Post('delete')
  // async deletePost(@Body() body: DeletePostDto, @Req() req, @Res() res) {
  //   //console.logbody);
  //   const result = await this.postApi.deleteUserPost(body);
  //
  //   ////console.logresult);
  //   if (result) {
  //     res.status(200).json({ status: 200, result: result });
  //   } else {
  //     res.status(200).json({ result: 'Error' });
  //   }
  // }

  @Post('edit')
  async editPost(@Body() body: EditPostDto, @Req() req, @Res() res) {
    //console.logbody);
    const result = await this.postApi.editUserPost(body);

    ////console.logresult);
    if (result) {
      res.status(200).json({ status: 200, post: result });
    } else {
      res.status(200).json({ result: 'Error' });
    }
  }

  @Post('like-post')
  async likePost(@Body() body: LikePostDto, @Req() req, @Res() res) {
    const result = await this.postApi.likePost(body);

    //console.log'like result');
    //console.logresult);
    if (result) {
      res.status(200).json({ status: 200, post: result });
    } else {
      res.status(200).json({ result: 'Error' });
    }
  }

  @Post('post-by-hash')
  async postbyHash(@Body() body, @Req() req, @Res() res) {
    try {
      const post = await this.postApi.postByHash(body['post_hash'], true);
      const comments = await this.postApi.listCommentsForPost(post);
      const qty = await this.postApi.countCommentsForPost(post);
      //console.log'COMENTS******************');
      //console.logcomments);
      res
        .status(200)
        .json({ status: 200, post: post, comments: comments, qty: qty });
      return;
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
    }
    res.status(500).json({ status: 500 });
    return;
  }

  @Post('load-post-by-hash')
  async loadPostbyHash(@Body() body, @Req() req, @Res() res) {
    try {
      const post: PostEntity | PollEntity = await this.postApi.postByHash(
        body['post_hash'],
        true,
      );
      console.log(post);
      res.status(200).json({ status: 200, post: post });
      return;
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post');
    }
    res.status(500).json({ status: 500 });
    return;
  }

  @Post('post-comment')
  async postComment(@Body() body: CommentPostDto, @Req() req, @Res() res) {
    try {
      let comments;
      const post: PostEntity | PollEntity = await this.postApi.postByHash(
        body.post_hash,
        true,
      );

      let qty = 0;
      if (post && post.id > 0) {
        await this.postApi.commentOnPost(post, body.comment, body.site_user_id);
        comments = await this.postApi.listCommentsForPost(post);
        qty = await this.postApi.countCommentsForPost(post);
      }

      res
        .status(200)
        .json({ status: 200, post: post, comments: comments, qty: qty });
      return;
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
    }
    res.status(500).json({ status: 500 });
    return;
  }

  @Post('post-share')
  async postShare(@Body() body: CommentPostDto, @Req() req, @Res() res) {
    try {
      let comments;
      const post: PostEntity | PollEntity = await this.postApi.postByHash(
        body.post_hash,
        true,
      );

      if (post && post.id > 0) {
        const share = new NewPostDto();
        share.post_type = '1';
        share.user_id = body.site_user_id;
        share.text = body.comment;
        share.parent_post_id = post.id;
        const result = await this.postApi.addPost(share);
        if (result && result.id > 0) {
          await this.postApi.incrementShareCount(post);
          comments = await this.postApi.listCommentsForPost(post);
          res.status(200).json({ status: 200, post: post, comments: comments });
          return;
        }
      }
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
    }
    res.status(500).json({ status: 500 });
    return;
  }

  @Post('create-poll')
  async createPoll(@Body() body: CreatePollDto, @Req() req, @Res() res) {
    try {
      //console.logJSON.stringify(body));
      //console.logbody.poll.pollQuestion);
      const poll = await this.postApi.createPoll(body.site_user_id, body.poll);
      res.status(200).json({ status: 200, poll: poll });
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({ status: 500 });
    }

    return;
  }

  @Post('poll-vote')
  async pollVote(@Body() body: VotePostDto, @Req() req, @Res() res) {
    try {
      //console.logJSON.stringify(body));
      if (body.pollhash.split('-').length === 2) {
        const vote: PollVoteEntity = await this.postApi.voteOnPoll(
          body.site_user_id,
          body.pollhash.split('-')[0],
          body.option,
        );
        res.status(200).json({ status: 'success', vote });
      }
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({ status: 500 });
    }
    res.status(200).json({ status: 'failed' });
    return;
  }

  @Get('poll-stats')
  async pollStats(@Query() query, @Req() req, @Res() res) {
    try {
      console.log(JSON.stringify(query));
      const stats = await this.postApi.pollStats(
        query['pollhash'],
        query['user_hash'],
      );
      res.status(200).json({ status: 200, stats });
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({ status: 500 });
    }

    return;
  }

  @Get('poll-delete')
  async pollDelete(@Query() query, @Req() req, @Res() res) {
    try {
      //console.logJSON.stringify(query));
      const result = await this.postApi.deletePoll(query['pollhash']);
      res.status(200).json({ status: 200, result });
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({ status: 500 });
    }

    return;
  }

  @Post('htag-list')
  async listHashtags(@Body() query, @Req() req, @Res() res) {
    try {
      //console.logJSON.stringify(query));
      const result = await this.postApi.listHashtags(query['tag']);
      console.log(result);
      res.status(200).json({ status: 200, result });
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({ status: 500 });
    }

    return;
  }

  // @Post('htag-list-all')
  // async listHashtagsAll(@Body() query, @Req() req, @Res() res) {
  //   try {
  //     //console.logJSON.stringify(query));
  //     const result = await this.postApi.listAllHashtags();
  //     console.log(result);
  //     res.status(200).json({ status: 200, result });
  //   } catch (e) {
  //     //console.loge);
  //     //console.log'Error fetching post for commenting');
  //     res.status(500).json({ status: 500 });
  //   }
  //
  //   return;
  // }

  @Get('post-commenters')
  async getPostCommenters(@Req() req, @Res() res, @Query() query) {
    try {
      //console.logJSON.stringify(query));
      const result = await this.postApi.listPostCommenters(
        query['postHash'],
        query['site_user_id'],
      );
      console.log(result);
      res.status(200).json({ status: 200, result });
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({ status: 500 });
    }

    return;
  }

  @Get('post-sharers')
  async getPostSharers(@Req() req, @Res() res, @Query() query) {
    try {
      const result = await this.postApi.listPostSharers(
        query['postHash'],
        query['site_user_id'],
      );
      console.log(result);
      res.status(200).json({ status: 200, result });
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({ status: 500 });
    }

    return;
  }

  @Get('post-likers')
  async getPostLikers(@Req() req, @Res() res, @Query() query) {
    try {
      const result = await this.postApi.listPostLikers(
        query['postHash'],
        query['site_user_id'],
      );
      console.log('Liker List');
      console.log(result);
      res.status(200).json({ status: 200, result });
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      res.status(500).json({ status: 500 });
    }

    return;
  }

  // findUnfollowedPostCommenters
}
