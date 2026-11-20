import { Injectable } from '@nestjs/common';
import { NewPostDto } from '../../repositories/post-repo/dto/new.post.dto';
import { PostRepoService } from '../../repositories/post-repo/post-repo.service';
import {
  PostEntity,
  PostTypes,
} from '../../repositories/post-repo/entities/post.entity';
import { FeedPostDto } from '../../repositories/post-repo/dto/feed.post.dto';
import { DeletePostDto } from '../../repositories/post-repo/dto/delete.post.dto';
import { EditPostDto } from '../../repositories/post-repo/dto/edit.post.dto';
import { LikePostDto } from '../../repositories/post-repo/dto/like.post.dto';
import { CommentEntity } from '../../repositories/post-repo/entities/comment.entity';
import { PollEntity } from '../../repositories/post-repo/entities/poll.entity';
import { PollVoteEntity } from '../../repositories/post-repo/entities/poll.vote.entity';
import * as cheerio from 'cheerio';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';
import { OnEvent } from '@nestjs/event-emitter';
import { NewPostEventDto } from '../post-api-v2/dto/new.post.event.dto';
import { UserRepoService } from '../../repositories/user-repo/user-repo.service';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';
import { PostTempImageEntity } from '../../repositories/post-repo/entities/post.temp.image.entity';
import {
  CreatePollv2,
  PollQuestionv2,
} from '../../repositories/post-repo/dto/create.pollv2.dto';
import { PostRepoModule } from '../../repositories/post-repo/post-repo.module';

@Injectable()
export class PostApiService {
  constructor(
    private postRepo: PostRepoService,
    private userRepo: UserRepoService,
  ) {}

  async addPost(body: NewPostDto): Promise<PostEntity> {
    const result: PostEntity = await this.postRepo.submitPost(body);
    const extractedHashtags: string[] = this.postRepo.extractedHashtags(
      result.post,
    );

    if (extractedHashtags && extractedHashtags.length > 0) {
      this.postRepo.saveHashtags(extractedHashtags, result.user_id);
    }

    return Promise.resolve(result);
  }

  async addPostv2(
    user: UserEntity,
    postContent: string,
    parentPostHash: string,
    privacy: number,
    attachments: string[],
    gif: string,
    postType: string,
    gallery: string[],
    postToUpdate: string,
    pollConfig?: any,
    existingAttachments?: string[],
    attach?: string[],
    metaInfo?: string,
  ): Promise<PostEntity> {
    let result: PostEntity = await this.postRepo.submitPostv2(
      user,
      postContent,
      parentPostHash,
      privacy,
      attachments,
      gif,
      postType,
      gallery,
      postToUpdate,
      existingAttachments,
      attach,
      metaInfo,
    );

    if (pollConfig) {
      let newPoll: PollEntity;
      if (result.poll_id) {
        // not updating existing poll options
        //newPoll = await this.updatePollv2(user, pollConfig, result.poll_id);
      } else {
        newPoll = await this.createPollv2(user, pollConfig);
        result.poll_id = newPoll.id;
        await this.postRepo.setPollIdOnPost(result, newPoll.id);
      }
    }
    result = await this.postRepo.parsePoll(result, user);

    return Promise.resolve(result);
  }

  async createPollv2(
    user: UserEntity,
    pollConfig: PollQuestionv2,
  ): Promise<PollEntity> {
    const newPoll = await this.postRepo.createPollv2(
      '',
      user.id,
      pollConfig.expireAt,
    );

    if (newPoll && newPoll.id > 0) {
      pollConfig.options.map(async (e: string) => {
        const pq = await this.postRepo.addPollOption(newPoll, e);
      });

      return Promise.resolve(newPoll);
    }
    return Promise.resolve(null);
  }

  async updateLinkMeta(
    post: PostEntity,
    title?: string,
    privacy?: number,
    description?: string,
    attachment?: string,
  ): Promise<PostEntity> {
    const updatedPostData = this.postRepo.updateLinkMeta(
      post,
      title,
      privacy,
      description,
      attachment,
    );
    return updatedPostData;
  }

  async incrementShareCount(post: PostEntity | PollEntity): Promise<number> {
    const totalShares = await this.postRepo.incrementShareCount(post);
    return Promise.resolve(totalShares);
  }

  async generateUserPostFeed(body: FeedPostDto): Promise<any> {
    const feed = await this.postRepo.generatePostFeed(body);

    return Promise.resolve(feed);
  }

  async userPostFeedByType(
    user: UserEntity,
    postType: string,
    postHash: string,
    pg: number,
  ): Promise<PostEntity[]> {
    const feed = await this.postRepo.getPostFeedbyType(
      user,
      postType,
      postHash,
      pg,
    );
    return Promise.resolve(feed);
  }

  async generateUserPostFeedByUserHashOrId(
    query: FeedPostDto,
    userHash: string,
    userId: number,
  ): Promise<any> {
    const feed = await this.postRepo.generatePostFeedByUserHashOrId(
      query,
      query.pg,
      userHash,
      userId,
    );

    return Promise.resolve(feed);
  }

  async postFeedByUser(siteUser: UserEntity, pg: number): Promise<any> {
    if (!pg) {
      pg = 1;
    }
    const feed = await this.postRepo.postFeedByUser(siteUser, pg);

    return Promise.resolve(feed);
  }

  async generatePostFeedv3(
    user: UserEntity,
    pg: number,
    siteUser: UserEntity,
    postHash: string,
    postType: string,
  ): Promise<any> {
    const feed = await this.postRepo.generatePostFeedv3(
      user,
      pg,
      siteUser,
      postHash,
      postType,
    );
    if (feed && feed.length === 1 && postHash) {
      return Promise.resolve(feed.pop());
    }
    return Promise.resolve(feed);
  }

  async generateUserProfilePostFeed(
    body: FeedPostDto,
    includeReply = true,
    user: UserEntity,
  ) {
    const feed = await this.postRepo.generateProfilePostFeed(
      body,
      includeReply,
      user,
    );
    return feed;
  }

  async deleteUserPost(
    post_id: number | string,
    user_id: number,
    post: PostEntity,
  ): Promise<boolean> {
    if (post.post) {
      const reg = /\B(\#[a-zA-Z0-9_-]+)(?!;)/g;
      const found = post.post.match(reg);
      if (found) {
        await Promise.all(
          found.map(async (f: string) => {
            await this.postRepo.decrementHashtag(f.substring(1));
          }),
        );
      }
    }

    const res = await this.postRepo.deletePost(post_id, user_id);
    return Promise.resolve(res);
  }

  async editUserPost(body: EditPostDto): Promise<PostEntity> {
    const res: any = await this.postRepo.editPost(body);

    return Promise.resolve(res);
  }

  async updateStreamPost(
    content: string,
    post: PostEntity,
  ): Promise<PostEntity> {
    const res: PostEntity = await this.postRepo.updateStreamPost(content, post);
    return Promise.resolve(res);
  }

  async likePost(body: LikePostDto): Promise<PostEntity> {
    const res: PostEntity = await this.postRepo.addPostLike(
      body.user_id,
      body.post_hash,
    );

    return Promise.resolve(res);
  }

  async postByHash(
    hash,
    withUser?: boolean,
    raw?: boolean,
  ): Promise<PostEntity | PollEntity> {
    const p = hash.split('-');
    if (p.length === 2) {
      if (parseInt(p[1]) === 1) {
        return Promise.resolve(
          await this.postRepo.getPostByhash(p[0], withUser, raw),
        );
      }

      if (parseInt(p[1]) === 2) {
        return Promise.resolve(
          await this.postRepo.getPollFromHash(p[0], withUser),
        );
      }
    } else {
      return Promise.resolve(
        await this.postRepo.getPostByhash(hash, withUser, raw),
      );
    }
  }

  async commentOnPost(
    post: PostEntity | PollEntity,
    comment: string,
    site_user_id: string,
  ): Promise<CommentEntity> {
    return await this.postRepo.saveComment(
      post,
      comment,
      parseInt(site_user_id),
    );
  }

  async listCommentsForPost(
    post: PostEntity | PollEntity,
    page?: number,
    size?: number,
  ): Promise<any[]> {
    if (!size) {
      size = 5;
    }
    if (!page) {
      page = 1;
    }
    const comments = await this.postRepo.listComments(post, page, size);

    return comments;
  }

  async countCommentsForPost(post: PostEntity | PollEntity): Promise<number> {
    const count = await this.postRepo.countComments(post);
    return count;
  }

  async createPoll(
    userId: string,
    // poll: { pollQuestion: string; options: [{ id: string; val: string }] },
    poll,
  ): Promise<PollEntity> {
    const newPoll = await this.postRepo.createPoll(
      poll['question'],
      userId,
      poll['expires'],
    );

    if (newPoll && newPoll.id > 0) {
      Object.entries(poll.options).map(async (e: [string, string]) => {
        const pq = await this.postRepo.addPollOption(newPoll, e[1]);
      });
    }
    return Promise.resolve(null);
  }

  async voteOnPoll(
    site_user_id: string,
    pollhash: string,
    option: string,
  ): Promise<PollVoteEntity> {
    const voted: PollVoteEntity = await this.postRepo.voteOnPoll(
      site_user_id,
      pollhash,
      option,
    );

    return Promise.resolve(voted);
  }

  async voteOnPollv2(
    user: UserEntity,
    postId: string,
    voteId: number,
  ): Promise<PollVoteEntity> {
    const voted: PollVoteEntity = await this.postRepo.voteOnPollv2(
      user,
      postId,
      voteId,
    );

    return Promise.resolve(voted);
  }

  async pollStats(pollhash, userHash): Promise<any> {
    const stats = await this.postRepo.getPollStatsFromHash(
      pollhash.split('-')[0],
      userHash,
    );
    return Promise.resolve(stats);
  }

  async deletePoll(pollhash): Promise<boolean> {
    const result: boolean = await this.postRepo.pollDelete(pollhash);
    return result;
  }

  async listHashtags(tag) {
    const result: string[] = await this.postRepo.listHashtags(tag);
    return result;
  }

  async listAllHashtags(pg?: number) {
    const result: string[] = await this.postRepo.listAllHashtags(pg);
    return result;
  }

  async listAnyHashtags() {
    const result: string[] = await this.postRepo.listAnyHashtags();
    return result;
  }

  async listPostCommenters(postHash: string, userId): Promise<UserEntity[]> {
    const result: UserEntity[] = await this.postRepo.listPostCommenters(
      postHash,
      userId,
    );
    return result;
  }

  async findUnfollowedAllPostFollows(userId): Promise<UserEntity[]> {
    const result: UserEntity[] =
      await this.postRepo.findUnfollowedAllPostFollows(userId);
    return result;
  }

  async findUnfollowedUsers(userId, pg): Promise<UserEntity[]> {
    const result: UserEntity[] = await this.userRepo.findUnfollowedUsers(
      userId,
      pg,
    );
    return result;
  }

  async listPostSharers(postHash: string, userId): Promise<UserEntity[]> {
    const result: UserEntity[] = await this.postRepo.listPostSharers(
      postHash,
      userId,
    );
    return result;
  }

  async listPostLikers(postHash: string, userId): Promise<UserEntity[]> {
    const result: UserEntity[] = await this.postRepo.listPostLikers(
      postHash,
      userId,
    );
    return result;
  }

  async fetchPage(url): Promise<any> {
    try {
      const res: any = await this.postRepo.fetchPage(url);
      const html = cheerio.load(res);

      const page_meta = {
        website: html("meta[property='og:site_name']").attr('content'),
        mediaType: html("meta[property='og:type']").attr('content'),
        title: html("meta[property='og:title']").attr('content'),
        url: html("meta[property='og:url']").attr('content'),
        description: html("meta[property='og:description']").attr('content'),
        image: html("meta[property='og:image']").attr('content'),
      };

      return Promise.resolve(page_meta);
    } catch (e) {
      console.log(`Error fetching url: ${url}`);
    }
  }

  @OnEvent('post.new')
  async extractHashtags(payload: NewPostEventDto) {
    if (payload.content) {
      const reg = /\B(\#[a-zA-Z0-9_-]+)(?!;)/g;
      const found = payload.content.match(reg);
      if (found) {
        await this.postRepo.saveHashtags(found, payload.post.user_id);
      }
    }
  }

  @OnEvent('post.new')
  async trackPostShare(payload: NewPostEventDto) {
    if (payload) {
      if (payload?.post?.postType === 'share') {
        await this.postRepo.trackShared(
          payload.user,
          payload.post['quoted_post'],
        );
      }
      // busy wiuth replied notifications
      if (payload?.post?.postType === 'comment') {
        await this.postRepo.trackComment(payload.user, payload.post);
      }
      if (payload?.post?.postType === 'quote') {
        await this.postRepo.trackQuotes(payload.user, payload.post);
      }
    }
  }

  @OnEvent('post.new')
  async extractMentions(payload: NewPostEventDto) {
    // handle and process "OrderCreatedEvent" event
    try {
      if (payload.content) {
        const reg = /\B(\@[a-zA-Z0-9_-]+)(?!;)/g;
        const found = payload.content.match(reg);
        if (found) {
          const usernames = (
            await Promise.all(
              found.map(async (m) => {
                const userMentioned: UserEntity =
                  await this.userRepo.loadByUsername(m.substring(1));

                if (userMentioned && userMentioned.id > 0) {
                  return { username: m.substring(1), id: userMentioned.id };
                }
              }),
            )
          ).filter((u) => u !== undefined);

          await this.postRepo.setMentioned(payload, usernames);
        }
      }
    } catch (e) {
      console.log(e);
    }
  }

  async loadById(newPost: PostEntity): Promise<PostEntity> {
    const post: PostEntity = await this.postRepo.loadById(newPost.id);

    return Promise.resolve(post);
  }

  async fetchReplies(user: UserEntity, pg): Promise<any> {
    const post: PostEntity[] = await this.postRepo.fetchReplies(user, pg);

    return Promise.resolve(post);
  }

  async fetchLikes(user: UserEntity, pg) {
    const post: PostEntity[] = await this.postRepo.fetchLikes(user, pg);

    return Promise.resolve(post);
  }

  async fetchPostsWithMedia(user: UserEntity, pg) {
    const post: PostEntity[] = await this.postRepo.fetchPostsWithMedia(
      user,
      pg,
    );

    return Promise.resolve(post);
  }

  async addImage(
    image: Express.Multer.File,
    user: UserEntity,
  ): Promise<PostTempImageEntity> {
    fs.access('public/uploads/img', (err) => {
      if (err) {
        try {
          fs.mkdirSync('public/uploads/img');
        } catch (e) {}
      }
    });

    const newFile = uuid().toString();
    const baseDir = `public/uploads/img`.split('/');
    //
    newFile
      .substring(0, 4)
      .split('')
      .map((a) => {
        baseDir.push(a);
        try {
          fs.mkdirSync(baseDir.join('/'));
        } catch (e) {
          // console.log(e);
        }
      });

    const nf = `${baseDir.join('/')}/${newFile}`;

    const imageMime = [
      'png',
      'jpg',
      'jpeg',
      'gif',
      'svg',
      'mp4',
      'mkv',
      'avi',
      '3pg',
      '3gp',
      'mov',
    ];
    const imageTypes = ['png', 'jpg', 'jpeg', 'gif', 'svg'];
    const videoTypes = ['mp4', 'mkv', 'avi', '3pg', '3gp', 'mov'];

    const ftype = image.originalname.split('.').pop().toLowerCase();

    if (imageMime.indexOf(ftype) > -1) {
      const newImagename = `${nf}.${ftype}`;
      fs.writeFileSync(newImagename, image.buffer);

      const tempImage = new PostTempImageEntity();
      tempImage.image_path = newImagename.substring(6);
      tempImage.user_id = user.id;
      tempImage.temp_hash = uuid().toString();
      tempImage.isVideo = videoTypes.indexOf(ftype) > -1;

      const resSaved = await this.postRepo.saveTempImage(tempImage);
      return Promise.resolve(resSaved);
    }

    return Promise.resolve(null);
  }

  async extractLinkMeta(url: string): Promise<any> {
    const found = await this.postRepo.extractLinksMeta(url);
    return Promise.resolve(found);
  }

  private async updatePollv2(
    user: UserEntity,
    pollConfig: any,
    pollId: number,
  ) {
    console.log('Poll udpate');
    // const result: boolean = this.postRepo.updatePollv2(
    //   user,
    //   pollConfig,
    //   pollId,
    // );
    console.log(pollConfig);
    console.log(pollId);
    return undefined;
  }

  async fixPosts(
    result: any,
    user: UserEntity,
    isSinglePost = false,
  ): Promise<any> {
    return await this.postRepo.fixPosts(result, user, isSinglePost);
  }

  async getPublicPostByHash(postHash: string): Promise<any> {
    const post = await this.postRepo.getPublicPostByHash(postHash);

    return Promise.resolve(post);
  }

  async canPost(user: UserEntity, parentPostHash: string) {
    return await this.postRepo.canPost(user, parentPostHash);
  }

  async countNewPosts(user: UserEntity, since: number): Promise<number> {
    const count = await this.postRepo.countNewPosts(user, since);
    const found = count.pop();
    if (found) {
      return Promise.resolve(found?.cnt);
    }
    return Promise.resolve(0);
  }

  async usersWhoLiked(postHash: string, webUser: UserEntity, pg: number) {
    const found = await this.postRepo.usersWhoLiked(postHash, webUser, pg);

    if (found) {
      return Promise.resolve(found);
    }
    return Promise.resolve(null);
  }

  async usersWhoShared(postHash: string, webUser: UserEntity, pg: number) {
    const found = await this.postRepo.usersWhoShared(postHash, webUser, pg);

    if (found) {
      return Promise.resolve(found);
    }
    return Promise.resolve(null);
  }
  async listQuoted(postHash: string, webUser: UserEntity, pg: number) {
    const found = await this.postRepo.listQuoted(postHash, webUser, pg);

    if (found) {
      return Promise.resolve(found);
    }
    return Promise.resolve(null);
  }
}
