import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { Repository, Like, getConnection, getManager, ILike } from 'typeorm';
import { RegisterUserDto } from './dto/register.user.dto';
import UpdateProfileUserDto from './dto/update.profile.user.dto';
import { BlockEntity } from '../block-repo/entities/block.entity';
import { BlockRepoService } from '../block-repo/block-repo.service';
import { MuteEntity } from '../mute-repo/entities/mute.entity';
import { MuteRepoService } from '../mute-repo/mute-repo.service';
import { InviteUserEntity } from './entities/invite.user.entity';
import { v4 as uuid } from 'uuid';
import { UserSessionEntity } from './entities/user.session.entity';
import { FollowRepoService } from '../follow-repo/follow-repo.service';
import { AddFollowRequestDto } from '../follow-repo/dto/add.follow.request.dto';
import { FollowEntity } from '../follow-repo/entities/follow.entity';
import { FollowTypes } from '../types/follow.types';
import { RedisService } from '../../modules/redis/redis.service';
import * as fs from 'fs';
import { ContactUsEntity } from './entities/contact.us.entity';
import { Exception } from 'handlebars';
import { TokenTypes, UserTokensEntity } from './entities/user.tokens.entity';
import { UserEmojiEntity } from './entities/user.emoji.entity';

const SEARCH_PAGE_SIZE = 20;

@Injectable()
export class UserRepoService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(InviteUserEntity)
    private invitesRepository: Repository<InviteUserEntity>,
    @InjectRepository(UserSessionEntity)
    private userSessionRepository: Repository<UserSessionEntity>,
    private blockRepository: BlockRepoService,
    private muteRepository: MuteRepoService,
    @InjectRepository(FollowEntity)
    private followRepository: Repository<FollowEntity>,
    @InjectRepository(ContactUsEntity)
    private contactUsRepository: Repository<ContactUsEntity>,
    @InjectRepository(UserTokensEntity)
    private userTokensRepository: Repository<UserTokensEntity>,
    @InjectRepository(UserEmojiEntity)
    private userEmojiRepository: Repository<UserEmojiEntity>,

    private redis: RedisService,
  ) {}

  async addUser(newUserDto: RegisterUserDto): Promise<UserEntity> {
    const newUser = new UserEntity();
    newUser.username = newUserDto.login;
    newUser.bio = newUserDto.bio;
    newUser.displayName = newUserDto.name;
    newUser.surname = newUserDto.surname;
    newUser.email = newUserDto.email.trim().toLowerCase();
    newUser.isActive = true;
    newUser.password = newUserDto.password;
    newUser.hash = uuid().toString();

    await this.userRepository.save(newUser);

    return Promise.resolve(newUser);
  }

  async newSession(user: UserEntity): Promise<UserSessionEntity> {
    const existingSession = await this.userSessionRepository.findOne({
      where: { user_id: user.id },
    });

    if (existingSession) {
      return Promise.resolve(existingSession);
    }

    const newSession = new UserSessionEntity();
    newSession.user_id = user.id;
    newSession.session_id = uuid().toString();
    await this.userSessionRepository.save(newSession);

    return Promise.resolve(newSession);
  }

  async getUserBySessionId(sessionId: string): Promise<UserEntity> {
    const existingSession = await this.userSessionRepository.findOne({
      where: { session_id: sessionId },
    });
    if (existingSession) {
      const user: UserEntity = await this.userRepository.findOne({
        where: { id: existingSession.user_id },
      });
      if (user) {
        return Promise.resolve(user);
      }
    }
    return Promise.resolve(null);
  }

  findAll(options?): Promise<UserEntity[]> {
    return this.userRepository.find(options);
  }

  async findOne(id: string): Promise<UserEntity> {
    const cacheKey = `user_${id}`;
    const cached: any = await this.redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    const found = await this.userRepository.findOne({
      where: { id: parseInt(id) },
    });
    await this.redis.set(cacheKey, found, 60);
    return found;
  }

  findByEMail(email: string): Promise<UserEntity> {
    return this.userRepository.findOne({ where: { email: email } });
  }

  findByDisplayName(displayName: string): Promise<UserEntity> {
    return this.userRepository.findOne({ where: { displayName: displayName } });
  }

  listByDisplayNameOrUsername(
    q: string,
    pg: number,
    limit: number,
  ): Promise<UserEntity[]> {
    return this.userRepository.find({
      where: [
        {
          displayName: ILike(`%${q}%`),
        },
        {
          username: ILike(`%${q}%`),
        },
      ],
      select: [
        'id',
        'ava_src',
        'displayName',
        'username',
        'created_at',
        'hash',
        'profile_background_url',
      ],
      order: { created_at: 'DESC' },
      take: limit,
      skip: (pg - 1) * limit,
    });
  }

  async findUserByhash(
    hash: string,
    hashedWith: string,
    siteUserId?: number,
  ): Promise<UserEntity> {
    const cacheKey = `user_${hash}`;
    const cached: any = await this.redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    const entityManager = getManager();
    const user: UserEntity[] = await entityManager.query(
      `select *
       from users
       where hash = ? limit 1`,
      [hash],
    );

    if (user && user.length === 1) {
      const found = user[0];
      if (siteUserId) {
        const isFollowed = await this.isFollowing({
          user_id: siteUserId.toString(),
          followed_user_id: user[0]['id'].toString(),
          type: '1',
        });
        found['isFollowed'] = isFollowed;
      }
      await this.redis.set(cacheKey, found, 60);

      return Promise.resolve(found);
    }

    return Promise.resolve(null);
  }

  async findUnfollowedPostCommenters(
    postHash: string,
    userId,
  ): Promise<UserEntity[]> {
    const entityManager = getManager();
    const query =
      'select id, username, displayName, email, bio, ' +
      'ava_src, profile_background_url , followers_count, following_count, created_at, updated_at from users u inner join ( ' +
      'select distinct user_id from posts_comments ' +
      "where md5(concat('POSTID:',post_id)) = ? ) commenters on commenters.user_id = u.id " +
      'where commenters.user_id not in ( select followed_user_id from users_follow where user_id = ?)' +
      ' and u.id != ?' +
      '';

    const memberList = await entityManager.query(query, [
      postHash.split('-')[0],
      userId,
      userId,
    ]);

    return Promise.resolve(memberList);
  }

  async findUnfollowedAllPostFollows(userId): Promise<UserEntity[]> {
    const entityManager = getManager();
    const query =
      ' select u.* from users_follow uf ' +
      ' left join users_follow my_following on my_following.user_id = 30 ' +
      ' inner join users u on uf.user_id = u.id ' +
      ' where ' +
      '      uf.followed_user_id = ? ' +
      ' and my_following.user_id is null ';

    const user: UserEntity = new UserEntity();
    const memberList = await entityManager.query(query, [userId]);
    memberList.map((m) => {
      user.id = m['id'];
      m['id'] = user.getIdAsHash();
    });

    return Promise.resolve(memberList);
  }

  async findUnfollowedUsers(userId, pg): Promise<UserEntity[]> {
    if (!pg) {
      pg = 1;
    }
    const entityManager = getManager();
    const query =
      ' select u.* ' +
      ' from users u ' +
      ' where u.id not in (  select followed_user_id  from users_follow where user_id = ? ) ' +
      ' and u.id != ? ' +
      ' limit ?, ? ';

    const user: UserEntity = new UserEntity();
    const memberList = await entityManager.query(query, [
      userId,
      userId,
      (pg - 1) * SEARCH_PAGE_SIZE,
      SEARCH_PAGE_SIZE,
    ]);
    await Promise.all(
      memberList.map(async (m) => {
        const isFollow = await this.isFollowing({
          type: 'follow',
          user_id: userId,
          followed_user_id: m['id'],
        });

        m['isFollowed'] = isFollow;

        m['id'] = m['hash']; // user.getIdAsHash();

        delete m['hash'];
        delete m['password'];
        delete m['reset_token'];
        delete m['reset_token_expires_at'];
        delete m['isAdmin'];
        delete m['sessionId'];
      }),
    );

    return Promise.resolve(memberList);
  }

  async findUnfollowedPostSharers(
    postHash: string,
    userId,
  ): Promise<UserEntity[]> {
    const entityManager = getManager();
    const query =
      'select id, username, displayName, email, bio, ' +
      'ava_src, profile_background_url , followers_count, following_count, created_at, updated_at from users u ' +
      'inner join ( ' +
      " select user_id from posts where md5(concat('POSTID:',parent_post_id)) = ? " +
      ' ) sharers on sharers.user_id = u.id ' +
      ' where sharers.user_id not in ( ' +
      ' select followed_user_id from users_follow where user_id = ?    ) and u.id != ?';

    const memberList = await entityManager.query(query, [
      postHash.split('-')[0],
      userId,
      userId,
    ]);

    return Promise.resolve(memberList);
  }

  async findUnfollowedPostLikers(
    postHash: string,
    userId,
  ): Promise<UserEntity[]> {
    const entityManager = getManager();
    const query =
      'select id, username, displayName, email, bio, ' +
      'ava_src, profile_background_url , followers_count, following_count, created_at, updated_at from users u ' +
      ' inner join (  select user_id from posts_likes where md5(concat("POSTID:",post_id)) = ? ) likers on likers.user_id = u.id ' +
      'where likers.user_id not in (      select followed_user_id from users_follow where user_id = ?  ) and u.id != ? ';

    const memberList = await entityManager.query(query, [
      postHash.split('-')[0],
      userId,
      userId,
    ]);

    return Promise.resolve(memberList);
  }

  async loadByUsername(username: string): Promise<UserEntity> {
    const user: UserEntity = await this.userRepository.findOne({
      where: { username: username },
    });
    return Promise.resolve(user);
  }

  async findByUsername(username: string): Promise<UserEntity> {
    const cacheKey = `username_${username}`;
    const cached: any = await this.redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    // have to add isAdmin flag here...
    const found = await getConnection()
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .select([
        'user.id id',
        'user.username username',
        'user.hash hash',
        'user.displayName displayName',
        'user.email email',
        'user.bio bio',
        'user.password password',
        'user.isActive isActive',
        'user.created_at created_at',
        'user.updated_at updated_at',
        'user.ava_src ava_src',
        'user.isAdmin isAdmin',
        'user.profile_background_url profile_background_url',
        'user.birthday birthday',
        `(select count(1) from users_follow where user_id = user.id and type =1) following_count`,
        `(select count(1) from users_follow where followed_user_id = user.id and type =1) followers_count`,
      ])
      .where('user.username = :login ', {
        login: `${username}`,
      })
      //.leftJoin('users_block', 'blocked', 'blocked.blocked_user_id = user.id')
      .getRawOne();

    await this.redis.set(cacheKey, found, 60);

    return found;
    // and (blocked.status != 1 or blocked.status is null)
    // return this.userRepository.findOne({ where: { username: username } });
  }

  // to be used with user lookup for posts
  async findById(
    userId: string | number,
    siteUser: UserEntity,
  ): Promise<UserEntity> {
    let userDat = await getConnection()
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .select([
        'user.id id',
        'user.username username',
        'user.displayName displayName',
        'user.bio bio',
        'user.isActive isActive',
        'user.created_at created_at',
        'user.ava_src ava_src',
        'user.profile_background_url profile_background_url',
        'user.birthday birthday',
        'user.hash',
        `(select count(1) from users_follow where user_id = user.id and type =1) following_count`,
        `(select count(1) from users_follow where followed_user_id = user.id and type =1) followers_count`,
      ])
      .where('user.id = :id', {
        id: `${userId}`,
      })
      .getRawOne();

    userDat = await this.addUserMeta(
      userDat,
      siteUser['id'].toString(),
      userDat['id'],
    );

    // const isMuted = await this.isUserMuted(
    //   siteUser['id'].toString(),
    //   userDat['id'],
    // );
    // userDat['isMuted'] = false;
    // if (isMuted && isMuted.status === 1) {
    //   userDat['isMuted'] = true;
    // }
    //
    // const isBlocked = await this.isUserBlocked(
    //   siteUser.id.toString(),
    //   userDat['id'],
    // );
    // userDat['isBlocked'] = false;
    // if (isBlocked && isBlocked.status === 1) {
    //   userDat['isBlocked'] = true;
    // }
    // userDat['isFollowed'] = await this.isFollowing({
    //   user_id: siteUser.id.toString(),
    //   followed_user_id: userDat['id'],
    //   type: '1',
    // });
    //   "isFollowed": false
    return Promise.resolve(userDat);
  }

  async findAllUsers(userId): Promise<UserEntity[]> {
    const list = await getConnection()
      .getRepository(UserEntity)
      .createQueryBuilder('user')
      .select([
        ...[
          'user.id id',
          'username',
          'displayName',
          'email',
          'bio',
          'ava_src',
          'profile_background_url',
          'user.created_at created_at',
          'user.updated_at updated_at',
        ],
        `if( (select count(1) from users_follow where user_id = ${userId} and followed_user_id = user.id) > 0, true, false) isFollowing`,
        `(select count(1) from users_follow where user_id = user.id and type =1) following_count`,
        `(select count(1) from users_follow where followed_user_id = user.id and type =1) followers_count`,
      ])
      .leftJoin('users_block', 'blocked', 'blocked.blocked_user_id = user.id')
      .orderBy('user.created_at', 'DESC')
      .limit(100)
      .getRawMany();

    return Promise.resolve(list);
  }

  async updatePassword(email, password): Promise<UserEntity> {
    const existingUser = await this.findByEMail(email);
    if (existingUser && existingUser.isActive && existingUser.id > 0) {
      existingUser.password = password;
      await this.userRepository.save(existingUser);
      return Promise.resolve(existingUser);
    }
    return Promise.resolve(null);
  }

  async remove(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  async updateUserProfile(body: UpdateProfileUserDto, user?: UserEntity) {
    const existingUser = await this.findOne(user.id.toString());
    existingUser.bio = body.bio;
    existingUser.displayName = body.name;

    if (
      body?.email &&
      body.email.trim().toLowerCase() !==
        existingUser.email.trim().toLowerCase()
    ) {
      const doesEmailExist = await this.existingEmail(
        body.email.trim().toLowerCase(),
      );
      if (doesEmailExist === false) {
        existingUser.email = body.email.trim().toLowerCase();
      } else {
        throw new HttpException(
          'Email address belongs to another user',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (body.raw_ava_src) {
      if (
        body.raw_ava_src.indexOf('http://') === -1 &&
        body.raw_ava_src.indexOf('https://') === -1
      ) {
        existingUser.ava_src = await this.saveProfileBannerImage(
          body.raw_ava_src,
        );
        existingUser.ava_src = `${process.env.IMAGES_URL}${existingUser.ava_src}`;
      }
    }

    if (body.raw_profile_background) {
      if (
        body.raw_profile_background.indexOf('http://') === -1 &&
        body.raw_profile_background.indexOf('https://') === -1
      ) {
        existingUser.profile_background_url = await this.saveProfileBannerImage(
          body.raw_profile_background,
        );
        existingUser.profile_background_url = `${process.env.IMAGES_URL}${existingUser.profile_background_url}`;
      }
    }

    // existingUser.ava_src = body.ava_src;
    // existingUser.profile_background_url = body.profile_background_url;
    //existingUser.birthday = body.birthday;
    await this.userRepository.save(existingUser);

    return existingUser;
  }

  private async saveProfileBannerImage(rawImageData: string): Promise<string> {
    fs.access('public/profiles', (err) => {
      if (err) {
        try {
          fs.mkdirSync('public/profiles');
        } catch (e) {}
      }
    });

    fs.access('public/profiles/img', (err) => {
      if (err) {
        try {
          fs.mkdirSync('public/profiles/img');
        } catch (e) {}
      }
    });

    const imageMime = ['png', 'jpg', 'jpeg', 'gif', 'svg'];

    const newFile = uuid().toString();
    const baseDir = `public/profiles/img`.split('/');

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

    const sample = rawImageData.substring(0, 50);
    const content = rawImageData.split(',')[1];
    const ftype = sample.split(';')[0].split('/').pop();

    let newImagename;
    if (imageMime.indexOf(ftype.toLowerCase()) > -1) {
      newImagename = `${nf}.${ftype.toLowerCase()}`;
      const buf = Buffer.from(content, 'base64');
      fs.writeFileSync(newImagename, buf);

      // img.attribs['src'] = newImagename.substring(6);
      newImagename = newImagename.substring(6);
    }
    return Promise.resolve(newImagename);
  }

  async setUserPassword(user: UserEntity, newPwd: string) {
    user.password = newPwd;
    await this.userRepository.save(user);
    return user;
  }

  async filterByUsername(
    login: string,
    limit: number,
    selectCols?: string[],
    userId?: number,
  ): Promise<UserEntity[]> {
    let found: UserEntity[];
    if (selectCols) {
      try {
        // const found2 = await this.userRepository
        //   .createQueryBuilder('user')
        //   .where('user.displayName like "%:displayName%"', {
        //     displayName: login,
        //   })
        //   .getMany();
        found = await getConnection()
          .getRepository(UserEntity)
          .createQueryBuilder('user')
          .select([
            ...selectCols,
            `if( (select count(1) from users_follow where user_id = ${userId} and followed_user_id = user.id) > 0, true, false) isFollowing`,
          ])
          .where(
            'user.displayName like :login and (blocked.status != 1 or blocked.status is null)',
            {
              login: `%${login}%`,
            },
          )
          .leftJoin(
            'users_block',
            'blocked',
            'blocked.blocked_user_id = user.id',
          )
          .limit(limit)
          .getRawMany();
      } catch (e) {
        console.log(e.getMessage());
        console.log(e);
      }
    } else {
      found = await this.userRepository.find({
        where: { displayName: Like(`%${login}%`) },
        take: limit,
      });
    }
    if (found && found.length > 0) {
      const founded = await Promise.all(
        found.map(async (f: any) => {
          f = await this.addUserMeta(f, userId.toString(), f['id']);

          // const isMutedEntry = await this.isUserMuted(
          //   userId.toString(),
          //   f['id'],
          // );
          // if (
          //   isMutedEntry &&
          //   isMutedEntry.id > 0 &&
          //   isMutedEntry.status === 1
          // ) {
          //   f['isMuted'] = true;
          // } else {
          //   f['isMuted'] = false;
          // }
          //
          // const isBlockedEntry = await this.isUserBlocked(
          //   userId.toString(),
          //   f['id'],
          // );
          // if (
          //   isBlockedEntry &&
          //   isBlockedEntry.id > 0 &&
          //   isBlockedEntry.status === 1
          // ) {
          //   f['isBlocked'] = true;
          // } else {
          //   f['isBlocked'] = false;
          // }

          f['id'] = f['hash'];
          delete f['hash'];
        }),
      );

      return Promise.resolve(found);
    }
  }

  async isUserBlocked(
    siteUserId: string,
    user_id: number | string,
  ): Promise<BlockEntity> {
    // this.userService.isUserBlocked(siteUserId,  foundUser.id);
    const blocked: BlockEntity = await this.blockRepository.getBlockedByUser(
      parseInt(siteUserId),
      user_id,
    );
    return Promise.resolve(blocked);
  }

  async isUserMuted(siteUserId: string, user_id): Promise<MuteEntity> {
    const muted: MuteEntity = await this.muteRepository.findMutedForUser(
      siteUserId,
      user_id,
    );
    return Promise.resolve(muted);
  }

  async toggleMute(userId: number, mutedUserId: number): Promise<any> {
    try {
      const existingMute: MuteEntity[] = await this.muteRepository.find({
        where: {
          user_id: userId,
          muted_user_id: mutedUserId,
        },
      });
      let message = 'Muted User';

      if (existingMute && existingMute.length === 0) {
        const newMute = new MuteEntity();
        newMute.user_id = userId;
        newMute.muted_user_id = mutedUserId;
        newMute.status = 1;
        await this.muteRepository.save(newMute);
      } else {
        const exMute: MuteEntity = existingMute[0];
        exMute.status = exMute.status === 1 ? 0 : 1;
        await this.muteRepository.save(exMute);
        if (exMute.status === 0) {
          message = 'Unmuted User';
        }
      }

      return Promise.resolve({ result: true, message });
    } catch (e) {
      console.log('Error saving mute action');
      console.log(e);
    }
    return Promise.resolve({ result: false, message: 'Error muting user' });
  }

  async getMutesAndBlocks(userId) {
    const entityManager = getManager();
    const userList = await entityManager.query(
      'select md5(concat("MUTED:",id)) id, ' +
        '       muted_user_id profile_id, ' +
        '       "muted"       reason, ' +
        '       updated_at ' +
        ' from users_mute where user_id = ? ' +
        ' union ' +
        ' select md5(concat("BLOCKED:",id)) id, ' +
        '       blocked_user_id profile_id, ' +
        '       "blocked"       reason, ' +
        '       updated_at' +
        ' from users_block ' +
        ' where user_id = ?',
      [userId, userId],
    );
    return userList;
  }

  async unMute(
    member_id: string,
    user_id: string,
    id: string,
  ): Promise<boolean> {
    let result = false;
    try {
      const entityManager = getManager();
      const mutedList = await entityManager.query(
        'select * from users_mute where md5(concat("USER:",user_id)) = ? and md5(concat("MUTED:",id)) = ? and md5(concat("USER:",muted_user_id)) = ?',
        [member_id, id, user_id],
      );
      if (mutedList) {
        mutedList.map(async (m) => {
          const found: MuteEntity[] = await this.muteRepository.find({
            where: { id: m['id'] },
            take: 1,
          });
          found.map(async (mm) => {
            await this.muteRepository.remove(mm);
          });
        });
      }
      result = true;
    } catch (error) {
      console.log('Error removing muted entries');
    }
    return Promise.resolve(result);
  }

  async unBlock(member_id: string, user_id: string, id: string) {
    let result = false;
    try {
      const entityManager = getManager();
      const blockedList = await entityManager.query(
        'select * from users_block where md5(concat("USER:",user_id)) = ? and md5(concat("BLOCKED:",id)) = ? and md5(concat("USER:",blocked_user_id)) = ?',
        [member_id, id, user_id],
      );
      if (blockedList) {
        blockedList.map(async (m) => {
          const found: BlockEntity[] = await this.blockRepository.find({
            where: { id: m['id'] },
            take: 1,
          });
          found.map(async (mm) => {
            await this.blockRepository.remove(mm);
          });
        });
      }
      result = true;
    } catch (error) {
      console.log('Error removing blocked entries');
      console.log(error);
    }
    return Promise.resolve(result);
  }

  async listUsersToMention(member_id: string, search: string): Promise<any[]> {
    const entityManager = getManager();
    // const memberList = await entityManager.query(
    //   'select u.displayName from users_follow f ' +
    //     'inner join users u on f.user_id = u.id ' +
    //     'where followed_user_id = ? and displayName like ?',
    //   [member_id, `%${search}%`],
    // );
    const memberList = await entityManager.query(
      'select u.displayName ' +
        ' from users_follow f inner join users u on f.user_id = u.id ' +
        ' where followed_user_id = ? ' +
        ' and displayName like ? ' +
        ' union ' +
        ' select u.displayName ' +
        ' from users_follow f inner join users u on f.user_id = ? ' +
        ' where displayName like ? ',
      [member_id, `%${search}%`, member_id, `%${search}%`],
    );
    return Promise.resolve(memberList);
  }

  async listInviteCodes(): Promise<string[]> {
    const codes = await this.invitesRepository.find({
      where: { isActive: true },
      take: 100,
    });
    return Promise.resolve(codes.map((c) => c.invite_code));
  }

  async createInviteCode(qty?: number): Promise<InviteUserEntity[]> {
    if (qty === null || qty === 0) {
      qty = 1;
    }

    const codes: InviteUserEntity[] = [];
    for (let i = 0; i < qty; i++) {
      const newcode = new InviteUserEntity();
      newcode.invite_code = uuid().toString();
      await this.invitesRepository.save(newcode);
      codes.push(newcode);
    }

    return Promise.resolve(codes);
  }

  async loadInviteCode(invite_code: string): Promise<InviteUserEntity> {
    const existingCode: InviteUserEntity = await this.invitesRepository.findOne(
      { where: { invite_code: invite_code, isActive: true } },
    );
    if (existingCode && existingCode.id > 0) {
      return Promise.resolve(existingCode);
    }
    return Promise.resolve(null);
  }

  async useInviteCode(inviteCodeEntry: InviteUserEntity) {
    inviteCodeEntry.isActive = false;
    await this.invitesRepository.save(inviteCodeEntry);
  }

  async existingUsername(login: string): Promise<boolean> {
    const user: UserEntity = await this.userRepository.findOne({
      where: { username: login },
    });

    if (user && user.id > 0) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  async existingEmail(email: string): Promise<boolean> {
    const user: UserEntity = await this.userRepository.findOne({
      where: { email: email.trim().toLowerCase() },
    });

    if (user && user.id > 0) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  async search(user: UserEntity, userName: string): Promise<any> {
    const sql = `
        select u.hash id,
               u.username,
               u.displayName,
               u.ava_src
        from users_follow
                 inner join users u on users_follow.user_id = u.id
        where followed_user_id = ?
          and (lower(u.username) like ? or lower(u.displayName) like ?)
        union
        select u.hash id,
               u.username,
               u.displayName,
               u.ava_src
        from users_follow
                 inner join users u on users_follow.followed_user_id = u.id
        where user_id = ?
          and (lower(u.username) like ? or lower(u.displayName) like ?)

    `;

    const found = await this.userRepository.query(sql, [
      user.id,
      `%${userName.toLowerCase()}%`,
      `%${userName.toLowerCase()}%`,
      user.id,
      `%${userName.toLowerCase()}%`,
      `%${userName.toLowerCase()}%`,
    ]);

    return Promise.resolve(found);
  }

  async searchPeople(
    q: string,
    pg: number,
    user: UserEntity,
    limit: number,
  ): Promise<any> {
    if (!pg) {
      pg = 1;
    }
    if (!limit) {
      limit = 20;
    }

    const users = await this.listByDisplayNameOrUsername(q, pg, limit);

    const res = await Promise.all(
      users.map(async (u) => {
        u = await this.addUserMeta(u, user.id.toString(), u['id']);
        // const isFollow = await this.isFollowing({
        //   type: 'follow',
        //   user_id: user.id.toString(),
        //   followed_user_id: u['id'].toString(),
        // });
        //
        // u['isFollowed'] = isFollow;
        //
        // const isMutedEntry = await this.isUserMuted(
        //   user.id.toString(),
        //   u['id'],
        // );
        // if (isMutedEntry && isMutedEntry.id > 0 && isMutedEntry.status === 1) {
        //   u['isMuted'] = true;
        // } else {
        //   u['isMuted'] = false;
        // }
        //
        // const isBlockedEntry = await this.isUserBlocked(
        //   user.id.toString(),
        //   u['id'],
        // );
        // if (
        //   isBlockedEntry &&
        //   isBlockedEntry.id > 0 &&
        //   isBlockedEntry.status === 1
        // ) {
        //   u['isBlocked'] = true;
        // } else {
        //   u['isBlocked'] = false;
        // }

        if (u['id'] === user.id) {
          u['mine'] = true;
        }
        u['user_id'] = u.getIdAsHash();
        delete u['id'];
      }),
    );

    return Promise.resolve(users);
  }

  async searchTopPost(q: string, pg: number, user: UserEntity): Promise<any> {}

  async isFollowing(body: AddFollowRequestDto): Promise<boolean> {
    const following: FollowEntity = await this.followRepository.findOne({
      where: {
        user_id: parseInt(body.user_id),
        followed_user_id: parseInt(body.followed_user_id),
        type: FollowTypes.TYPE_FOLLOW,
      },
    });
    if (following && following.id > 0) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }

  async getFollowingCount(userId): Promise<number> {
    const entityManager = getManager();
    const cnt = await entityManager.query(
      `select count(1) cnt
                                           from users_follow
                                           where user_id = ?
                                             and type = 1`,
      [userId],
    );
    const found = cnt.pop();
    return Promise.resolve(parseInt(found?.cnt));
  }

  async getFollowersCount(userId): Promise<number> {
    const entityManager = getManager();
    const cnt = await entityManager.query(
      `select count(1) cnt
                                           from users_follow
                                           where followed_user_id = ?
                                             and type = 1`,
      [userId],
    );
    const found = cnt.pop();
    return Promise.resolve(parseInt(found?.cnt));
  }

  async addUserMeta(userObj: any, siteUserId, userId): Promise<any> {
    if (!userObj['following_count']) {
      userObj['following_count'] = await this.getFollowingCount(userId);
    }

    if (!userObj['followers_count']) {
      userObj['followers_count'] = await this.getFollowersCount(userId);
    }

    const isMutedEntry: MuteEntity = await this.isUserMuted(siteUserId, userId);

    userObj['isMuted'] = false;
    if (isMutedEntry && isMutedEntry.id > 0 && isMutedEntry.status === 1) {
      // return Promise.resolve(null);
      userObj['isMuted'] = true;
    }

    const isBlockedEntry: BlockEntity = await this.isUserBlocked(
      siteUserId,
      userId,
    );

    userObj['isBlocked'] = false;
    if (
      isBlockedEntry &&
      isBlockedEntry.id > 0 &&
      isBlockedEntry.status === 1
    ) {
      // return Promise.resolve(null);
      userObj['isBlocked'] = true;
    }

    userObj['isFollowed'] = await this.isFollowing({
      user_id: siteUserId.toString(),
      followed_user_id: userId.toString(),
      type: '1',
    });

    userObj['isFollowingMe'] = await this.isFollowing({
      user_id: userId.toString(),
      followed_user_id: siteUserId.toString(),
      type: '1',
    });

    return Promise.resolve(userObj);
  }

  async mentnionList(siteUserId: number, search: string) {
    const found = await this.filterByUsername(
      search,
      5,
      [
        'user.id id',
        'user.hash hash',
        'displayName',
        'email',
        'ava_src',
        'username',
      ],
      siteUserId,
    );

    return Promise.resolve(found);
  }

  async inviteFriend(
    invitorId: number,
    name: string,
    email: string,
  ): Promise<InviteUserEntity> {
    const inviteCode: InviteUserEntity = (
      await this.createInviteCode(1)
    )?.pop();
    if (inviteCode && inviteCode.id > 0) {
      inviteCode.friend_email = email;
      inviteCode.friend_name = name;
      inviteCode.invitor_user_id = invitorId;
      await this.invitesRepository.save(inviteCode);

      return Promise.resolve(inviteCode);
    }
    return Promise.resolve(null);
  }

  async autoFriendInvitor(
    inviteCodeEntry: InviteUserEntity,
    newUser: UserEntity,
  ): Promise<any> {
    if ([2, 4, 5].indexOf(inviteCodeEntry.invitor_user_id) === -1) {
      const follow: FollowEntity = new FollowEntity();
      follow.user_id = newUser.id;
      follow.followed_user_id = inviteCodeEntry.invitor_user_id;
      follow.type = FollowTypes.TYPE_FOLLOW;
      await this.followRepository.save(follow);
    }

    const follow2: FollowEntity = new FollowEntity();
    follow2.user_id = inviteCodeEntry.invitor_user_id;
    follow2.followed_user_id = newUser.id;
    follow2.type = FollowTypes.TYPE_FOLLOW;
    await this.followRepository.save(follow2);
  }

  async addContactUsMessage(
    contactName: string,
    contactEmail: string,
    message: string,
  ): Promise<ContactUsEntity> {
    try {
      const contactUs = new ContactUsEntity();
      contactUs.name = contactName;
      contactUs.email = contactEmail;
      contactUs.message = message;
      await this.contactUsRepository.save(contactUs);
      return Promise.resolve(contactUs);
    } catch (e) {
      console.log('Error saving contact us');
      console.log(e);
    }
    return Promise.resolve(null);
  }

  async addUserToken(
    user: UserEntity,
    tokenType: string,
    token: string,
  ): Promise<UserTokensEntity> {
    const currentUserToken = await this.userTokensRepository.findOne({
      where: { user_id: user.id, type: '1' },
    });

    if (currentUserToken && token) {
      currentUserToken.value = token;
      await this.userTokensRepository.save(currentUserToken);
      return Promise.resolve(currentUserToken);
    }

    const newToken = new UserTokensEntity();
    newToken.user_id = user.id;
    newToken.type = tokenType;
    newToken.value = token;
    await this.userTokensRepository.save(newToken);

    return Promise.resolve(newToken);
  }

  async getUserToken(user: UserEntity, tokenType: string) {
    const tokenTypes = {
      FCM: 1,
    };
    const currentUserToken = await this.userTokensRepository.findOne({
      where: { user_id: user.id, type: tokenTypes[tokenType.toUpperCase()] },
    });
    if (currentUserToken) {
      return Promise.resolve(currentUserToken.value);
    }
    return Promise.resolve(null);
  }

  async userAddEmoji(
    user: UserEntity,
    url: string,
    name: string,
  ): Promise<UserEmojiEntity> {
    const newMojis: number = await this.userEmojiRepository.count({
      where: {
        user_id: user.id,
      },
    });

    if (newMojis < 6) {
      const newMoji: UserEmojiEntity = new UserEmojiEntity();
      newMoji.user_id = user.id;
      newMoji.url = url;
      newMoji.name = name;
      await this.userEmojiRepository.save(newMoji);
      return Promise.resolve(newMoji);
    }

    return Promise.resolve(null);
  }

  async getEmojiByName(
    user: UserEntity,
    name: string,
  ): Promise<UserEmojiEntity> {
    const newMoji: UserEmojiEntity = await this.userEmojiRepository.findOne({
      where: {
        name: Like(`%${name}%`),
      },
    });
    return Promise.resolve(newMoji);
  }

  async getEmojiWithName(
    user: UserEntity,
    name: string,
  ): Promise<UserEmojiEntity> {
    const newMoji: UserEmojiEntity = await this.userEmojiRepository.findOne({
      where: {
        name: name,
      },
    });
    return Promise.resolve(newMoji);
  }

  async getUserEmojis(user: UserEntity) {
    const newMoji: UserEmojiEntity[] = await this.userEmojiRepository.find({
      where: {
        user_id: user.id,
      },
    });
    return Promise.resolve(newMoji);
  }

  async getUserEmojisCount(user: UserEntity) {
    const newMoji: number = await this.userEmojiRepository.count({
      where: {
        user_id: user.id,
      },
    });

    return Promise.resolve(newMoji);
  }

  async delEmoji(user: UserEntity, name: string): Promise<boolean> {
    const emoji: UserEmojiEntity = await this.userEmojiRepository.findOne({
      where: {
        user_id: user.id,
        name,
      },
    });
    if (emoji) {
      await this.userEmojiRepository.delete({ id: emoji.id });
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }
}
