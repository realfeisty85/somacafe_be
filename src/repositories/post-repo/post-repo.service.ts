import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, getManager, Like, Not, In, ILike } from 'typeorm';
import { PostEntity } from './entities/post.entity';
import { NewPostDto } from './dto/new.post.dto';
import { FeedPostDto } from './dto/feed.post.dto';
import { UserRepoService } from '../user-repo/user-repo.service';
import { UserEntity } from '../user-repo/entities/user.entity';
import { MuteRepoService } from '../mute-repo/mute-repo.service';
import { EditPostDto } from './dto/edit.post.dto';
import { LikeEntity } from './entities/like.entity';
import { CommentEntity } from './entities/comment.entity';
import { PollEntity } from './entities/poll.entity';
import { PollOptionEntity } from './entities/poll.option.entity';
import { PollVoteEntity } from './entities/poll.vote.entity';
import { PostHashtagsEntity } from './entities/post.hashtags.entity';
import { lastValueFrom, map } from 'rxjs';
import * as cheerio from 'cheerio';
import * as crypto from 'crypto';
import { LinkMetaEntity } from './entities/link.meta.entity';
import { AxiosRequestConfig } from 'axios';
import { PostMentionsEntity } from './entities/post.mentions.entity';
import { FollowRepoService } from '../follow-repo/follow-repo.service';
import { FollowTypes } from '../types/follow.types';
import { NewPostEventDto } from '../../apis/post-api-v2/dto/new.post.event.dto';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';
import { NewNotificationEvent } from '../notifications-repo/dto/new.notification.event';
import { NotificationEnumTypes } from '../types/notification.enum.types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PostTempImageEntity } from './entities/post.temp.image.entity';
import * as moment from 'moment';
import { NotificationsApiService } from '../../apis/notifications-api/notifications-api.service';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mql = require('@microlink/mql');

const SEARCH_PAGE_SIZE = 20;

const postTypeLookup = {
  post: 1,
  reply: 2,
  quote: 3,
  share: 4,
  comment: 5,
  poll: 6,
  stream: 7,
};

@Injectable()
export class PostRepoService {
  constructor(
    @InjectRepository(PostEntity)
    private postRepository: Repository<PostEntity>,
    @InjectRepository(LikeEntity)
    private postLikesRepository: Repository<LikeEntity>,
    @InjectRepository(CommentEntity)
    private postCommentsRepository: Repository<CommentEntity>,
    @InjectRepository(PollEntity)
    private pollRepository: Repository<PollEntity>,
    @InjectRepository(PollOptionEntity)
    private pollQuestionRepository: Repository<PollOptionEntity>,
    @InjectRepository(PollVoteEntity)
    private pollVoteRepository: Repository<PollVoteEntity>,
    @InjectRepository(PostHashtagsEntity)
    private postHashtagsRepository: Repository<PostHashtagsEntity>,
    @InjectRepository(LinkMetaEntity)
    private linkMetaRepository: Repository<LinkMetaEntity>,
    @InjectRepository(PostMentionsEntity)
    private postMentionRepository: Repository<PostMentionsEntity>,
    @InjectRepository(PostTempImageEntity)
    private postTempImageRepository: Repository<PostTempImageEntity>,
    private userRepository: UserRepoService,
    private muteRepository: MuteRepoService,
    private followRepoService: FollowRepoService,
    private notifications: NotificationsApiService,
    private http: HttpService,
    private eventEmitter: EventEmitter2, // private notifications: NotificationsRepoService,
  ) {}

  async addPostMention(
    postId: number | string,
    mentionedUserId: number,
  ): Promise<PostMentionsEntity> {
    const newMention = new PostMentionsEntity();
    newMention.post_id = postId;
    newMention.mentioned_user_id = mentionedUserId;
    await this.postMentionRepository.save(newMention);

    return Promise.resolve(newMention);
  }

  findAll(): Promise<PostEntity[]> {
    return this.postRepository.find();
  }

  findOne(id: string): Promise<PostEntity> {
    return this.postRepository.findOne({ where: { id: id } });
  }

  async remove(id: string): Promise<void> {
    await this.postRepository.delete(id);
  }

  async submitPost(newPostDto: NewPostDto): Promise<PostEntity> {
    const newPost = new PostEntity();
    try {
      const extractedUrls = this.extractUrls(newPostDto.text);
      const linkMeta = await Promise.all(
        extractedUrls.map(async (url) => {
          const existingMeta: LinkMetaEntity =
            await this.linkMetaRepository.findOne({ where: { url } });
          if (
            existingMeta &&
            existingMeta.id > 0 &&
            existingMeta.meta !== null
          ) {
            return existingMeta.meta;
          }

          const meta = await this.urlMeta(url);
          const linkMeta: LinkMetaEntity = new LinkMetaEntity();
          linkMeta.url = url;
          meta['url'] = url;
          linkMeta.meta = JSON.stringify(meta);
          this.linkMetaRepository.save(linkMeta);

          return meta;
        }),
      );

      const user: UserEntity = await this.userRepository.findOne(
        newPostDto.user_id,
      );
      if (user && user.id > 0) {
        if (!newPostDto.privacy) {
          newPostDto.privacy = '1';
        }

        newPost.post = newPostDto.text;
        //TODO: Add validators or something to clean/check the data coming in
        newPost.gallery = newPostDto.gallery;
        newPost.mentions = JSON.stringify(newPostDto.mentions);
        newPost.privacy = parseInt(newPostDto.privacy, 10);
        newPost.postType = parseInt(newPostDto.post_type, 10);
        newPost.user_id = parseInt(newPostDto.user_id, 10);

        if (newPostDto.parent_post_id) {
          newPost.parent_post_id = newPostDto.parent_post_id;
        }
        newPost.links_meta = JSON.stringify(linkMeta);

        await this.postRepository.save(newPost);

        //TODO: handle mention links to users
        const mentioned = await this.parseMentions(newPost);

        newPost['user'] = user;
        newPost['postData'] = null;
        newPost['mentionedUsers'] = mentioned;
        return Promise.resolve(newPost);
      }
    } catch (e) {
      console.log(`Error saving post`);
      console.log(e);
    }
  }

  async submitPostv2(
    user: UserEntity,
    postContent: string,
    parentPostHash: string,
    privacy: number,
    attachments: string[],
    gif: string,
    postType: string,
    gallery: string[],
    postToUpdate: string,
    existingAttachments?: string[],
    attach?: string[],
    metaInfo?: string,
  ): Promise<PostEntity> {
    let newPost = new PostEntity();
    try {
      const extractedUrls = this.extractUrls(postContent);
      let linkMeta = await Promise.all(
        extractedUrls.map(async (url) => {
          const existingMeta: LinkMetaEntity =
            await this.linkMetaRepository.findOne({ where: { url } });
          if (
            existingMeta &&
            existingMeta.id > 0 &&
            existingMeta.meta !== null
          ) {
            return existingMeta.meta;
          }

          const meta = await this.urlMeta(url);
          if (meta) {
            const linkMeta: LinkMetaEntity = new LinkMetaEntity();
            linkMeta.url = url;
            meta['url'] = url;
            linkMeta.meta = JSON.stringify(meta);
            this.linkMetaRepository.save(linkMeta);
          }
          return meta;
        }),
      );
      linkMeta = linkMeta.filter((m) => m !== null);

      let attachmentsSaved = [];
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        attachmentsSaved = await this.parsePostImages(attachments);
      }
      if (metaInfo) {
        const newMetaInfo: any = {};
        const newMeta = JSON.parse(metaInfo);
        if (newMeta.title) newMetaInfo.title = newMeta.title;
        if (newMeta.description) newMetaInfo.description = newMeta.description;
        const metaAttach = attachmentsSaved.filter((attachment: any) => {
          if (attachment) {
            const { fieldname } = attachment;
            return fieldname === 'metaAttach';
          }
          return false;
        });
        if (metaAttach && metaAttach.length > 0) {
          const { type, src } = metaAttach[0];
          if (type) newMetaInfo.mediaType = type;
          if (src) newMetaInfo.image = `${process.env.IMAGES_URL}${src}`;
        }
        linkMeta.push(newMetaInfo);
      }
      attachmentsSaved = attachmentsSaved.filter((attachment) => {
        if (attachment) {
          const { fieldname } = attachment;
          return fieldname !== 'metaAttach';
        }
        return false;
      });
      if (existingAttachments) {
        existingAttachments = existingAttachments.map((e) => JSON.parse(e));
        attachmentsSaved = [...existingAttachments, ...attachmentsSaved];
      }

      const addToGallery = [];
      if (attach && Array.isArray(attach) && attach.length > 0) {
        attach.map((a: string) => {
          const { type, src } = JSON.parse(a);
          if (type && src) {
            if (type === 'image') {
              addToGallery.push({
                type,
                src,
              });
            }
          }
        });
      }

      if (user && user.id > 0) {
        if (!privacy) {
          privacy = 1;
        }
        newPost.post = postContent;
        //TODO: Add validators or something to clean/check the data coming in
        if (Array.isArray(attachmentsSaved)) {
          newPost.gallery = JSON.stringify(attachmentsSaved);
        }

        newPost.privacy = privacy;
        newPost.postType = postTypeLookup[postType];
        newPost.user_id = user.id;
        newPost.hash = uuid().toString();
        ///// Emit //////
        const eventEmit: NewNotificationEvent = new NewNotificationEvent();
        //
        if (parentPostHash) {
          const parentPost: PostEntity = await this.getPostByhash(
            parentPostHash,
            false,
            true,
          );
          if (parentPost) {
            newPost.parent_post_id = parentPost.id;
            eventEmit.user = parentPost.user_id;
            eventEmit.post = parentPost.id;
          }
        }
        newPost.links_meta =
          JSON.stringify(linkMeta) === '[null]'
            ? '[]'
            : JSON.stringify(linkMeta);
        newPost.gif = gif;
        //
        if (postToUpdate) {
          let pUpdate = await this.getPostByLongHash(postToUpdate, true, true);
          pUpdate = await this.postRepository.findOne({
            where: { id: pUpdate.id },
          });
          const originLinksMeta = JSON.parse(pUpdate.links_meta);
          newPost['links_meta'] = JSON.stringify([
            { ...originLinksMeta[0], ...linkMeta[0] },
          ]);
          const originGallery = JSON.parse(pUpdate.gallery);
          await this.postRepository
            .update(
              { id: pUpdate.id, postType: postTypeLookup[postType] },
              {
                privacy: newPost['privacy'],
                post: newPost['post'],
                gif: newPost['gif'],
                mentions: newPost['mentions'],
                links_meta: newPost['links_meta'],
                ...(originGallery[0]?.type.indexOf('image/') > 0
                  ? { gallery: newPost['gallery'] }
                  : {}),
              },
            )
            .then(async (res) => {
              const updatedPost = await this.postRepository.findOne({
                where: { id: pUpdate.id },
              });
              newPost = updatedPost;
            });
        } else {
          await this.postRepository.save(newPost);
        }
        //
        const postUser = await this.getUserForPostByUserId(
          newPost['user_id'],
          user,
        );

        if (postUser) {
          newPost['user'] = postUser;
        }
        //
        // eventEmit.fromUser = user.id;
        // if (eventEmit.user && eventEmit.user !== eventEmit.fromUser) {
        //   eventEmit.type = NotificationEnumTypes.REPLY;
        //   this.eventEmitter.emit('new.notification', eventEmit);
        // }

        ///// Emit //////

        if (gallery) {
          await Promise.all(
            gallery.map(async (g) => {
              await this.postTempImageRepository.update(
                {
                  user_id: user.id,
                  temp_hash: g,
                },
                { post_id: newPost.id },
              );
            }),
          );
        }
        if (newPost.gallery) {
          newPost.gallery = JSON.stringify(
            JSON.parse(newPost.gallery)?.map((i) => {
              if (i['src'].indexOf('http') > -1) {
                return i;
              }
              if (i['src'].indexOf(process.env.IMAGES_URL) === -1) {
                i['src'] = `${process.env.IMAGES_URL}${i['src']}`;
                return i;
              }

              return i;
            }),
          );

          newPost.gallery = JSON.stringify([
            ...JSON.parse(newPost.gallery),
            ...addToGallery,
          ]);
          await this.postRepository.save(newPost);
        }

        if (newPost.parent_post_id && Number(newPost.parent_post_id) > 0) {
          newPost['quoted_post'] = await this.postRepository.findOne({
            where: { id: newPost['parent_post_id'] },
          });
          if (newPost['quoted_post']) {
            // const quotePostuser: UserEntity = await this.userRepository.findOne(
            //   String(newPost['quoted_post']['user_id']),
            // );

            const postUser = await this.getUserForPostByUserId(
              newPost['quoted_post']['user_id'],
              user,
            );

            if (postUser) {
              newPost['quoted_post']['user'] = postUser;
            }

            newPost['quoted_post']['id'] = newPost['quoted_post']['hash'];
            delete newPost['quoted_post']['hash'];
          }
        }

        newPost = await this.parsePoll(newPost, user);

        return Promise.resolve(newPost);
      }
    } catch (e) {
      console.log(`Error saving post`);
      console.log(e);
    }
  }

  async updateLinkMeta(
    post: PostEntity,
    title?: string,
    privacy?: number,
    description?: string,
    attachment?: string,
  ): Promise<PostEntity> {
    const linksMeta = JSON.parse(post.links_meta);
    const savedAttachment: any = await this.parsePostImages([attachment]);
    const { type, src } = savedAttachment[0];
    const newLinkMeta = {
      ...linksMeta[0],
      title: title || linksMeta[0]?.title,
      description: description || linksMeta[0]?.description,
      mediaType: type,
      image: `${process.env.IMAGES_URL}${src}`,
    };
    // await this.postRepository.update(
    //   { id: post.id, postType: postTypeLookup[post.postType] },
    //   {
    //     privacy: privacy,
    //     links_meta: newLinkMeta,
    //   },
    // );
    const newPost = post;
    newPost.privacy = privacy || newPost.privacy;
    newPost.links_meta = JSON.stringify([newLinkMeta]);
    await this.postRepository.save(newPost);
    return Promise.resolve(newPost);
  }

  async updateStreamPost(
    updateContent: string,
    post: PostEntity,
  ): Promise<PostEntity> {
    const newPost = post;
    post.postType = 'post';
    post.post = updateContent;
    await this.postRepository.update(
      { hash: newPost.id.toString() },
      {
        post: updateContent,
        postType: 'post',
      },
    );
    // await this.postRepository.save(newPost);
    return Promise.resolve(newPost);
  }

  async parseMentions(post: PostEntity): Promise<number[]> {
    const mentions = JSON.parse(post.mentions);
    let usersMentioned = [];
    if (Array.isArray(mentions)) {
      await Promise.all(
        mentions.map(async (m) => {
          const lookfor = `@${m.username}`;
          if (post.post.indexOf(lookfor) > -1) {
            const user: UserEntity =
              await this.userRepository.findByDisplayName(m.username);
            if (usersMentioned.indexOf(user.id) === -1) {
              usersMentioned = [...usersMentioned, user.id];
              this.addPostMention(post.id, user.id);
            }
          }
        }),
      );
    }

    return Promise.resolve(usersMentioned);
  }

  async generatePostFeed(body: FeedPostDto): Promise<PostEntity[]> {
    const user: UserEntity = await this.userRepository.findOne(body.user_id);
    let posts: PostEntity[];
    try {
      if (user && user.id > 0) {
        posts = await this.postRepository.find({
          where: { user_id: user.id },
          order: { created_at: 'DESC' },
          take: 100,
        });
        const entityManager = getManager();
        posts = await entityManager.query(
          `select polls.id,
                  polls.user_id,
                  null                                                                                                                       parent_post_id,
                  'poll'                                                                                                                     postType,
                  'text'                                                                                                                     contentType,
                  polls.isActive                                                                                                             status,
                  polls.question                                                                                                             post,
                  null                                                                                                                       gallery,
                  null                                                                                                                       privacy,
                  polls.created_at,
                  polls.updated_at,
                  0                                                                                                                          count_likes,
                  0                                                                                                                          count_share,
                  ''                                                                                                                         links_meta,
                  if(now() > (polls.created_at + interval time_days day + interval time_minutes minute + interval time_hours hour), 1, 0) as expired,
                  null                                                                                                                       mentions
           from polls
           where polls.user_id = ?
             and polls.isActive = 1
           union
           select pp.id,
                  pp.user_id,
                  null                                                                                                                    parent_post_id,
                  'poll'                                                                                                                  postType,
                  'text'                                                                                                                  contentType,
                  pp.isActive                                                                                                             status,
                  pp.question                                                                                                             post,
                  null                                                                                                                    gallery,
                  null                                                                                                                    privacy,
                  pp.created_at,
                  pp.updated_at,
                  0                                                                                                                       count_likes,
                  0                                                                                                                       count_share,
                  ''                                                                                                                      links_meta,
                  if(now() > (pp.created_at + interval time_days day + interval time_minutes minute + interval time_hours hour), 1, 0) as expired,
                  null                                                                                                                    mentions
           from polls pp
                    inner join users_follow ufp on ufp.followed_user_id = pp.user_id
                    left join users_block ubp on ubp.blocked_user_id = pp.user_id
           where ufp.user_id = ?
             and pp.isActive = 1
             and (ubp.id is null or ubp.status = 0)
             and pp.user_id not in (select muted_user_id from users_mute where user_id = ?)
           union
           select posts.id,
                  posts.user_id,
                  posts.parent_post_id,
                  posts.postType,
                  posts.contentType,
                  posts.status,
                  posts.post,
                  posts.gallery,
                  posts.privacy,
                  posts.created_at,
                  posts.updated_at,
                  posts.count_likes,
                  posts.count_share,
                  posts.links_meta,
                  0 as expired,
                  posts.mentions
           from posts
           where posts.user_id = ?
           union
           select posts.id,
                  posts.user_id,
                  posts.parent_post_id,
                  posts.postType,
                  posts.contentType,
                  posts.status,
                  posts.post,
                  posts.gallery,
                  posts.privacy,
                  posts.created_at,
                  posts.updated_at,
                  posts.count_likes,
                  posts.count_share,
                  posts.links_meta,
                  0 as expired,
                  posts.mentions
           from posts
                    inner join users_follow uf on posts.user_id = uf.followed_user_id
                    left join users_mute um on posts.user_id = um.muted_user_id
                    left join users_block ubp on ubp.blocked_user_id = posts.user_id
           where uf.user_id = ?
             and (um.status != 1 or um.id is null)
             and (ubp.id is null or ubp.status = 0)
           order by created_at DESC limit 100`,
          [user.id, user.id, user.id, user.id, user.id],
        );

        if (posts) {
          const entityManager = getManager();
          const parsedPposts = await Promise.all(
            posts.map(async (p: any) => {
              p['postData'] = null;
              p['user'] = await this.userRepository.findOne(p.user_id);
              if (p['parent_post_id'] && parseInt(p['parent_post_id']) > 0) {
                p['quoted_post'] = await this.postRepository.findOne({
                  where: { id: p['parent_post_id'] },
                });
                if (p['quoted_post']) {
                  p['quoted_post']['user'] = await this.userRepository.findOne(
                    p['quoted_post']['user_id'],
                  );
                }
              }

              if (p['postType'] === 'poll') {
                const thisPoll: PollEntity = await this.pollRepository.findOne({
                  where: { id: p['id'] },
                });
                if (thisPoll && thisPoll.id > 0) {
                  const questions = await entityManager.query(
                    'select ' +
                      ' id, ' +
                      ' option_text, ' +
                      ' (select count(1) from polls_votes where poll_id = ? )votes ,' +
                      ' (select count(1) from polls_votes where poll_id = ? and vote_id = polls_option.id) cnt ' +
                      ' from polls_option where poll_id = ? order by id',
                    [thisPoll.id, thisPoll.id, thisPoll.id],
                  );
                  const stats = await this.getPollStats(
                    thisPoll,
                    null,
                    user.id,
                  );
                  p['postData'] = { questions, stats };
                }
              }

              const comments = await this.listComments(p, 1, 5);
              p['postData'] = { ...p['postData'], comments };

              p['post'] = this.parsePost(p);

              return p;
            }),
          );

          return Promise.resolve(parsedPposts);
        }
        return Promise.resolve([]);
      }
    } catch (e) {
      console.log(e);
    }
  }

  async postFeedByUser(siteUser: UserEntity, pg: number) {
    const entityManager = getManager();
    const posts = await entityManager.query(
      `select posts.id, posts.created_at
       from posts
       where posts.user_id = ?
         and posts.postType in (1, 2, 4, 5)
       union
       select posts.id, posts.created_at
       from posts
                inner join users_follow uf on posts.user_id = uf.followed_user_id
                left join users_mute um on posts.user_id = um.muted_user_id
                left join users_block ubp on ubp.blocked_user_id = posts.user_id
       where uf.user_id = ?
         and posts.postType in (1, 2, 4, 5)
         and (um.status != 1 or um.id is null)
         and (ubp.id is null or ubp.status = 0)
       order by created_at DESC limit ?,?`,
      [siteUser.id, siteUser.id, (pg - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE],
    );

    const pids = posts.map((p) => {
      return p.id;
    });

    //const parsed = await this.explodePostIds(pids, siteUser);
  }

  async explodePostIds(
    postIds: number[],
    siteUser: UserEntity,
  ): Promise<PostEntity[]> {
    const posts: PostEntity[] = await this.postRepository.find({
      select: [
        'id',
        'user_id',
        'parent_post_id',
        'postType',
        'status',
        'privacy',
        'post',
        'gallery',
        'gif',
        'mentions',
        'hash',
        'created_at',
      ],
      where: { id: In(postIds) },
    });

    // lookup user
    // calc stats
    // calc permissions
    // lookup parent_post_id

    // update hash to id
    const pp = await Promise.all(
      posts.map(async (p: PostEntity) => {
        return await this.cleanPost(p, siteUser);
      }),
    );
    return Promise.resolve(posts);
  }

  async cleanPost(post: PostEntity, siteUser: UserEntity) {
    post['id'] = post['hash'];
    delete post['hash'];
    return post;
  }

  async generatePostFeedByUserHashOrId(
    query: FeedPostDto,
    pg: number,
    userHash?: string,
    userId?: number,
  ): Promise<PostEntity[]> {
    let user: UserEntity;
    if (!pg) {
      pg = 1;
    }
    if (userHash) {
      user = await this.userRepository.findUserByhash(userHash, 'USERID:');
    }

    if (userId) {
      user = await this.userRepository.findOne(String(userId));
    }

    let posts: PostEntity[];

    try {
      if (user && user.id > 0) {
        // posts = await this.postRepository.find({
        //   where: { user_id: user.id },
        //   order: { created_at: 'DESC' },
        //   take: 100,
        // });
        const entityManager = getManager();
        if (query['h'] && query['h'] !== '') {
          let pPost: PostEntity = await this.getPostByhash(
            query['h'],
            true,
            false,
          );
          if (!pPost) {
            return Promise.resolve([pPost]);
          }

          pPost = await this.parsePoll(
            pPost,
            await this.userRepository.findOne(String(userId)),
          );

          pPost = await this.parsePostStats(pPost, null);
          if (pPost['user']['id'] == user.id) {
            pPost['mine'] = true;
          }
          if (
            pPost['quoted_post'] &&
            pPost['quoted_post']['user']['id'] == user.id
          ) {
            // pPost['quoted_post'] = await this.parsePostStats(
            //   pPost['quoted_post'],
            //   null,
            // );

            pPost['quoted_post']['mine'] = true;
            pPost['quoted_post'] = await this.parsePostEntry(
              pPost['quoted_post'],
              await this.userRepository.findOne(userId.toString()),
            );
            pPost['parent_post_id'] = pPost['quoted_post']['id'];
          }

          pPost['user'] = await this.userRepository.addUserMeta(
            pPost['user'],
            user.id.toString(),
            pPost['user']['id'],
          );

          // const isMutedEntry = await this.userRepository.isUserMuted(
          //   user.id.toString(),
          //   pPost['user']['id'],
          // );
          //
          // if (
          //   isMutedEntry &&
          //   isMutedEntry.id > 0 &&
          //   isMutedEntry.status === 1
          // ) {
          //   // return Promise.resolve(null);
          //   pPost['user']['isMuted'] = true;
          // } else {
          //   pPost['user']['isMuted'] = false;
          // }
          // const isBlockedEntry = await this.userRepository.isUserBlocked(
          //   user.id.toString(),
          //   pPost['user']['id'],
          // );
          // if (
          //   isBlockedEntry &&
          //   isBlockedEntry.id > 0 &&
          //   isBlockedEntry.status === 1
          // ) {
          //   pPost['user']['isBlocked'] = true;
          // } else {
          //   pPost['user']['isBlocked'] = false;
          // }

          pPost['user'] = await this.cleanUserObj(pPost['user'], user.id);
          pPost = await this.parsePostEntry(
            pPost,
            await this.userRepository.findOne(userId.toString()),
          );
          return Promise.resolve([pPost]);
        } else {
          posts = await entityManager.query(
            `
                select posts.id,
                       posts.user_id,
                       posts.parent_post_id,
                       posts.postType,
                       posts.contentType,
                       posts.status,
                       posts.post,
                       posts.gallery,
                       posts.privacy,
                       posts.created_at,
                       posts.updated_at,
                       posts.count_likes,
                       posts.count_share,
                       posts.links_meta,
                       0 as expired,
                       posts.mentions,
                       posts.gif,
                       posts.hash,
                       posts.poll_id
                from posts
                where posts.user_id = ?
                  and posts.postType in (1, 3, 2, 4, 6, 7)
                union
                select posts.id,
                       posts.user_id,
                       posts.parent_post_id,
                       posts.postType,
                       posts.contentType,
                       posts.status,
                       posts.post,
                       posts.gallery,
                       posts.privacy,
                       posts.created_at,
                       posts.updated_at,
                       posts.count_likes,
                       posts.count_share,
                       posts.links_meta,
                       0 as expired,
                       posts.mentions,
                       posts.gif,
                       posts.hash,
                       posts.poll_id
                from posts
                         inner join users_follow uf on posts.user_id = uf.followed_user_id
                         left join users_mute um on posts.user_id = um.user_id and um.muted_user_id = 1
                         left join users_block ubp on ubp.blocked_user_id = posts.user_id
                where uf.user_id = ?
                  and posts.postType in (1, 3, 2, 4, 6, 7)
                  and (um.status != 1 or um.id is null)
                  and (ubp.id is null or ubp.status = 0)
                order by created_at DESC limit ?,?`,
            [user.id, user.id, (pg - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE],
          );
        }

        if (posts) {
          const entityManager = getManager();
          const parsedPposts = await Promise.all(
            posts.map(async (p: any) => {
              p['postData'] = null;
              if (p['user_id'] === user.id) {
                p['mine'] = true;
              }
              p['user'] = await this.userRepository.findOne(p.user_id);

              // p = await this.parsePostStats(p, null);
              p = await this.parsePoll(
                p,
                await this.userRepository.findOne(String(userId)),
              );

              p = await Promise.resolve(this.parsePostStats(p, user));

              p['user'] = await this.userRepository.addUserMeta(
                p['user'],
                user.id.toString(),
                p['user']['id'],
              );

              // const isMutedEntry = await this.userRepository.isUserMuted(
              //   user.id.toString(),
              //   p['user']['id'],
              // );
              //
              // if (
              //   isMutedEntry &&
              //   isMutedEntry.id > 0 &&
              //   isMutedEntry.status === 1
              // ) {
              //   // return Promise.resolve(null);
              //   p['user']['isMuted'] = true;
              // } else {
              //   p['user']['isMuted'] = false;
              // }
              // const isBlockedEntry = await this.userRepository.isUserBlocked(
              //   user.id.toString(),
              //   p['user']['id'],
              // );
              // if (
              //   isBlockedEntry &&
              //   isBlockedEntry.id > 0 &&
              //   isBlockedEntry.status === 1
              // ) {
              //   p['user']['isBlocked'] = true;
              // } else {
              //   p['user']['isBlocked'] = false;
              // }

              p['user'] = await this.cleanUserObj(p['user'], user.id);

              if (p['parent_post_id'] && parseInt(p['parent_post_id']) > 0) {
                p['quoted_post'] = await this.postRepository.findOne({
                  where: { id: p['parent_post_id'] },
                });
                if (p['quoted_post']) {
                  p['quoted_post'] = await this.parsePoll(
                    p['quoted_post'],
                    user,
                  );

                  p['quoted_post'] = await this.parsePostStats(
                    p['quoted_post'],
                    null,
                  );
                  p['quoted_post']['user'] = await this.userRepository.findOne(
                    p['quoted_post']['user_id'],
                  );
                  if (p['quoted_post']['user_id'] === user.id) {
                    p['quoted_post']['mine'] = true;
                  }
                  if (p['quoted_post']['parent_post_id']) {
                    const quotedPost = await this.getParentPostById(
                      p['quoted_post']['parent_post_id'],
                      user,
                    );
                    if (quotedPost) {
                      p['quoted_post']['parent_post_id'] = quotedPost['hash'];
                    } else {
                      p['quoted_post']['parent_post_id'] = null;
                    }
                  }

                  p['quoted_post']['user'] =
                    await this.userRepository.addUserMeta(
                      p['quoted_post']['user'],
                      user.id.toString(),
                      p['quoted_post']['user']['id'],
                    );

                  // const isMutedEntry = await this.userRepository.isUserMuted(
                  //   user.id.toString(),
                  //   p['quoted_post']['user']['id'],
                  // );
                  //
                  // if (
                  //   isMutedEntry &&
                  //   isMutedEntry.id > 0 &&
                  //   isMutedEntry.status === 1
                  // ) {
                  //   // return Promise.resolve(null);
                  //   p['quoted_post']['user']['isMuted'] = true;
                  // } else {
                  //   p['quoted_post']['user']['isMuted'] = false;
                  // }

                  if (p['quoted_post']['user']['id'] === user.id) {
                    p['quoted_post']['mine'] = true;
                  }

                  p['quoted_post']['user'] = await this.cleanUserObj(
                    p['quoted_post']['user'],
                    user.id,
                  );
                  // const isBlockedEntry =
                  //   await this.userRepository.isUserBlocked(
                  //     user.id.toString(),
                  //     p['quoted_post']['user']['id'],
                  //   );
                  // if (
                  //   isBlockedEntry &&
                  //   isBlockedEntry.id > 0 &&
                  //   isBlockedEntry.status === 1
                  // ) {
                  //   p['quoted_post']['user']['isBlocked'] = true;
                  // } else {
                  //   p['quoted_post']['user']['isBlocked'] = false;
                  // }

                  p['quoted_post']['id'] = `${crypto
                    .createHash('md5')
                    .update(`POSTID:${p['quoted_post']['id']}`)
                    .digest('hex')}-${
                    p['quoted_post']['postType'] === 'poll' ? 2 : 1
                  }`;

                  p['quoted_post']['id'] = p['quoted_post']['hash'];
                  delete p['quoted_post']['hash'];
                  p['parent_post_id'] = p['quoted_post']['id'];

                  p['quoted_post']['user_id'] = p['quoted_post']['user']['id'];
                }
              }

              // if (p['postType'] === 'poll') {
              //   const thisPoll: PollEntity = await this.pollRepository.findOne({
              //     where: { id: p['id'] },
              //   });
              //   if (thisPoll && thisPoll.id > 0) {
              //     const questions = await entityManager.query(
              //       'select ' +
              //         ' id, ' +
              //         ' option_text, ' +
              //         ' (select count(1) from polls_votes where poll_id = ? )votes ,' +
              //         ' (select count(1) from polls_votes where poll_id = ? and vote_id = polls_option.id) cnt ' +
              //         ' from polls_option where poll_id = ? order by id',
              //       [thisPoll.id, thisPoll.id, thisPoll.id],
              //     );
              //     const stats = await this.getPollStats(
              //       thisPoll,
              //       null,
              //       user.id,
              //     );
              //     p['postData'] = { questions, stats };
              //   }
              // }

              p['post'] = this.parsePost(p);

              p['user_id'] = p['user']['id'];
              p['id'] = p['hash'];
              delete p['hash'];
              // p['gallery'] = JSON.stringify(
              //   JSON.parse(p['gallery'])?.map(
              //     (i) => `${process.env.IMAGES_URL}${i}`,
              //   ),
              // );

              return p;
            }),
          );

          return Promise.resolve(parsedPposts);
        }
        return Promise.resolve([]);
      }
    } catch (e) {
      console.log(e);
    }
  }

  parsePost(post: any) {
    let text: string = post['post'];
    if (post['mentions']) {
      JSON.parse(post['mentions']).map((e) => {
        text = text.replace(
          `@${e['username']}`,
          `<div class='post-mention'>@${e['username']}</div>`,
        );
      });
    }

    // if (text) {
    //   const found = text.matchAll(/(#)\w+/g);
    //
    //   if (found) {
    //     const tags = [...found];
    //     if (Array.isArray(tags) && tags.length > 0) {
    //       tags.map((lst) => {
    //         text = text.replace(
    //           lst[0],
    //           `<div class='post-mention'>${lst[0]}</div>`,
    //         );
    //       });
    //     }
    //   }
    //
    //   post['post'] = text;
    // }

    return post['post'];
  }

  async generateProfilePostFeed(
    body: FeedPostDto,
    includeReply = true,
    siteUser: UserEntity,
  ): Promise<PostEntity[]> {
    const user: UserEntity = await this.userRepository.findOne(body.user_id);
    let posts: PostEntity[];
    if (user && user.id > 0) {
      // posts = await this.postRepository.find({
      //   where: { user_id: user.id },
      //   order: { created_at: 'DESC' },
      //   take: 100,
      // });
      if (!body.pg) {
        body.pg = 1;
      }
      let postTypesList = '1,2,4,5,6,7';
      if (!includeReply) {
        postTypesList = '1,3,4,6,7';
      }

      const entityManager = getManager();
      if (body.isStream === true) {
        posts = await entityManager.query(
          `
              select posts.id,
                     posts.user_id,
                     posts.parent_post_id,
                     posts.postType,
                     posts.contentType,
                     posts.status,
                     posts.post,
                     posts.gallery,
                     posts.privacy,
                     posts.created_at,
                     posts.updated_at,
                     posts.count_likes,
                     posts.count_share,
                     posts.links_meta,
                     posts.gif,
                     posts.hash,
                     posts.poll_id
              from posts
              where posts.user_id = ?
                and posts.links_meta LIKE '%somastream%'
                and posts.postType in (${postTypesList})
              order by created_at DESC limit ?,?`,
          [user.id, (body.pg - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE],
        );
      } else {
        posts = await entityManager.query(
          `
              select posts.id,
                     posts.user_id,
                     posts.parent_post_id,
                     posts.postType,
                     posts.contentType,
                     posts.status,
                     posts.post,
                     posts.gallery,
                     posts.privacy,
                     posts.created_at,
                     posts.updated_at,
                     posts.count_likes,
                     posts.count_share,
                     posts.links_meta,
                     posts.gif,
                     posts.hash,
                     posts.poll_id
              from posts
              where posts.user_id = ?
                and posts.postType in (${postTypesList})
              order by created_at DESC limit ?,?`,
          [user.id, (body.pg - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE],
        );
      }

      if (posts) {
        const entityManager = getManager();
        const parsedPposts = Promise.all(
          posts.map(async (p: any) => {
            p = await this.parsePoll(p, siteUser);
            p = await this.parsePostStats(p, null);
            p['postData'] = null;

            p['user'] = await this.userRepository.findOne(p.user_id);

            p['user'] = await this.userRepository.addUserMeta(
              p['user'],
              user.id.toString(),
              p['user']['id'],
            );

            // const isMutedEntry = await this.userRepository.isUserMuted(
            //   user.id.toString(),
            //   p['user']['id'],
            // );
            //
            // if (
            //   isMutedEntry &&
            //   isMutedEntry.id > 0 &&
            //   isMutedEntry.status === 1
            // ) {
            //   // return Promise.resolve(null);
            //   p['user']['isMuted'] = true;
            // } else {
            //   p['user']['isMuted'] = false;
            // }
            //
            // const isBlockedEntry = await this.userRepository.isUserBlocked(
            //   user.id.toString(),
            //   p['user']['id'],
            // );
            // if (
            //   isBlockedEntry &&
            //   isBlockedEntry.id > 0 &&
            //   isBlockedEntry.status === 1
            // ) {
            //   p['user']['isBlocked'] = true;
            // } else {
            //   p['user']['isBlocked'] = false;
            // }

            if (p['user']['id'].toString() === body.site_user_id.toString()) {
              p['mine'] = true;
            } else {
              p['mine'] = false;
            }

            p['user'] = await this.cleanUserObj(p['user'], user.id);

            // delete p['user']['password'];
            // delete p['user']['reset_token'];
            // delete p['user']['reset_token_expires_at'];

            if (p['parent_post_id'] && parseInt(p['parent_post_id']) > 0) {
              p['quoted_post'] = await this.postRepository.findOne({
                where: { id: p['parent_post_id'] },
              });

              if (p['quoted_post']) {
                p['quoted_post'] = await this.parsePoll(p['quoted_post'], user);

                p['quoted_post'] = await this.parsePostStats(
                  p['quoted_post'],
                  user,
                );

                if (p['quoted_post']['user_id'] === body.site_user_id) {
                  p['quoted_post']['mine'] = true;
                }

                p['quoted_post']['user'] = await this.cleanUserObj(
                  await this.userRepository.findOne(
                    p['quoted_post']['user_id'],
                  ),
                  user.id,
                );

                p['quoted_post'] = await this.cleanPostObj(
                  p['quoted_post'],
                  parseInt(body.site_user_id),
                );
              }
            }

            const mentionedUsers = await this.getPostMentionedUserIds(p.id);
            p['mentionedUsers'] = mentionedUsers.map((u) => u['userhash']);

            // TODO: is post viewer on poster follow list
            p['user']['isFollowed'] = await this.followRepoService.isFollowing({
              type: FollowTypes.TYPE_FOLLOW.toString(),
              user_id: p.user_id,
              followed_user_id: body.site_user_id,
            });

            if (p['postType'] === 'poll') {
              const thisPoll: PollEntity = await this.pollRepository.findOne({
                where: { id: p['id'] },
              });
              if (thisPoll && thisPoll.id > 0) {
                const questions = await entityManager.query(
                  'select ' +
                    ' id, ' +
                    ' option_text, ' +
                    ' (select count(1) from polls_votes where poll_id = ? )votes ,' +
                    ' (select count(1) from polls_votes where poll_id = ? and vote_id = polls_option.id) cnt ' +
                    ' from polls_option where poll_id = ? order by id',
                  [thisPoll.id, thisPoll.id, thisPoll.id],
                );
              }
            }

            p = await this.cleanPostObj(p, parseInt(body.site_user_id));

            return p;
          }),
        );
        return parsedPposts;
      }
      return Promise.resolve([]);
    }
  }

  async getPostMentionedUserIds(postId: number): Promise<string[]> {
    const entityManager = getManager();
    const users = await entityManager.query(
      "select md5(concat('USERID:', mentioned_user_id)) userhash from posts_mentions where post_id = ?",
      [postId],
    );

    return users;
  }

  async deletePost(
    post_id: number | string,
    user_id: number,
  ): Promise<boolean> {
    const existingPost = await this.postRepository.findOne({
      where: { id: post_id, user_id: user_id },
    });
    if (existingPost) {
      const linksMeta = JSON.parse(existingPost.links_meta);
      if (linksMeta[0]?.url) {
        const globalStreamStartUrl =
          'https://somastream.cafe/WebRTCAppEE/play.html?name=';
        if (linksMeta[0].url.indexOf(globalStreamStartUrl) !== -1) {
          const streamId = new String(linksMeta[0].url).replace(
            globalStreamStartUrl,
            '',
          );
          const apiUrl = `rest/v2/vods/list/0/1?streamId=${streamId}`;
          const urlToFetch = `${process.env.STREAM_API_URL}/${apiUrl}`;
          try {
            const res = await this.http.get(urlToFetch);
            const content: any = await lastValueFrom(res);
            if (content.data.length > 0) {
              const streamInfo = content.data[0];
              if (streamInfo.vodId !== '' && streamInfo.vodId !== null) {
                const deleteRequestUrl = `rest/v2/vods/${streamInfo.vodId}`;
                const deleteRes = await this.http.delete(
                  `${process.env.STREAM_API_URL}/${deleteRequestUrl}`,
                );
                await lastValueFrom(deleteRes); // Wait for deletion to complete
                console.log('Success deleting video from server');
              }
            }
          } catch (error) {
            return Promise.reject('Error deleting video from Ant Media server');
          }
        }
      }
      await this.postRepository.delete(existingPost.id);
      await this.postRepository.delete({ parent_post_id: existingPost.id });
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  async getPostByLongHash(
    hash,
    withUser: boolean,
    raw?: boolean,
  ): Promise<PostEntity | PollEntity> {
    const p = hash.split('-');
    if (p.length > 2) {
      return Promise.resolve(await this.getPostByhash(hash, withUser, raw));
    } else {
      if (parseInt(p[1]) === 1) {
        return Promise.resolve(await this.getPostByhash(p[0], withUser, raw));
      }

      if (parseInt(p[1]) === 2) {
        return Promise.resolve(await this.getPollFromHash(p[0], withUser));
      }
    }
  }

  async getPostByhash(
    postHash: string,
    withUser?: boolean,
    raw?: boolean,
  ): Promise<PostEntity> {
    const entityManager = getManager();
    const posts = await entityManager.query(
      ' select posts.* ' +
        ' from posts ' +
        ' where md5(concat("POSTID:",posts.id)) = ? or hash = ? limit 1',
      [postHash, postHash],
    );

    if (posts.length === 1) {
      let thisPost: PostEntity = posts.pop();
      if (withUser) {
        //console.log('thisPost.user_id : ', thisPost.user_id);
        const postUser = await this.userRepository.findOne(
          thisPost.user_id.toString(),
        );
        thisPost['user'] = postUser;
        if (
          Number(thisPost['parent_post_id']) &&
          Number(thisPost['parent_post_id']) > 0
        ) {
          thisPost['quoted_post'] = await this.postRepository.findOne({
            where: { id: thisPost['parent_post_id'] },
          });
          if (thisPost['quoted_post']) {
            thisPost['quoted_post']['user'] = await this.userRepository.findOne(
              thisPost['quoted_post']['user_id'],
            );

            thisPost['quoted_post'] = await this.parsePostStats(
              thisPost['quoted_post'],
              null,
            );
          }
        }
        thisPost['postData'] = '';
      }

      thisPost = await this.parsePostStats(thisPost, null);

      if (!raw) {
        thisPost['id'] = thisPost['hash'];
        delete thisPost['hash'];
        thisPost['user_id'] = thisPost['user']['id'];
      }
      return Promise.resolve(thisPost);
    }
    return Promise.resolve(null);
  }

  async editPost(body: EditPostDto): Promise<PostEntity> {
    const entityManager = getManager();
    const posts = await entityManager.query(
      ' select posts.* ' +
        ' from posts ' +
        ' where posts.user_id = ? and md5(concat("POSTID:",posts.id)) = ? limit 1',
      [body.user_id, body.post_hash],
    );

    if (posts.length === 1) {
      const thisPost: PostEntity = posts.pop();
      thisPost.post = body.post_text;
      const theUser = await this.userRepository.findOne(body.user_id);
      thisPost['user'] = theUser;
      thisPost['postData'] = null;
      if (
        thisPost['parent_post_id'] &&
        Number(thisPost['parent_post_id']) > 0
      ) {
        thisPost['quoted_post'] = await this.postRepository.findOne({
          where: { id: thisPost['parent_post_id'] },
        });
        thisPost['quoted_post']['user'] = await this.userRepository.findOne(
          thisPost['quoted_post']['user_id'],
        );
      }

      await this.postRepository.save(thisPost);
      return Promise.resolve(thisPost);
    }
    return Promise.resolve(null);
  }

  async addPostLike(userId, postHash): Promise<PostEntity> {
    const existingPost: PostEntity = await this.getPostByhash(
      postHash,
      null,
      true,
    );
    if (existingPost) {
      // const existingLike = await this.postLikesRepository.findOne({where :{user_id : userId, post_id: }})
      const entityManager = getManager();
      const existingLikes: LikeEntity[] = await entityManager.query(
        ' select id from posts_likes ' +
          ' where post_id = ? and user_id=?' +
          ' limit 1 ',
        [existingPost.id, userId],
      );

      if (existingLikes && existingLikes.length === 0) {
        const newLike = new LikeEntity();
        newLike.post_id = existingPost.id;
        newLike.user_id = userId;
        await this.postLikesRepository.save(newLike);
        existingPost.count_likes += 1;
        existingPost['like_result'] = 'Added';

        ///// Emit //////
        const eventEmit: NewNotificationEvent = new NewNotificationEvent();

        if (typeof newLike.post_id === 'string') {
          eventEmit.post = parseInt(newLike.post_id);
        } else {
          eventEmit.post = newLike.post_id;
        }

        eventEmit.fromUser = userId;
        eventEmit.user = existingPost.user_id;
        eventEmit.type = NotificationEnumTypes.LIKE;

        this.eventEmitter.emit('new.notification', eventEmit);

        ///// Emit //////
      } else {
        existingPost.count_likes -= 1;
        existingPost['like_result'] = 'Removed';
        existingLikes.map((l) => {
          this.postLikesRepository.delete(l.id);
        });
      }

      await this.postRepository.save(existingPost);

      const postUser = await this.userRepository.findOne(
        existingPost.user_id.toString(),
      );
      existingPost['user'] = postUser;
      existingPost['postData'] = null;
      if (
        existingPost['parent_post_id'] &&
        Number(existingPost['parent_post_id']) > 0
      ) {
        existingPost['quoted_post'] = await this.postRepository.findOne({
          where: { id: existingPost['parent_post_id'] },
        });

        existingPost['quoted_post']['user'] = await this.userRepository.findOne(
          existingPost['quoted_post']['id'],
        );
      }

      return Promise.resolve(existingPost);
    }

    return Promise.resolve(null);
  }

  async saveComment(
    post: PostEntity | PollEntity,
    comment: string,
    userId: number,
  ): Promise<CommentEntity> {
    const newComment = new CommentEntity();
    if (post['question']) {
      newComment.poll_id = post.id;
      newComment.comment = comment;
      newComment.user_id = userId;
    } else {
      newComment.post_id = post.id;
      newComment.comment = comment;
      newComment.user_id = userId;
    }
    await this.postCommentsRepository.save(newComment);

    return Promise.resolve(newComment);
  }

  async listComments(
    post: PostEntity | PollEntity,
    page: number,
    size: number,
  ): Promise<any> {
    let list;
    const entityManager = getManager();
    if (post['question']) {
      list = await entityManager.query(
        ` select id,
                 user_id,
                 post_id,
                 poll_id,
                 comment,
                 date_format(created_at, "%d %M") created_at,
                 updated_at
          from posts_comments
          where poll_id = ?
          order by id desc limit ${size}`,
        [post.id],
      );

      // list = await this.postCommentsRepository.find({
      //   where: {
      //     poll_id: post.id,
      //   },
      //   order: {
      //     created_at: 'DESC',
      //   },
      //   take: size,
      // });
    } else {
      list = await entityManager.query(
        ` select id,
                 user_id,
                 post_id,
                 poll_id,
                 comment,
                 date_format(created_at, "%d %M") created_at,
                 updated_at
          from posts_comments
          where post_id = ?
          order by id desc limit ${size}`,
        [post.id],
      );

      // list = await this.postCommentsRepository.find({
      //   where: {
      //     post_id: post.id,
      //   },
      //   order: {
      //     created_at: 'DESC',
      //   },
      //   take: size,
      // });
    }
    const clist = await Promise.all(
      list.map(async (c, i) => {
        c['user'] = await this.userRepository.findOne(c['user_id'].toString());
        delete c['user']['password'];
        c['user']['id'] = crypto
          .createHash('md5')
          .update(`USERID:${c['user']['id']}`)
          .digest('hex');
        // c['user']['created_at'] = moment(c['created_at']).format('dd MMMM');
        return c;
      }),
    );

    return Promise.resolve(clist);
  }

  async countComments(post: PostEntity | PollEntity): Promise<number> {
    let list;
    const entityManager = getManager();
    if (post['question']) {
      list = await entityManager.query(
        ` select count(1) qty
          from posts_comments
          where poll_id = ?`,
        [post.id],
      );
    } else {
      list = await entityManager.query(
        ` select count(1) qty
          from posts_comments
          where post_id = ?`,
        [post.id],
      );
    }

    return Promise.resolve(list[0]['qty']);
  }

  async createPoll(
    question: string,
    userId: string,
    expires: any,
  ): Promise<PollEntity> {
    const user: UserEntity = await this.userRepository.findOne(userId);
    if (user && user.id > 0) {
      const newPoll: PollEntity = new PollEntity();
      newPoll.user_id = user.id;
      newPoll.question = question;
      if (expires) {
        // newPoll.time_days = expires['t_days'];
        // newPoll.time_hours = expires['t_hours'];
        // newPoll.time_minutes = expires['t_minutes'];
      }

      await this.pollRepository.save(newPoll);
      return Promise.resolve(newPoll);
    }
    return Promise.resolve(null);
  }

  async addPollOption(
    poll: PollEntity,
    optionText: string,
  ): Promise<PollOptionEntity> {
    const newPollOption: PollOptionEntity = new PollOptionEntity();
    newPollOption.poll_id = poll.id;
    newPollOption.option_text = optionText;
    await this.pollQuestionRepository.save(newPollOption);
    return Promise.resolve(newPollOption);
  }

  async getPollFromHash(
    pollhash: string,
    withUser: boolean,
  ): Promise<PollEntity> {
    const entityManager = getManager();
    const poll: PollEntity[] = await entityManager.query(
      `select *
       from polls
       where md5(concat('POLLID:', id)) = ? limit 1`,
      [pollhash],
    );
    if (poll && poll.length === 1) {
      const p = await this.pollRepository.findOne({
        where: { id: poll[0].id },
      });
      if (withUser) {
        const postUser = await this.userRepository.findOne(
          p.user_id.toString(),
        );
        p['user'] = postUser;
      }
      return Promise.resolve(p);
    }
    return Promise.resolve(null);
  }

  async getPollFromId(id: string): Promise<PollEntity> {
    const entityManager = getManager();
    const poll: PollEntity[] = await entityManager.query(
      `select *
       from polls
       where id = ? limit 1`,
      [id],
    );
    if (poll && poll.length === 1) {
      const p = await this.pollRepository.findOne({
        where: { id: poll[0].id },
      });
      return Promise.resolve(p);
    }
    return Promise.resolve(null);
  }

  async voteOnPoll(
    site_user_id: string,
    pollhash: string,
    option: string,
  ): Promise<PollVoteEntity> {
    const user = await this.userRepository.findOne(site_user_id);
    if (user && user.id > 0) {
      const poll: PollEntity = await this.getPollFromHash(pollhash, true);
      const voted: PollVoteEntity = await this.pollVoteRepository.findOne({
        where: {
          user_id: parseInt(site_user_id),
          poll_id: poll.id,
        },
      });

      if (voted && voted.id > 0) {
      } else {
        const newVote = new PollVoteEntity();
        newVote.user_id = parseInt(site_user_id, 10);
        newVote.poll_id = poll.id;
        newVote.vote_id = parseInt(option.split('-')[1]);
        await this.pollVoteRepository.save(newVote);
        return Promise.resolve(newVote);
      }
    }
    return Promise.resolve(null);
  }

  async voteOnPollv2(
    user: UserEntity,
    postId: string,
    voteId: number,
  ): Promise<PollVoteEntity> {
    if (user && user.id > 0) {
      const post: PostEntity = await this.postRepository.findOne({
        where: { hash: postId },
      });
      if (post) {
      }
      const voted: PollVoteEntity = await this.pollVoteRepository.findOne({
        where: {
          user_id: user.id,
          poll_id: post.poll_id,
        },
      });

      if (voted && voted.id > 0) {
      } else {
        const newVote = new PollVoteEntity();
        newVote.user_id = user.id;
        newVote.poll_id = post.poll_id;
        newVote.vote_id = voteId;
        await this.pollVoteRepository.save(newVote);
        await this.pollQuestionRepository.update(
          { poll_id: post.poll_id, id: voteId },
          {
            votes: () => 'votes + 1',
          },
        );

        return Promise.resolve(newVote);
      }
    }
    return Promise.resolve(null);
  }

  async getPollStatsFromHash(pollhash, userHash): Promise<any[]> {
    const poll: PollEntity = await this.getPollFromHash(pollhash, true);
    if (poll && poll.id > 0) {
      const stats = await this.getPollStats(poll, userHash);
      return Promise.resolve(stats);
    }
    return Promise.resolve(null);
  }

  async getPollStats(
    poll: PollEntity,
    userHash: string,
    userId?: number,
  ): Promise<any> {
    let user: UserEntity;
    if (userId) {
      user = await this.userRepository.findOne(userId.toString());
    } else {
      user = await this.userRepository.findUserByhash(userHash, 'USERID:');
    }

    if (poll && poll.id > 0) {
      const entityManager = getManager();
      const stats = await entityManager.query(
        `select concat('vo-', po.id) option_id,
                count(1)             cnt
         from polls p
                  inner join polls_option po on p.id = po.poll_id
                  inner join polls_votes pv on po.id = pv.vote_id
         where p.id = ?
         group by option_id`,
        [poll.id],
      );
      const init = 0;
      const total = stats.reduce((pre, cur) => {
        return pre + parseInt(cur.cnt);
      }, init);
      const updated = stats.map((e) => {
        e['perc'] = Math.round((parseInt(e.cnt) / total) * 100);
        return e;
      });

      const pollVote: PollVoteEntity = await this.pollVoteRepository.findOne({
        where: { poll_id: poll.id, user_id: user.id },
      });

      const result = {
        options: updated,
        userVote: pollVote?.vote_id ?? null,
      };

      return Promise.resolve(result);
    }
  }

  async pollDelete(pollhash): Promise<boolean> {
    const poll: PollEntity = await this.getPollFromHash(pollhash, true);
    if (poll && poll.id > 0) {
      poll.isActive = 0;
      await this.pollRepository.save(poll);
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  extractedHashtags(post: string) {
    try {
      const reg = /\B#(\w*)/g;
      const matched = post.match(reg);
      return matched;
    } catch (e) {
      console.log('Unable to log hashtags');
    }

    return [];
  }

  async saveHashtags(
    extractedHashtags: string[],
    userId: number | string,
  ): Promise<PostHashtagsEntity[]> {
    const setHashes = {};
    extractedHashtags.map((x) => {
      if (!(x in setHashes)) {
        setHashes[x] = 1;
      } else {
        setHashes[x] += 1;
      }
    });

    extractedHashtags = Object.keys(setHashes);
    return await Promise.all(
      extractedHashtags.map(async (tag) => {
        const existingTag: PostHashtagsEntity =
          await this.postHashtagsRepository.findOne({
            where: { tag: tag.replace('#', '') },
          });
        if (existingTag && existingTag.id > 0) {
          existingTag.popularity += 1;
          if (existingTag.popularity > 1000) {
            existingTag.is_trending = 1;
          }
          this.postHashtagsRepository.save(existingTag);
          return existingTag;
        } else {
          const newTag = new PostHashtagsEntity();
          newTag.tag = tag.replace('#', '');
          newTag.user_id = userId;
          newTag.popularity = 1;
          await this.postHashtagsRepository.save(newTag);
        }
      }),
    );
  }

  async listHashtags(tag): Promise<string[]> {
    const entityManager = getManager();
    const tags = await entityManager.query(
      `select tag
       from posts_hashtags
       where tag like ?
       order by is_trending, popularity desc limit 10`,
      [`%${tag}%`],
    );
    if (tags) {
      const theseTags = tags.map((t) => t['tag']);
      return Promise.resolve(theseTags);
    }
    return Promise.resolve([]);
  }

  async decrementHashtag(tag: string) {
    const tagFound: PostHashtagsEntity =
      await this.postHashtagsRepository.findOne({
        where: {
          tag: tag,
        },
      });
    tagFound.popularity = tagFound.popularity - 1;
    if (tagFound.popularity <= 0) {
      await this.postHashtagsRepository.delete({
        id: tagFound.id,
        tag: tagFound.tag,
      });
    } else {
      await this.postHashtagsRepository.save(tagFound);
    }
  }

  async listAnyHashtags(): Promise<string[]> {
    const entityManager = getManager();
    const tags = await entityManager.query(
      `select tag, popularity
       from posts_hashtags
       order by is_trending, popularity desc`,
    );
    if (tags) {
      const theseTags = tags.map((t, i) => {
        return { id: i + 1, hash: t['tag'], totalPosts: t['popularity'] };
      });
      return Promise.resolve(theseTags);
    }
    return Promise.resolve([]);
  }

  async listAllHashtags(pg: number): Promise<string[]> {
    if (!pg || pg === 0) {
      pg = 1;
    }

    const entityManager = getManager();
    const tags = await entityManager.query(
      `select tag, popularity
       from posts_hashtags
       order by is_trending, popularity desc limit ? , ?`,
      [(pg - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE],
    );
    if (tags) {
      const theseTags = tags.map((t, i) => {
        return { id: i + 1, hash: t['tag'], totalPosts: t['popularity'] };
      });
      return Promise.resolve(theseTags);
    }
    return Promise.resolve([]);
  }

  async listPostCommenters(postHash: string, userId): Promise<UserEntity[]> {
    const list = await this.userRepository.findUnfollowedPostCommenters(
      postHash,
      userId,
    );
    return Promise.resolve(list);
  }

  async listPostSharers(postHash: string, userId): Promise<UserEntity[]> {
    const list = await this.userRepository.findUnfollowedPostSharers(
      postHash,
      userId,
    );
    return Promise.resolve(list);
  }

  async listPostLikers(postHash: string, userId): Promise<UserEntity[]> {
    const list = await this.userRepository.findUnfollowedPostLikers(
      postHash,
      userId,
    );
    return Promise.resolve(list);
  }

  async fetchPage(url): Promise<string> {
    try {
      const res2 = await this.http.request({
        method: 'GET',
        url: url,
        headers: {
          Cookie: '',
          'User-Agent': 'url-metadata/3.0 (npm module)',
          'Accept-Language': 'en-US',
          Accept: 'text/html',
          // 'Referer': 'https://www.google.com/',
        },
      });
      const content: any = await lastValueFrom(res2);
      return Promise.resolve(content.data);
    } catch (e) {
      return this.extractSpecific(url).then((response) => {
        return Promise.resolve(response);
      });
    }
  }

  async incrementShareCount(post: PostEntity | PollEntity): Promise<number> {
    if (post['question']) {
    } else {
      const thePost: PostEntity = await this.postRepository.findOne({
        where: { id: post.id },
      });
      thePost.count_share += 1;
      await this.postRepository.save(thePost);
      return Promise.resolve(thePost.count_share);
    }
    return Promise.resolve(0);
  }

  async urlMeta(url: string): Promise<any> {
    try {
      if (url.endsWith('/')) {
        url = url.slice(0, -1);
      }
      if (url.toLowerCase().indexOf('soma.cafe/u/') > -1) {
        const username = url.split('soma.cafe/u/')[1];
        const user: UserEntity = await this.userRepository.loadByUsername(
          username,
        );
        if (user) {
          const page_meta = {
            website: null,
            mediaType: 'profile',
            title: user.displayName,
            url: url,
            description: user.bio,
            image: user.ava_src,
            videoUrl: null,
          };
          return Promise.resolve(page_meta);
        }
      }
      if (url.indexOf('somastream.cafe/WebRTCAppEE/play.html') > -1) {
        return {};
      }
      if (url.indexOf('x.com') > -1 || url.indexOf('twitter.com') > -1) {
        return this.extractTwitter(url).then((response) => {
          return Promise.resolve(response);
        });
      }
      // if (url.indexOf('facebook.com') > -1) {
      //   console.log('In facebook condition');
      //   return this.extractFacebook(url).then((response) => {
      //     return Promise.resolve(response);
      //   });
      // }
      if (url.indexOf('tiktok.com') > -1) {
        const tikTokMetaData = await this.extractTiktok(url);
        return Promise.resolve(tikTokMetaData);
      }
      const specificUrls = ['yahoo.com', 'msn.com', 'autoblog.com'];
      const isSpecificUrl = specificUrls.some((item) => {
        return url.indexOf(item) > -1;
      });
      if (isSpecificUrl) {
        return this.extractSpecific(url).then((response) => {
          return Promise.resolve(response);
        });
      }
      const res: any = await this.fetchPage(url);
      if (res) {
      }
      const html = cheerio.load(res);
      if (html) {
      }
      const page_meta = {
        website:
          html("meta[property='og:site_name']").attr('content') ||
          html("meta[name='og:site_name']").attr('content') ||
          html("meta[name='application-name']").attr('content'),
        mediaType:
          html("meta[property='og:type']").attr('content') ||
          html("meta[name='og:type']").attr('content') ||
          html("meta[name='twitter:card']").attr('content'),
        title:
          html("meta[property='og:title']").attr('content') ||
          html("meta[name='og:title']").attr('content') ||
          html('title').text(),
        url:
          html("meta[property='og:url']").attr('content') ||
          html("meta[name='og:url']").attr('content') ||
          url,
        description: (
          html("meta[property='og:description']").attr('content') ||
          html("meta[name='og:description']").attr('content') ||
          html("meta[name='description']").attr('content') ||
          html("meta[name='twitter:description']").attr('content') ||
          html('p').text()
        )
          ?.split(' ')
          .slice(0, 20)
          .join(' '),
        image:
          html("meta[property='og:image']").attr('content') ||
          html("meta[name='og:image']").attr('content') ||
          html("meta[name='twitter:image']").attr('content') ||
          html('figure.wp-block-image img').attr('src') ||
          html("img[src^='https://']").attr('src') ||
          html("img[src^='http://']").attr('src') ||
          html("img[typeof='foaf:Image']").attr('src') ||
          html("link[rel='icon']").attr('href'),
        videoUrl:
          html("meta[property='og:video:url']").attr('content') ||
          html("meta[name='og:video:url']").attr('content'),
      };
      // ||
      // '/images/favicon.png'
      if (url.indexOf('brighteon.com') > -1) {
        page_meta.description = page_meta.title;
      }
      return Promise.resolve(page_meta);
    } catch (e) {
      console.log(`Error fetching url: ${url}`);
    }
  }
  async extractSpecific(url: string): Promise<any> {
    try {
      const { data } = await mql(url, {
        meta: true,
        video: true,
      });
      const page_meta = {
        title: data.title,
        description: data.description,
        image: data.image?.url || null,
        mediaType: data.image?.type || null,
        url: data.url,
        videoUrl: data.video?.url || null,
      };
      return Promise.resolve(page_meta);
    } catch (e) {
      console.log(e);
      console.log(`Error fetching url: ${url}`);
    }
    return {};
  }
  async extractFacebook(url: string): Promise<any> {
    try {
      console.log('extractFacebook function called');
      const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || '';
      const apiUrl = `https://graph.facebook.com/v19.0/loghomedesigns?fields=first_name,last_name,profile_pic&access_token=${accessToken}`;
      const response: any = await this.http.get(apiUrl);
      console.log('response:', response);
      if (response.status === 200 && response.data) {
        const data = response.data;
        console.log('Facebook API response:', data);
        const postUrlRegex = /facebook.com\/photo.php\?fbid=(\d+)/;
        const postUrlMatch = url.match(postUrlRegex);
        if (postUrlMatch) {
          const postMeta = {
            user: null,
            website: 'Facebook',
            mediaType: 'post',
            title: data.name,
            url: url,
            description: data.description.replace(/https:\/\/t.co\/(.*)$/, ''),
            image: data.picture,
          };
          console.log('Post metadata:', postMeta);
          return Promise.resolve(postMeta);
        }
        const profileUrlRegex = /facebook.com\/(\w+)/;
        const profileUrlMatch = url.match(profileUrlRegex);
        if (profileUrlMatch) {
          const userMeta = {
            user: profileUrlMatch[1],
            website: 'Facebook',
            mediaType: 'profile',
            title: data.name,
            url: url,
            description: data.description.replace(/https:\/\/t.co\/(.*)$/, ''),
            image: data.picture.data.url,
          };
          console.log('Profile metadata:', userMeta);
          return Promise.resolve(userMeta);
        }
      } else {
        console.error('Error fetching Facebook data. Status:', response.status);
        throw new Error('Failed to fetch Facebook data');
      }
    } catch (error) {
      console.error('Error fetching Facebook data:', error);
      throw new Error('Failed to fetch Facebook data');
    }
  }
  async extractTwitter(url: string): Promise<any> {
    let tweetId;
    let username;

    const ur = new URL(url);

    try {
      tweetId = ur?.pathname
        ?.match(/(status\/[0-9].*?(\/|$))/)[0]
        .split('/')[1];
    } catch (e) {}

    if (!tweetId) {
      username = url.split('/').pop();
    }

    const conf: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN || ''}`,
      },
    };
    if (tweetId) {
      try {
        const urlToFetch = `https://api.twitter.com/2/tweets?ids=${tweetId}&expansions=attachments.media_keys&media.fields=duration_ms,height,media_key,preview_image_url,public_metrics,type,url,width,alt_text&user.fields=created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,url,username,verified,withheld&tweet.fields=attachments,author_id`;
        const res = await this.http.get(urlToFetch, {
          headers: {
            Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN || ''}`,
          },
        });
        const content: any = await lastValueFrom(res);
        const tweetData = content?.data?.data?.[0];
        if (!tweetData) {
          throw new Error('No tweet data found.');
        }
        const authorId = tweetData.author_id;
        const tweetText: string = tweetData.text;
        let previewImage = null;
        try {
          const media = content?.data?.includes?.media;
          if (media && media.length > 0) {
            const firstMedia = media[0];
            if (firstMedia.type === 'video') {
              previewImage = firstMedia.preview_image_url;
            } else if (firstMedia.type === 'photo') {
              previewImage = firstMedia.url;
            }
          }
        } catch (e) {}
        // Fetch user data
        const res2 = await this.http.get(
          `https://api.twitter.com/2/users?ids=${authorId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN || ''}`,
            },
          },
        );
        const content2: any = await lastValueFrom(res2);
        const userName = content2?.data?.data?.[0]?.name;
        if (!userName) {
          throw new Error('No user name found.');
        }
        // Build and return tweet metadata
        const tweetMeta = {
          user: userName,
          website: 'Twitter',
          mediaType: 'vid/img',
          title: userName,
          url: url,
          description: tweetText.replace(/https:\/\/t.co\/(.*)$/, ''),
          image: previewImage,
        };
        return Promise.resolve(tweetMeta);
      } catch (error) {
        console.error('Error:', error.message, error);
        return Promise.reject(error);
      }
    }
    if (username) {
      const urlToFetch = `https://api.twitter.com/2/users/by?usernames=${username}&user.fields=created_at,description,entities,id,location,name,pinned_tweet_id,profile_image_url,protected,url,username,verified,withheld&expansions=pinned_tweet_id&tweet.fields=author_id,created_at`;
      const res = await this.http.get(urlToFetch, {
        headers: {
          Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN || ''}`,
        },
      });
      const content: any = await lastValueFrom(res);
      if (content['data']) {
        const tweetMeta = {
          user: username,
          website: 'Twitter',
          mediaType: 'text',
          title: username,
          url: url,
          description: content?.data?.data?.[0]['description'],
          image: content?.data?.data?.[0]['profile_image_url'],
        };
        return Promise.resolve(tweetMeta);
      }
    }
  }

  async extractTiktok(url: string): Promise<any> {
    try {
      const res = await this.http.get(
        `https://www.tiktok.com/oembed?url=${encodeURI(url)}`,
      );
      const content: any = await lastValueFrom(res);
      const tiktokInfo: any = content.data;

      return Promise.resolve({
        user: tiktokInfo?.author_name,
        website: tiktokInfo?.provider_name,
        mediaType: tiktokInfo?.type,
        title: tiktokInfo?.title,
        url: url,
        description: tiktokInfo?.description,
        image: tiktokInfo?.thumbnail_url,
      });
    } catch (error) {
      return Promise.resolve(this.extractSpecific(url));
    }
  }

  extractUrls(postText: string) {
    if (postText && postText.length > 0) {
      try {
        const expr =
          /((http|https|ftp):\/\/[^\s"'<>]+|www\.[^\s"'<>]+|ftp:\/\/[^\s"'<>]+)/g;
        const found = postText.match(expr);
        if (found) {
          const uniqLinks = found.filter((v, i, a) => a.indexOf(v) === i);
          return uniqLinks;
        }
      } catch (e) {
        console.log(e);
      }
    }
    return [];
  }

  async cleanUserObj(user, siteUserId?: number) {
    delete user['password'];
    delete user['reset_token'];
    delete user['reset_token_expires_at'];
    delete user['sessionId'];
    delete user['isAdmin'];
    const isFollow = await this.followRepoService.isFollowing({
      type: 'follow',
      user_id: siteUserId.toString(),
      followed_user_id: user['id'],
    });
    user['isFollowed'] = isFollow;
    user['id'] = user['hash'];
    // delete user['hash'];

    return user;
  }

  async cleanPostObj(post, siteUserId?: number) {
    if (post['user']) {
      // if (post['user']['id'] === siteUserId) {
      //   post['mine'] = true;
      // }

      post['user_id'] = post['user']['id'];
    }
    post['id'] = post['hash'];
    delete post['hash'];

    return post;
  }

  async setMentioned(
    payload: NewPostEventDto,
    usernames: Awaited<{ username: string; id: number }>[],
  ): Promise<any> {
    payload.post.mentions = JSON.stringify(
      await Promise.all(
        usernames.map((m) => {
          return { username: m.username };
        }),
      ),
    );

    await this.postRepository.save({
      id: payload.post.id,
      mentions: payload.post.mentions,
    });

    await Promise.all(
      usernames.map(async (m) => {
        const ment: PostMentionsEntity = new PostMentionsEntity();
        ment.mentioned_user_id = m.id;
        ment.post_id = payload.post.id;
        await this.postMentionRepository.save(ment);

        await this.notifications.trackMentions(
          payload.post.id,
          payload.post.user_id,
          m.id,
          payload.post,
        );
      }),
    );

    return Promise.resolve(payload.post);
  }

  async loadById(id: number | string): Promise<PostEntity> {
    const p: PostEntity = await this.postRepository.findOne({ where: { id } });
    return Promise.resolve(p);
  }

  async parsePostImages(attachments: string[]): Promise<string[]> {
    const current = [
      ...attachments.filter(
        (x: any) => !x['buffer'] && x.indexOf('http://') >= 0,
      ),
      ...attachments.filter(
        (x: any) => !x['buffer'] && x.indexOf('https://') >= 0,
      ),
    ];
    let attachmentsSaved = [];
    attachments = [...attachments.filter((x) => x['buffer'])];
    attachments = [...attachments.filter((x) => x['buffer'])];

    if (attachments.length > 0) {
      fs.access('public/uploads/img', (err) => {
        if (err) {
          try {
            fs.mkdirSync('public/uploads/img');
          } catch (e) {}
        }
      });

      const imageMime = ['png', 'jpg', 'jpeg', 'gif', 'svg'];

      attachmentsSaved = await Promise.all(
        attachments.map((att) => {
          const newFile = uuid().toString();
          const baseDir = `public/uploads/img`.split('/');

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
          const ext = att['originalname'].split('.').pop();
          const newImagename = `${nf}.${ext}`;
          const buf = Buffer.from(att['buffer'], 'binary');
          fs.writeFileSync(newImagename, buf);
          return {
            fieldname: att['fieldname'],
            type: att['mimetype'],
            src: newImagename.substring(6),
          };
        }),
      );
    }
    return Promise.resolve([...attachmentsSaved, ...current]);
  }

  async fetchReplies(user: UserEntity, pg) {
    const entityManager = getManager();
    if (!pg || pg === 0) {
      pg = 1;
    }
    const replies: PostEntity[] = await entityManager.query(
      ' select replies.* ' +
        ' from posts p ' +
        ' inner join posts replies on replies.parent_post_id = p.id ' +
        ' where (p.user_id = ? or replies.user_id = ? )and replies.postType= 5' +
        ' order by created_at desc limit ?,?',
      [user.id, user.id, (pg - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE],
    );

    const post = new PostEntity();
    const reppl: PostEntity[] = await Promise.all(
      replies.map(async (p) => {
        p = await this.parsePostStats(p, user);

        if (p['parent_post_id']) {
          p['quoted_post'] = await this.getParentPostById(
            p['parent_post_id'],
            user,
          );

          post.id = p['parent_post_id'];
          p['parent_post_id'] = post.getIdAsHash();
        }

        p['user'] = await this.userRepository.findOne(p.user_id.toString());

        p['user'] = await this.userRepository.addUserMeta(
          p['user'],
          user.id.toString(),
          p['user']['id'],
        );

        // const isMutedEntry = await this.userRepository.isUserMuted(
        //   user.id.toString(),
        //   p['user']['id'],
        // );
        //
        // if (isMutedEntry && isMutedEntry.id > 0 && isMutedEntry.status === 1) {
        //   // return Promise.resolve(null);
        //   p['user']['isMuted'] = true;
        // } else {
        //   p['user']['isMuted'] = false;
        // }
        //
        // const isBlockedEntry = await this.userRepository.isUserBlocked(
        //   user.id.toString(),
        //   p['user']['id'],
        // );
        // if (
        //   isBlockedEntry &&
        //   isBlockedEntry.id > 0 &&
        //   isBlockedEntry.status === 1
        // ) {
        //   p['user']['isBlocked'] = true;
        // } else {
        //   p['user']['isBlocked'] = false;
        // }

        p['user'] = await this.cleanUserObj(p['user'], user.id);
        // p['user_id'] = user.getIdAsHash();
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

        p['user_id'] = p['user']['id'];
        p['id'] = p['hash'];
        delete p['hash'];
        return p;
      }),
    );
    return reppl;
  }

  async fetchLikes(user: UserEntity, pg) {
    const entityManager = getManager();
    if (!pg || pg === 0) {
      pg = 1;
    }
    const replies: PostEntity[] = await entityManager.query(
      ' select p.* from ' +
        ' posts p ' +
        ' inner join posts_likes pl on p.id = pl.post_id ' +
        ' where pl.user_id = ? order by id desc' +
        ' limit ?, ? ',
      [user.id, (pg - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE],
    );

    const post = new PostEntity();
    const uu: UserEntity = new UserEntity();
    await Promise.all(
      replies.map(async (p) => {
        p = await this.parsePostStats(p, user);
        p['id'] = p['hash'];

        p['user'] = await this.userRepository.findOne(p.user_id.toString());
        p['user'] = await this.userRepository.addUserMeta(
          p['user'],
          user.id.toString(),
          p['user']['id'],
        );

        // const isMutedEntry = await this.userRepository.isUserMuted(
        //   user.id.toString(),
        //   p['user']['id'],
        // );
        //
        // if (isMutedEntry && isMutedEntry.id > 0 && isMutedEntry.status === 1) {
        //   // return Promise.resolve(null);
        //   p['user']['isMuted'] = true;
        // } else {
        //   p['user']['isMuted'] = false;
        // }
        //
        // const isBlockedEntry = await this.userRepository.isUserBlocked(
        //   user.id.toString(),
        //   p['user']['id'],
        // );
        // if (
        //   isBlockedEntry &&
        //   isBlockedEntry.id > 0 &&
        //   isBlockedEntry.status === 1
        // ) {
        //   p['user']['isBlocked'] = true;
        // } else {
        //   p['user']['isBlocked'] = false;
        // }
        p['user'] = await this.cleanUserObj(p['user'], user.id);

        if (p['parent_post_id']) {
          post.parent_post_id = p['parent_post_id'];
          p['parent_post_id'] = post.getIdAsHash();
        }

        uu.id = user.id;
        p['user_id'] = uu.getIdAsHash();

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
      }),
    );
    return replies;
  }

  async fetchPostsWithMedia(user: UserEntity, pg) {
    const entityManager = getManager();
    if (!pg || pg === 0) {
      pg = 1;
    }
    const withMedia: PostEntity[] = await entityManager.query(
      ' select p.* from posts p where p.user_id = ? and (gallery is not null or links_meta != "[]") order by p.id desc limit ? ,?',
      [user.id, (pg - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE],
    );

    const post = new PostEntity();
    await Promise.all(
      withMedia.map(async (p) => {
        p = await this.parsePostStats(p, user);
        p['id'] = p['hash'];

        if (p['parent_post_id']) {
          const parentPost = await this.getParentPostById(
            p['parent_post_id'].toString(),
            user,
          );

          if (parentPost) {
            p['parent_post_id'] = parentPost['hash'];
            p['quoted_post'] = parentPost;
          }
        }

        p['user'] = await this.userRepository.findOne(p.user_id.toString());
        p['user'] = await this.userRepository.addUserMeta(
          p['user'],
          user.id.toString(),
          p['user']['id'],
        );

        // const isMutedEntry = await this.userRepository.isUserMuted(
        //   user.id.toString(),
        //   p['user']['id'],
        // );
        //
        // if (isMutedEntry && isMutedEntry.id > 0 && isMutedEntry.status === 1) {
        //   // return Promise.resolve(null);
        //   p['user']['isMuted'] = true;
        // } else {
        //   p['user']['isMuted'] = false;
        // }
        //
        // const isBlockedEntry = await this.userRepository.isUserBlocked(
        //   user.id.toString(),
        //   p['user']['id'],
        // );
        // if (
        //   isBlockedEntry &&
        //   isBlockedEntry.id > 0 &&
        //   isBlockedEntry.status === 1
        // ) {
        //   p['user']['isBlocked'] = true;
        // } else {
        //   p['user']['isBlocked'] = false;
        // }

        p['user'] = await this.cleanUserObj(p['user'], user.id);

        p['user_id'] = p['user']['hash'];
        delete p['user']['id'];

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
      }),
    );
    return withMedia;
  }

  async findUnfollowedAllPostFollows(userId) {
    const list = await this.userRepository.findUnfollowedAllPostFollows(userId);
    return Promise.resolve(list);
  }

  async searchPostText(q: string, pg: number, user: UserEntity): Promise<any> {
    const posts: PostEntity[] = await this.postRepository.find({
      where: {
        post: ILike(`%${q.replace(' ', '%')}%`),
      },
      order: { created_at: 'DESC' },
      take: SEARCH_PAGE_SIZE,
      skip: (pg - 1) * SEARCH_PAGE_SIZE,
    });
    const post = new PostEntity();
    await Promise.all(
      posts.map(async (p) => {
        p = await this.parsePostStats(p, user);
        post.id = p['id'];
        p['id'] = p['hash'];

        if (p['parent_post_id']) {
          const parentPost = await this.getParentPostById(
            p['parent_post_id'].toString(),
            user,
          );

          if (parentPost) {
            p['parent_post_id'] = parentPost['hash'];
            p['quoted_post'] = parentPost;
          }
        }

        p['user'] = await this.userRepository.findOne(p.user_id.toString());
        p['user'] = await this.cleanUserObj(p['user'], user.id);
        p['user_id'] = user.getIdAsHash();

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
      }),
    );

    return Promise.resolve(posts);
  }

  async searchPostsWithImages(
    q: string,
    pg: number,
    user: UserEntity,
  ): Promise<any> {
    const posts: PostEntity[] = await this.postRepository.find({
      where: [
        {
          post: Like(`%${q.replace(' ', '%')}%`),
          gallery: Not(''),
        },
        {
          post: Like(`%${q.replace(' ', '%')}%`),
          gif: Not(''),
        },
      ],
      order: { created_at: 'DESC' },
      take: SEARCH_PAGE_SIZE,
      skip: (pg - 1) * SEARCH_PAGE_SIZE,
    });
    const post = new PostEntity();
    await Promise.all(
      posts.map(async (p) => {
        p = await this.parsePostStats(p, user);
        post.id = p['id'];
        p['id'] = p['hash'];

        if (p['parent_post_id']) {
          const parentPost = await this.getParentPostById(
            p['parent_post_id'].toString(),
            user,
          );

          if (parentPost) {
            p['parent_post_id'] = parentPost['hash'];
            p['quoted_post'] = parentPost;
          }
        }

        p['user'] = await this.userRepository.findOne(p.user_id.toString());
        p['user'] = await this.userRepository.addUserMeta(
          p['user'],
          user.id.toString(),
          p['user']['id'],
        );

        // const isMutedEntry = await this.userRepository.isUserMuted(
        //   user.id.toString(),
        //   p['user']['id'],
        // );
        //
        // if (isMutedEntry && isMutedEntry.id > 0 && isMutedEntry.status === 1) {
        //   // return Promise.resolve(null);
        //   p['user']['isMuted'] = true;
        // } else {
        //   p['user']['isMuted'] = false;
        // }
        //
        // const isBlockedEntry = await this.userRepository.isUserBlocked(
        //   user.id.toString(),
        //   p['user']['id'],
        // );
        // if (
        //   isBlockedEntry &&
        //   isBlockedEntry.id > 0 &&
        //   isBlockedEntry.status === 1
        // ) {
        //   p['user']['isBlocked'] = true;
        // } else {
        //   p['user']['isBlocked'] = false;
        // }
        p['user'] = await this.cleanUserObj(p['user'], user.id);
        p['user_id'] = user.getIdAsHash();
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
      }),
    );

    return Promise.resolve(posts);
  }

  async getPostFeedbyType(
    user: UserEntity,
    postType: string,
    parentPost: string,
    pg: number,
  ): Promise<PostEntity[]> {
    const typeId = postTypeLookup[postType];
    if (typeId && typeId > 1) {
      // reply: 2,
      //   quote: 3,
      //   share: 4,
      //   comment: 5,

      const pp = parentPost;
      const pPost: PostEntity = await this.getPostByhash(pp, false, true);

      if (pPost) {
        const posts: PostEntity[] = await this.postRepository.find({
          where: [
            {
              postType: typeId,
              parent_post_id: pPost.id,
            },
          ],
          order: { created_at: 'DESC' },
          take: SEARCH_PAGE_SIZE,
          skip: (pg - 1) * SEARCH_PAGE_SIZE,
        });

        const post = new PostEntity();
        await Promise.all(
          posts.map(async (p) => {
            //post.id = p['id'];
            //p['id'] = post.getIdAsHash();
            p = await this.parsePostStats(p, user);
            p['id'] = p['hash'];
            delete p['hash'];
            if (p['parent_post_id']) {
              post.parent_post_id = p['parent_post_id'];
              p['parent_post_id'] = post.getIdAsHash();
            }

            p['user'] = await this.userRepository.findOne(p.user_id.toString());
            p['user'] = await this.userRepository.addUserMeta(
              p['user'],
              user.id.toString(),
              p['user']['id'],
            );

            if (p['user']['hash'] === user.hash) {
              p['mine'] = true;
            }

            // const isMutedEntry = await this.userRepository.isUserMuted(
            //   user.id.toString(),
            //   p['user']['id'],
            // );
            //
            // if (
            //   isMutedEntry &&
            //   isMutedEntry.id > 0 &&
            //   isMutedEntry.status === 1
            // ) {
            //   // return Promise.resolve(null);
            //   p['user']['isMuted'] = true;
            // } else {
            //   p['user']['isMuted'] = false;
            // }
            //
            // const isBlockedEntry = await this.userRepository.isUserBlocked(
            //   user.id.toString(),
            //   p['user']['id'],
            // );
            // if (
            //   isBlockedEntry &&
            //   isBlockedEntry.id > 0 &&
            //   isBlockedEntry.status === 1
            // ) {
            //   p['user']['isBlocked'] = true;
            // } else {
            //   p['user']['isBlocked'] = false;
            // }

            p['user'] = await this.cleanUserObj(p['user'], user.id);
            p['user_id'] = user.getIdAsHash();
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
          }),
        );

        return Promise.resolve(posts);
      }
    }
    return Promise.resolve(null);
  }

  async saveTempImage(
    tempImage: PostTempImageEntity,
  ): Promise<PostTempImageEntity> {
    const res = await this.postTempImageRepository.save(tempImage);
    return Promise.resolve(res);
  }

  async generatePostFeedv3(
    forUser: UserEntity,
    pg: number,
    siteUser: UserEntity,
    postHash?: string,
    postType?: string,
  ): Promise<PostEntity[]> {
    let posts: PostEntity[];
    if (!pg) {
      pg = 1;
    }
    try {
      if (forUser && forUser.id > 0) {
        const entityManager = getManager();
        if (postHash && postHash !== '') {
          posts = await entityManager.query(
            `select p.id,
                    p.hash,
                    p.user_id,
                    u.hash user_hash,
                    p.parent_post_id,
                    p.postType,
                    p.contentType,
                    p.status,
                    p.post,
                    p.gallery,
                    p.privacy,
                    p.created_at,
                    p.updated_at,
                    p.count_likes,
                    p.count_share,
                    p.links_meta,
                    p.mentions,
                    p.gif
             from posts p
                      inner join users u on p.user_id = u.id
             where p.hash = ?
             order by created_at DESC limit ?,?`,
            [postHash, (pg - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE],
          );

          if (posts && posts.length === 1) {
            let post: PostEntity = posts.pop();
            if (
              postType &&
              postTypeLookup[postType] &&
              postTypeLookup[postType] !== undefined
            ) {
              const postsMeta = await entityManager.query(
                `select p.id,
                        p.hash,
                        p.user_id,
                        u.hash user_hash,
                        p.parent_post_id,
                        p.postType,
                        p.contentType,
                        p.status,
                        p.post,
                        p.gallery,
                        p.privacy,
                        p.created_at,
                        p.updated_at,
                        p.count_likes,
                        p.count_share,
                        p.links_meta,
                        p.mentions,
                        p.gif
                 from posts p
                          inner join users u on p.user_id = u.id
                 where p.parent_post_id = ?
                   and p.postType = ?
                 order by created_at DESC limit ?,?`,
                [
                  post.id,
                  postTypeLookup[postType],
                  (pg - 1) * SEARCH_PAGE_SIZE,
                  SEARCH_PAGE_SIZE,
                ],
              );

              if (postsMeta) {
                const parsedPostsMeta = await Promise.all(
                  postsMeta.map(async (p: any) => {
                    // user object
                    p = await this.parsePostStats(p, siteUser);
                    p = await this.parsePostEntry(p, siteUser);
                    return p;
                  }),
                );
                return Promise.resolve(parsedPostsMeta);
              }
            }
            post = await this.parsePostStats(post, siteUser);
            post = await this.parsePostEntry(post, siteUser);
            return Promise.resolve([post]);
          }
        }

        posts = await entityManager.query(
          `select p.id,
                  p.hash,
                  p.user_id,
                  u.hash user_hash,
                  p.parent_post_id,
                  p.postType,
                  p.contentType,
                  p.status,
                  p.post,
                  p.gallery,
                  p.privacy,
                  p.created_at,
                  p.updated_at,
                  p.count_likes,
                  p.count_share,
                  p.links_meta,
                  p.mentions,
                  p.gif
           from posts p
                    inner join users u on p.user_id = u.id
           where p.user_id = ?
             and p.postType = 1
           union
           select p.id,
                  p.hash,
                  p.user_id,
                  u.hash user_hash,
                  p.parent_post_id,
                  p.postType,
                  p.contentType,
                  p.status,
                  p.post,
                  p.gallery,
                  p.privacy,
                  p.created_at,
                  p.updated_at,
                  p.count_likes,
                  p.count_share,
                  p.links_meta,
                  p.mentions,
                  p.gif
           from posts p
                    inner join users u on p.user_id = u.id
                    inner join users_follow uf on p.user_id = uf.followed_user_id
                    left join users_mute um on p.user_id = um.muted_user_id
                    left join users_block ubp on ubp.blocked_user_id = p.user_id
           where uf.user_id = ?
             and p.postType = 1
             and (um.status != 1 or um.id is null)
             and (ubp.id is null or ubp.status = 0)
           order by created_at DESC limit ?,?`,
          [
            forUser.id,
            forUser.id,
            (pg - 1) * SEARCH_PAGE_SIZE,
            SEARCH_PAGE_SIZE,
          ],
        );

        if (posts) {
          const parsedPposts = await Promise.all(
            posts.map(async (p: any) => {
              // user object
              p = await this.parsePostStats(p, siteUser);
              p = await this.parsePostEntry(p, siteUser);
              return p;
            }),
          );
          return Promise.resolve(parsedPposts);
        }
        return Promise.resolve([]);
      }
    } catch (e) {
      console.log(e);
    }
  }

  async getParentPostById(
    id: number | string,
    siteUser: UserEntity,
  ): Promise<PostEntity> {
    const entityManager = getManager();
    const posts = await entityManager.query(
      `select p.id,
              p.hash,
              p.user_id,
              u.hash user_hash,
              p.parent_post_id,
              p.postType,
              p.contentType,
              p.status,
              p.post,
              p.gallery,
              p.privacy,
              p.created_at,
              p.updated_at,
              p.count_likes,
              p.count_share,
              p.links_meta,
              p.mentions,
              p.gif
       from posts p
                inner join users u on p.user_id = u.id
       where p.postType in (1, 2, 4, 5)
         and p.id = ?
       order by created_at DESC`,
      [id],
    );

    if (posts && posts.length === 1) {
      let post: PostEntity = posts.pop();
      //post = await this.parsePostStats(post, siteUser);
      post = await this.parsePostEntry(post, siteUser);
      post['id'] = post['hash'];
      return Promise.resolve(post);
    }
    return Promise.resolve(null);
  }

  async parsePoll(post: PostEntity, user: UserEntity): Promise<PostEntity> {
    if (post?.postType === 'poll') {
      const poll = await this.loadPoll(post.poll_id, user.id);
      if (poll) {
        post['poll'] = poll;
      }
    }

    return Promise.resolve(post);
  }

  async loadPoll(pollId, userId): Promise<PollEntity> {
    const poll = await this.pollRepository.findOne({
      where: { id: pollId },
      select: ['id', 'expire_at', 'user_id'],
    });

    if (poll) {
      poll['expireAt'] = poll['expire_at'].toISOString();
      poll['isExpired'] = false;
      if (moment() > moment(poll['expireAt'])) {
        poll['isExpired'] = true;
      }
      delete poll['expire_at'];
      //TODO:: add is voted stats
      const voted = await this.pollVoteRepository.findOne({
        where: { poll_id: pollId, user_id: userId },
      });

      poll['isVoted'] = false;
      if (voted) {
        poll['isVoted'] = true;
      }
      if (poll.user_id === userId) {
        poll['isVoted'] = true;
      }
      delete poll['user_id'];
    }

    if (poll?.id) {
      const questions = await this.pollQuestionRepository.find({
        where: { poll_id: poll.id },
        select: ['id', 'option_text', 'votes'],
      });

      poll['options'] = questions.map((q) => {
        return {
          id: q.id,
          option: q.option_text,
          votes: q.votes,
        };
      });
      return Promise.resolve(poll);
    }
  }

  private async parsePostStats(
    post: PostEntity,
    siteUser: UserEntity,
  ): Promise<any> {
    if (!post) {
      return Promise.resolve(post);
    }
    // const likes_count = await this.postLikesRepository.count({
    //   where: { post_id: post['id'] },
    // });
    //
    // post['count_likes'] = likes_count;
    if (
      !post['count_quote'] ||
      parseInt(post['count_quote'].toString(), 10) === 0 ||
      post['id'].toString().length < 20
    ) {
      const quote_count =
        (await this.postRepository.count({
          where: { parent_post_id: post['id'], postType: postTypeLookup.quote },
        })) ?? 0;
      post['count_quote'] = quote_count;
    }

    if (
      !post['count_share'] ||
      parseInt(post['count_share'].toString(), 10) === 0 ||
      post['id'].toString().length < 20
    ) {
      const shares_count =
        (await this.postRepository.count({
          where: { parent_post_id: post['id'], postType: postTypeLookup.share },
        })) ?? 0;

      post['count_share'] = shares_count;
    }

    if (
      !post['count_comment'] ||
      parseInt(post['count_comment'].toString()) === 0 ||
      post['id'].toString().length < 20
    ) {
      const comment_count =
        (await this.postRepository.count({
          where: {
            parent_post_id: post['id'],
            postType: postTypeLookup.comment,
          },
        })) ?? 0;

      post['count_comment'] = comment_count;
    }

    if (post['postType'] === 'share') {
      post['isRepost'] = true;
    }

    return Promise.resolve(post);
  }

  private async parsePostEntry(post: PostEntity, siteUser: any): Promise<any> {
    post = await this.parsePostStats(post, null);

    try {
      post['user'] = await this.userRepository.findById(
        post['user_id'],
        siteUser,
      );
      post['user_id'] = post['user']['user_hash'];
      post['user']['id'] = post['user']['user_hash'];
    } catch (e) {
      console.log(e);
    }

    // if (post['parent_post_id']) {
    //   post['quoted_post'] = await this.getParentPostById(
    //     post['parent_post_id'],
    //     siteUser,
    //   );
    // }

    if (post['quoted_post']) {
      post['quoted_post']['id'] = post['quoted_post']['hash'];
      delete post['quoted_post']['hash'];

      if (post['quoted_post']['user']) {
        post['quoted_post']['user']['id'] = post['quoted_post']['user']['hash'];
        delete post['quoted_post']['user']['hash'];
        post['quoted_post']['user_id'] = post['quoted_post']['user']['id'];
        post['quoted_post']['parent_post_id'] = null;
        post['parent_post_id'] = post['quoted_post']['id'];
      }
    }
    return Promise.resolve(post);
  }

  async getUserForPostByUserId(userId, siteUser: UserEntity) {
    let postuser: UserEntity = await this.userRepository.findOne(
      String(userId),
    );
    if (postuser) {
      postuser = await this.userRepository.addUserMeta(
        postuser,
        siteUser.id.toString(),
        userId,
      );

      // const isMutedEntry = await this.userRepository.isUserMuted(
      //   siteUser.id.toString(),
      //   userId,
      // );
      //
      // if (isMutedEntry && isMutedEntry.id > 0 && isMutedEntry.status === 1) {
      //   postuser['isMuted'] = true;
      // } else {
      //   postuser['isMuted'] = false;
      // }
      //
      // const isBlockedEntry = await this.userRepository.isUserBlocked(
      //   siteUser.id.toString(),
      //   postuser['id'],
      // );
      // if (
      //   isBlockedEntry &&
      //   isBlockedEntry.id > 0 &&
      //   isBlockedEntry.status === 1
      // ) {
      //   postuser['isBlocked'] = true;
      // } else {
      //   postuser['isBlocked'] = false;
      // }

      postuser = await this.cleanUserObj(postuser, siteUser.id);
      return Promise.resolve(postuser);
    }
  }

  async extractLinksMeta(url: string): Promise<LinkMetaEntity> {
    const existingMeta: LinkMetaEntity = await this.linkMetaRepository.findOne({
      where: { url },
    });
    if (existingMeta && existingMeta.id > 0) {
      return Promise.resolve(existingMeta);
    }
    const meta = await this.urlMeta(url);
    const linkMeta: LinkMetaEntity = new LinkMetaEntity();
    linkMeta.url = url;
    meta['url'] = url;
    linkMeta.meta = JSON.stringify(meta);
    this.linkMetaRepository.save(linkMeta);

    return Promise.resolve(linkMeta);
  }

  async createPollv2(
    title: string,
    userId: number,
    expireAt: string,
  ): Promise<PollEntity> {
    if (userId && userId > 0) {
      const newPoll: PollEntity = new PollEntity();
      newPoll.user_id = userId;
      newPoll.question = title;
      if (expireAt) {
        newPoll.expire_at = expireAt;
      }

      await this.pollRepository.save(newPoll);
      return Promise.resolve(newPoll);
    }
    return Promise.resolve(null);
  }

  async setPollIdOnPost(
    newPost: PostEntity,
    pollId: number,
  ): Promise<PostEntity> {
    try {
      await this.postRepository.update(
        { id: newPost.id, postType: postTypeLookup[newPost.postType] },
        {
          poll_id: pollId,
        },
      );

      await this.postRepository.save(newPost);
      return Promise.resolve(newPost);
    } catch (e) {
      console.log(e);
    }
    return Promise.resolve(null);
  }

  async updatePollv2(user: UserEntity, pollConfig: any, pollId: number) {
    const options: PollOptionEntity[] = await this.pollQuestionRepository.find({
      where: { poll_id: pollId },
    });

    return false;
  }

  async fixPosts(result: any, user: UserEntity, isSinglePost): Promise<any> {
    if (isSinglePost) {
      if (Array.isArray(result)) {
        return await this._fixPost(result.pop(), user);
      } else {
        return await this._fixPost(result, user);
      }
    }

    result = await Promise.all(
      result.map(async (p) => {
        p = await this._fixPost(p, user);
        return p;
      }),
    );

    return Promise.resolve(result);
  }

  private async _fixPost(post: any, user: UserEntity): Promise<any> {
    if (!post) {
      return Promise.resolve(null);
    }
    if (post['id'] === null) {
      return post;
    }

    const entityManager = getManager();
    const thePost = await this.postRepository.findOne({
      where: { hash: post['id'] },
      select: ['id', 'hash', 'user_id', 'privacy'],
    });

    post = await this._parseCanReply(thePost, post, user);

    // const countShared = await this.postRepository.count({
    //   where: { hash: post['parent_post_id'] },
    // });

    const countShared = await entityManager.query(
      `select count(1) c
       from posts mainp
                inner join posts sharedp on sharedp.id = mainp.parent_post_id
       where mainp.postType = 'share'
         and mainp.user_id = ?
         and sharedp.hash = ?
      `,
      [user.id, post['id']],
    );

    post['isReposted'] = false;

    if (post['postType'] === 'post') {
      const realPost = await entityManager.query(
        `select * from posts where hash=?`,
        post['id'],
      );
      const repostedPosts = await entityManager.query(
        `select * from posts where parent_post_id = ?`,
        realPost[0]['id'],
      );

      repostedPosts.forEach((repostedPost) => {
        if (
          repostedPost['user_id'] === user.id ||
          repostedPost['user_id'] === user.hash
        )
          post['isReposted'] = true;
      });
    }

    if (post['user_id'] === user.hash || post['user_id'] === user.id) {
      if (post['postType'] === 'share') {
        post['isReposted'] = true;
      }
      if (parseInt(countShared[0]['c'], 10) > 0) {
        post['isReposted'] = true;

        const sharedPosts = await entityManager.query(
          `select mainp.hash
           from posts mainp
                    inner join posts sharedp on sharedp.id = mainp.parent_post_id
           where mainp.postType = 'share'
             and mainp.user_id = ?
             and sharedp.hash = ?
          `,
          [user.id, post['id']],
        );
        post['repostedId'] = sharedPosts.map((m) => m.hash).pop();
      }
    }

    post['isLiked'] = false;
    const webUserLiked = await this.postLikesRepository.findOne({
      where: {
        post_id: thePost['id'],
        user_id: user.id,
      },
    });

    if (webUserLiked && webUserLiked?.id) {
      post['isLiked'] = true;
    }

    if (post['quoted_post']) {
      const qPost = await this.postRepository.findOne({
        where: { hash: post['quoted_post']['id'] },
        select: ['id', 'hash', 'user_id'],
      });

      const countShared = await entityManager.query(
        `select count(1) c
         from posts mainp
                  inner join posts sharedp on sharedp.id = mainp.parent_post_id
         where mainp.postType = 'share'
           and mainp.user_id = ?
           and sharedp.id = ?
        `,
        [user.id, qPost['id']],
      );

      post['quoted_post']['isReposted'] = false;
      if (qPost) {
        //if (qPost['user_id'] === user.hash || qPost['user_id'] === user.id) {
        if (parseInt(countShared.pop()['c'], 10) > 0) {
          post['quoted_post']['isReposted'] = true;
        }
        //}
      }

      post['quoted_post']['isLiked'] = false;
      const webUserLiked = await this.postLikesRepository.findOne({
        where: {
          post_id: qPost['id'],
          user_id: user.id,
        },
      });

      if (webUserLiked && webUserLiked?.id) {
        post['quoted_post']['isLiked'] = true;
      }
    }

    return post;
  }

  async getPublicPostByHash(postHash: string): Promise<any> {
    const post = await this.postRepository.findOne({
      where: {
        hash: postHash,
      },
    });

    const user: any = await this.userRepository.findOne(
      post.user_id.toString(),
    );

    const removeFromUser = [
      'id',
      'username',
      'password',
      'ava_src',
      'profile_background_url',
      'created_at',
      'followers_count',
      'following_count',
      'reset_token',
      'reset_token_expires_at',
      'birthday',
      'isAdmin',
      'sessionId',
      'email',
    ];
    removeFromUser.map((r) => delete user[r]);

    const removeFromPost = [
      'canReply',
      'status',
      'count_likes',
      'count_share',
      'updated_at',
    ];

    removeFromPost.map((r) => delete post[r]);

    if (post?.parent_post_id) {
      const quotedPost = await this.postRepository.findOne({
        where: {
          id: post.parent_post_id,
        },
      });
      if (quotedPost) {
        removeFromPost.map((r) => delete quotedPost[r]);

        const quotePostUser: any = await this.userRepository.findOne(
          quotedPost.user_id.toString(),
        );

        removeFromUser.map((r) => delete quotePostUser[r]);

        quotePostUser['id'] = quotePostUser['hash'];
        delete quotePostUser['hash'];

        quotedPost['user_id'] = quotePostUser['id'];
        quotedPost['user'] = quotePostUser;

        quotedPost['id'] = quotedPost['hash'];
        post['parent_post_id'] = quotedPost['hash'];
        delete quotedPost['hash'];
        post['quoted_post'] = quotedPost;
      }
    }
    user['id'] = user['hash'];
    delete user['hash'];
    post['user_id'] = user['id'];
    post['user'] = user;

    post['id'] = post['hash'];
    delete post['hash'];

    return Promise.resolve(post);
  }

  private async _parseCanReply(
    thePost: PostEntity,
    post: PostEntity,
    user: UserEntity,
  ): Promise<any> {
    const mentioned = await this.postMentionRepository.count({
      where: {
        post_id: thePost.id,
        mentioned_user_id: user.id,
      },
    });

    if (thePost.privacy === 0) {
      post['canReply'] = true;
      return Promise.resolve(post);
    }
    post['canReply'] = false;

    if (
      thePost.user_id === user.id ||
      (mentioned > 0 && thePost.privacy === 2) ||
      thePost.privacy === 0
    ) {
      post['canReply'] = true;
    }
    if (thePost.privacy !== 2) {
      const doIfollow = await this.followRepoService.isFollowing({
        type: '1',
        user_id: thePost.user_id.toString(),
        followed_user_id: user.id.toString(),
      });

      if (doIfollow) {
        post['canReply'] = true;
      }
    }

    return Promise.resolve(post);
  }

  async canPost(user: UserEntity, parentPostHash: string): Promise<boolean> {
    let post = await this.getPostByhash(parentPostHash, false, true);
    post = await this._parseCanReply(post, post, user);
    return Promise.resolve(post['canReply'] === true);
  }

  async trackShared(user: UserEntity, post: any) {
    const postTemp = await this.getPostByhash(post.id, false, true);
    await this.notifications.trackShare(user, postTemp);
  }

  async trackComment(user: UserEntity, post: PostEntity) {
    const mainPost = await this.postRepository.findOne({
      where: { id: post.parent_post_id },
      select: ['id', 'user_id'],
    });
    await this.notifications.trackComment(
      user.id,
      mainPost.user_id,
      post.parent_post_id,
    );
  }

  async trackQuotes(user: UserEntity, post: PostEntity) {
    const mainPost = await this.postRepository.findOne({
      where: { id: post.parent_post_id },
      select: ['id', 'user_id'],
    });
    const res = await this.notifications.trackQuotes(user.id, mainPost, post);
  }

  async countNewPosts(user: UserEntity, since: number): Promise<any> {
    const entityManager = getManager();

    if (!since) {
      since = moment().add(-30, 'day').unix();
    }

    const posts = await entityManager.query(
      `select count(1) cnt
       from posts p
                inner join users u on p.user_id = u.id
                inner join users_follow uf on p.user_id = uf.followed_user_id
                left join users_mute um on p.user_id = um.muted_user_id
                left join users_block ubp on ubp.blocked_user_id = p.user_id
       where uf.user_id = ?
         and p.postType = 1
         and (um.status != 1 or um.id is null)
         and (ubp.id is null or ubp.status = 0)
         and unix_timestamp(p.updated_at) >= ?
      `,
      [user.id, since],
    );

    return Promise.resolve(posts);
  }

  async usersWhoLiked(
    postHash: string,
    webUser: UserEntity,
    pg = 1,
  ): Promise<UserEntity[]> {
    const entityManager = getManager();

    let users: UserEntity[] = await entityManager.query(
      `    select u.id,
                  u.username,
                  u.displayName,
                  u.bio,
                  u.created_at,
                  u.ava_src,
                  u.hash
           from posts_likes pl
                    inner join posts p on pl.post_id = p.id
                    inner join users u on u.id = pl.user_id
           where p.hash = ? limit ?, ?`,
      [postHash, (pg - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE],
    );

    users = await Promise.all(
      users.map(async (u) => {
        return await this.userRepository.addUserMeta(u, webUser.id, u.id);
      }),
    );

    return Promise.resolve(users);
  }

  async usersWhoShared(
    postHash: string,
    webUser: UserEntity,
    pg = 1,
  ): Promise<UserEntity[]> {
    const entityManager = getManager();

    let users: UserEntity[] = await entityManager.query(
      `    select u.id,
                  u.username,
                  u.displayName,
                  u.bio,
                  u.created_at,
                  u.ava_src,
                  u.hash
           from users u
           where u.id in (select distinct u.id
                          from posts p1
                                   inner join posts p2 on p1.parent_post_id = p2.id
                                   inner join users u on u.id = p1.user_id
                          where p2.hash = ?
                            and p1.postType = 'share') limit ?, ?`,
      [postHash, (pg - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE],
    );

    users = await Promise.all(
      users.map(async (u) => {
        return await this.userRepository.addUserMeta(u, webUser.id, u.id);
      }),
    );

    return Promise.resolve(users);
  }

  async listQuoted(
    postHash: string,
    webUser: UserEntity,
    pg = 1,
  ): Promise<PostEntity[]> {
    const entityManager = getManager();

    let quotePosts = await entityManager.query(
      `select distinct p2.hash
       from posts p
                inner join posts p2 on p2.parent_post_id = p.id
       where p.hash = ?
         and p2.postType = 'quote' limit ?, ?`,
      [postHash, (pg - 1) * SEARCH_PAGE_SIZE, SEARCH_PAGE_SIZE],
    );

    quotePosts = await Promise.all(
      quotePosts.map(async (p: any) => {
        let post = await this.getPostByhash(p?.hash, true);
        post = await this.parsePostEntry(post, webUser);
        return post;
      }),
    );

    return Promise.resolve(quotePosts);
  }
}
