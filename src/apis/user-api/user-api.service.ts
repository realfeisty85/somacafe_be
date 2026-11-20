import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserRepoService } from '../../repositories/user-repo/user-repo.service';
import { RegisterUserDto } from '../../repositories/user-repo/dto/register.user.dto';
import { LoginUserDto } from '../../repositories/user-repo/dto/login.user.dto';
import { SecurityService } from '../../modules/security/security.service';
import { LoggedInUserDto } from '../../repositories/user-repo/dto/loggedIn.user.dto';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';
import GetUserDto from '../../repositories/user-repo/dto/get.user.dto';
import ProfileUserDto from '../../repositories/user-repo/dto/profile.user.dto';
import UpdateProfileUserDto from '../../repositories/user-repo/dto/update.profile.user.dto';
import GetDisplayNameUserDto from '../../repositories/user-repo/dto/get.displayName.user.dto';
import GetUsernameUserDto from '../../repositories/user-repo/dto/get.username.user.dto';
import { BlockEntity } from '../../repositories/block-repo/entities/block.entity';
import { MuteEntity } from '../../repositories/mute-repo/entities/mute.entity';
import { MailService } from '../../modules/mail/mail.service';
import { InviteUserEntity } from '../../repositories/user-repo/entities/invite.user.entity';
import { FollowRepoService } from '../../repositories/follow-repo/follow-repo.service';
import { ApiHeader } from '@nestjs/swagger';
import GetByUserHashDto from '../../repositories/user-repo/dto/get.userhash.user.dto';
import { ContactUsEntity } from '../../repositories/user-repo/entities/contact.us.entity';
import { UserTokensEntity } from '../../repositories/user-repo/entities/user.tokens.entity';
import { JwtService } from '@nestjs/jwt';
import { FollowEntity } from '../../repositories/follow-repo/entities/follow.entity';
import { FollowTypes } from '../../repositories/types/follow.types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as sharp from 'sharp';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';
import { UserEmojiEntity } from '../../repositories/user-repo/entities/user.emoji.entity';
import { Exception } from 'handlebars';

@ApiHeader({
  name: 'Authorization',
  description: 'Auth header',
})
@Injectable()
export class UserApiService {
  constructor(
    private userService: UserRepoService,
    @InjectRepository(FollowEntity)
    private followRepository: Repository<FollowEntity>,
    private readonly securityService: SecurityService,
    private readonly mailService: MailService,
    private followService: FollowRepoService,
    private readonly jwtService: JwtService,
  ) {}

  getUserRepo(): UserRepoService {
    return this.userService;
  }

  async addUser(newUserDto: RegisterUserDto): Promise<UserEntity> {
    if (await this.userService.existingEmail(newUserDto.email)) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Duplicate user exists',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // dont allow whitespace in login
    newUserDto.login = newUserDto.login.replace(' ', '');

    if (await this.userService.existingUsername(newUserDto.login)) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Duplicate user exists',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    newUserDto.password = this.securityService.encryptText(newUserDto.password);

    const newUser: UserEntity = await this.userService.addUser(newUserDto);
    if (newUser) {
      if (newUserDto?.invite_code) {
        const inviteCodeEntry: InviteUserEntity =
          await this.userService.loadInviteCode(newUserDto.invite_code);
        if (inviteCodeEntry && inviteCodeEntry.id > 0) {
          this.userService.useInviteCode(inviteCodeEntry);
          this.userService.autoFriendInvitor(inviteCodeEntry, newUser);
        }
      }

      Promise.all(
        [2, 4, 5, 105].map(async (id) => {
          const follow2: FollowEntity = new FollowEntity();
          follow2.user_id = newUser.id;
          follow2.followed_user_id = id;
          follow2.type = FollowTypes.TYPE_FOLLOW;
          this.followRepository.save(follow2);
        }),
      );

      return Promise.resolve(newUser);
    } else {
      console.log(`Invalid invite code`);
      throw new HttpException(
        {
          status: HttpStatus.FORBIDDEN,
          error: 'Invalid invite code',
        },
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async login(loginUserDto: LoginUserDto): Promise<LoggedInUserDto> {
    const foundUser: UserEntity = await this.userService.findByEMail(
      loginUserDto.email,
    );

    const user: LoggedInUserDto = new LoggedInUserDto();
    let isValidPassword = false;
    if (foundUser) {
      isValidPassword = this.securityService.comparePassword(
        loginUserDto.password,
        foundUser.password,
      );
      if (isValidPassword) {
        user.login = foundUser.displayName;
        user.name = foundUser.username;
        user.id = foundUser.id;
        user.ava_src = foundUser.ava_src;
      }
    }

    return Promise.resolve(user);
  }

  async getProfileById(query: GetUserDto): Promise<ProfileUserDto> {
    let foundUser: ProfileUserDto = await this.userService.findOne(
      query.userId,
    );

    if (foundUser && foundUser.id > 0) {
      foundUser = this.cleanProfile(foundUser);
      foundUser['followers_count'] = await this.getFollowerStats(
        parseInt(query.userId),
      );
      foundUser['following_count'] = await this.getFollowingStats(
        parseInt(query.userId),
      );
      return Promise.resolve(foundUser);
    }

    return Promise.resolve(null);
  }

  async getProfileByUserHash(
    query: GetByUserHashDto,
    cleaned = true,
    user?: UserEntity,
  ): Promise<ProfileUserDto> {
    let foundUser: ProfileUserDto;
    if (!query.pg) {
      query.pg = 1;
    }
    if (user) {
      foundUser = await this.userService.findUserByhash(
        query.userHash,
        'USERID:',
        user['id'],
      );
    } else {
      foundUser = await this.userService.findUserByhash(
        query.userHash,
        'USERID:',
      );
    }

    if (foundUser && foundUser.id > 0) {
      if (typeof foundUser.id === 'string') {
        foundUser.followers_count = await this.getFollowerStats(
          parseInt(foundUser.id),
        );
        foundUser.following_count = await this.getFollowingStats(
          parseInt(foundUser.id),
        );
      } else {
        foundUser.followers_count = await this.getFollowerStats(foundUser.id);
        foundUser.following_count = await this.getFollowingStats(foundUser.id);
      }

      if (user) {
        foundUser = await this.userService.addUserMeta(
          foundUser,
          user.id.toString(),
          foundUser['id'],
        );
      }

      if (cleaned) {
        foundUser = this.cleanProfile(foundUser);
      }
      delete foundUser['isAdmin'];
      delete foundUser['isActive'];
      delete foundUser['updated_at'];
      return Promise.resolve(foundUser);
    }

    return Promise.resolve(null);
  }

  async getProfileByEmail(email: string): Promise<ProfileUserDto> {
    let foundUser: ProfileUserDto = await this.userService.findByEMail(email);

    if (foundUser && foundUser.id > 0) {
      foundUser = this.cleanProfile(foundUser);
      return Promise.resolve(foundUser);
    }
    return Promise.resolve(null);
  }

  cleanProfile(prof: ProfileUserDto): ProfileUserDto {
    delete prof['password'];
    delete prof['reset_token'];
    delete prof['reset_token_expires_at'];

    if (String(prof['id']).length < 32) {
      prof['id'] = prof['hash'];
      delete prof['hash'];
      // prof['id'] = crypto
      //   .createHash('md5')
      //   .update(`USERID:${String(prof['id'])}`)
      //   .digest('hex');
    }

    return prof;
  }

  async getProfileByDisplayName(
    query: GetDisplayNameUserDto,
  ): Promise<ProfileUserDto> {
    let foundUser: ProfileUserDto = await this.userService.findByUsername(
      query.displayName,
    );
    if (foundUser && foundUser.id > 0) {
      foundUser = this.cleanProfile(foundUser);
      return Promise.resolve(foundUser);
    }

    return Promise.resolve(null);
  }

  async getProfileByUsername(
    query: GetUsernameUserDto,
    siteUserId: string,
    raw?: boolean,
  ): Promise<ProfileUserDto> {
    console.log(query);
    let foundUser: ProfileUserDto = await this.userService.findByUsername(
      query.username,
    );
    console.log(foundUser);
    if (foundUser && foundUser.id > 0) {
      foundUser = await this.userService.addUserMeta(
        foundUser,
        siteUserId,
        foundUser['id'],
      );
      if (!raw) {
        foundUser = this.cleanProfile(foundUser);
      }
      return Promise.resolve(foundUser);
    }

    if (query.username.indexOf(' ') > -1) {
      query.username = query.username.replace(' ', '+');
      foundUser = await this.userService.findByUsername(query.username);
      console.log(foundUser);
      if (foundUser && foundUser.id > 0) {
        foundUser = await this.userService.addUserMeta(
          foundUser,
          siteUserId,
          foundUser['id'],
        );
        if (!raw) {
          foundUser = this.cleanProfile(foundUser);
        }
        return Promise.resolve(foundUser);
      }
    }

    return Promise.resolve(null);
  }

  async resetPasswordByUser(
    email: string,
    password: string,
  ): Promise<UserEntity> {
    const existingUser = await this.userService.findByEMail(email);
    if (existingUser && existingUser.isActive && existingUser.id > 0) {
      await this.userService.updatePassword(
        email,
        this.securityService.encryptText(password),
      );

      return Promise.resolve(existingUser);
    }

    return Promise.resolve(null);
  }

  async resetProfilePasswordByUserId(
    currentPwd,
    pwd,
    confirmPwd,
    userId,
  ): Promise<boolean> {
    const existingUser = await this.userService.findOne(userId);
    if (existingUser && existingUser.isActive && existingUser.id > 0) {
      if (
        this.securityService.comparePassword(currentPwd, existingUser.password)
      ) {
        if (pwd === confirmPwd) {
          await this.userService.setUserPassword(
            existingUser,
            this.securityService.encryptText(pwd),
          );
          return Promise.resolve(true);
        }
      }
    }
    return Promise.resolve(false);
  }

  async updateUserProfile(
    body: UpdateProfileUserDto,
    user?: UserEntity,
  ): Promise<UserEntity> {
    let updatedUser: UserEntity;
    if (body) {
      updatedUser = await this.userService.updateUserProfile(body, user);
    }

    return Promise.resolve(updatedUser);
  }

  async listMutesAndBlocks(userId) {
    const list = await this.userService.getMutesAndBlocks(userId);
    let processed;
    if (list) {
      processed = Promise.all(
        list.map(async (usr) => {
          usr['user'] = await this.userService.findOne(usr['profile_id']);
          return usr;
        }),
      );
    }

    return processed;
  }

  async getFollowerStats(userId: number): Promise<number> {
    return Promise.resolve(await this.followService.findFollowersCount(userId));
  }

  async getFollowingStats(userId: number): Promise<number> {
    return Promise.resolve(await this.followService.findFollowingCount(userId));
  }

  async listFollowingForUserId(userId, pg?) {
    const list = await this.followService.findFollowing(userId, pg);
    let processed;
    if (list) {
      processed = Promise.all(
        list.map(async (usr) => {
          usr['user'] = await this.userService.findOne(
            usr['followed_user_id'].toString(),
          );
          delete usr['user']['password'];

          return usr;
        }),
      );
    }

    return processed;
  }

  // async listFollowersForUserId(userId) {
  //   const list = await this.followService.findFollowers(userId);
  //   let processed;
  //   if (list) {
  //     processed = Promise.all(
  //       list.map(async (usr) => {
  //         usr['user'] = await this.userService.findOne(
  //           usr['user_id'].toString(),
  //         );
  //         delete usr['user']['password'];
  //
  //         usr['iFollow'] = await this.followService.isFollowing({
  //           type: '1',
  //           user_id: userId,
  //           followed_user_id: usr['user_id'].toString(),
  //         });
  //
  //         return usr;
  //       }),
  //     );
  //   }
  //
  //   return processed;
  // }

  async listUsers(userId): Promise<UserEntity[]> {
    // const list = await this.userService.findAll({
    //   select: ['id', 'username', 'displayName', 'email', 'bio', 'ava_src'],
    // });

    const list = await this.userService.findAllUsers(userId);
    return list;
  }

  async undoMutesAndBlocks(
    member_id: string,
    user_id: string,
    id: string,
    reason: string,
  ): Promise<boolean> {
    let result;
    if (reason.toLowerCase() === 'muted') {
      result = await this.userService.unMute(member_id, user_id, id);
    }

    if (reason.toLowerCase() === 'blocked') {
      result = await this.userService.unBlock(member_id, user_id, id);
    }

    return Promise.resolve(result);
  }

  async listUsersToMention(member_id: string, search: string): Promise<any[]> {
    const mentionable = await this.userService.listUsersToMention(
      member_id,
      search,
    );
    return Promise.resolve(mentionable);
  }

  async mentnionList(siteUserId: number, search: string): Promise<any[]> {
    const found = await this.userService.mentnionList(siteUserId, search);

    return Promise.resolve(found);
  }

  async listInviteCodes(): Promise<string[]> {
    const codes = await this.userService.listInviteCodes();
    return Promise.resolve(codes);
  }

  async createInviteCode(qty?: number) {
    const codes: InviteUserEntity[] = await this.userService.createInviteCode(
      qty,
    );

    return Promise.resolve(codes.map((c) => c.invite_code));
  }

  async getUserSearchList(userName: string) {
    const users = await this.userService;

    return Promise.resolve([]);
  }

  async getUserProfile(userHash: string): Promise<string[]> {
    return Promise.resolve(null);
  }

  async searchUsers(user: UserEntity, userName: string): Promise<any> {
    const found = await this.getUserRepo().search(user, userName);

    return Promise.resolve(found);
  }

  async inviteFriend(user: UserEntity, name, email): Promise<InviteUserEntity> {
    const invite = await this.userService.inviteFriend(user.id, name, email);
    return Promise.resolve(invite);
  }

  async logContactUs(
    contactName: string,
    contactEmail: string,
    message: string,
  ): Promise<ContactUsEntity> {
    const newContact: ContactUsEntity =
      await this.userService.addContactUsMessage(
        contactName,
        contactEmail,
        message,
      );
    return Promise.resolve(newContact);
  }

  async addUserToken(
    user: UserEntity,
    tokenType: string,
    token: string,
  ): Promise<UserTokensEntity> {
    const added = await this.userService.addUserToken(user, tokenType, token);
    return Promise.resolve(added);
  }

  async getUserToken(user: UserEntity, tokenType: string): Promise<string> {
    const usertoken = await this.userService.getUserToken(user, tokenType);
    return Promise.resolve(usertoken);
  }

  async decodeJwt(refresh: string): Promise<any> {
    const val = this.jwtService.decode(refresh);
    return Promise.resolve(val);
  }

  async userAddEmoji(
    user: UserEntity,
    files: any[],
    name: string,
  ): Promise<any> {
    if ((await this.userService.getUserEmojisCount(user)) > 4) {
      throw new Exception('Maximum allowed custom emojis');
    }

    const existing = await this.userService.getEmojiWithName(user, name);
    if (existing) {
      return Promise.resolve(null);
    }

    const file = files.filter((f) => f?.fieldname === 'emoji').pop();

    const fl = await sharp(file['buffer'])
      .metadata()
      .then(async ({ width }) => {
        if (width >= 1080) {
          return await sharp(file['buffer'])
            .resize(300, 300, { fit: 'inside' })
            .toBuffer();
        } else {
          return file['buffer'];
        }
      });
    // const ext = file.mimetype.split('/').pop();
    const ext = file['originalname'].split('.').pop();

    fs.access('public/uploads/emoji', (err) => {
      if (err) {
        try {
          fs.mkdirSync('public/uploads/emoji');
        } catch (e) {}
      }
    });

    const imageMime = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'];
    const newFile = uuid().toString();
    const baseDir = `public/uploads/emoji`.split('/');

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

    const newImagename = `${nf}.${ext}`;
    const buf = Buffer.from(fl, 'binary');
    fs.writeFileSync(newImagename, buf);

    const added = await this.userService.userAddEmoji(
      user,
      newImagename.substring(21),
      name,
    );
    return Promise.resolve(added);
  }

  async getUserEmoji(user: UserEntity) {
    const emojis = await this.userService.getUserEmojis(user);

    const found = emojis.map((e: UserEmojiEntity) => {
      return {
        keywords: e.name,
        fitzpatrick_scale: false,
        char: `<img data-emoticon="true" style="width: 1.5em; height: 1.5em; margin: 0px 0.05em 0px 0.1em; vertical-align: -0.3em;" draggable="false" alt="${e.name}" src="${e.url}"/>`,
        category: 'Custom',
      };
    });

    return Promise.resolve(found);
  }

  async delUserEmoji(user: UserEntity, name: string): Promise<boolean> {
    // delUserEmoji
    const res = await this.userService.delEmoji(user, name);

    return Promise.resolve(res);
  }
}
