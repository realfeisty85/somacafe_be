import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { UserApiService } from './user-api.service';
import { RegisterUserDto } from '../../repositories/user-repo/dto/register.user.dto';
import { LoginUserDto } from '../../repositories/user-repo/dto/login.user.dto';
import { LoggedInUserDto } from '../../repositories/user-repo/dto/loggedIn.user.dto';
import GetUserDto from '../../repositories/user-repo/dto/get.user.dto';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';
import ProfileUserDto from '../../repositories/user-repo/dto/profile.user.dto';
import UpdateProfileUserDto from '../../repositories/user-repo/dto/update.profile.user.dto';
import GetDisplayNameUserDto from '../../repositories/user-repo/dto/get.displayName.user.dto';
import GetUsernameUserDto from '../../repositories/user-repo/dto/get.username.user.dto';
import { LoggingInterceptor } from '../logging/logging.interceptor';
import UndoMutesblocksDto from '../../repositories/user-repo/dto/undo.mutesblocks.dto';
import MentionsRequestDto from '../../repositories/user-repo/dto/mentions.request.dto';
import { Response } from 'express';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import { MailService } from '../../modules/mail/mail.service';
import { Exception } from 'handlebars';
import { ApiCreatedResponse } from '@nestjs/swagger';
import GetByUserHashDto from '../../repositories/user-repo/dto/get.userhash.user.dto';

@UseInterceptors(LoggingInterceptor)
@Controller('user/v1')
export class UserApiController {
  constructor(
    private userApi: UserApiService,
    private mailService: MailService,
  ) {}

  log(text: string) {
    console.log(`UserApiController - ${text}`);
  }

  @Get('test')
  async test(@Res() res) {
    this.log(`test`);
    //await this.userApi.addUser();
    res.send('testing userApi');
  }

  @Post('register')
  async register(@Res() res, @Req() req, @Body() newUserDto: RegisterUserDto) {
    this.log(`regsiter`);
    const u = {};
    try {
      const newUserAdded = await this.userApi.addUser(newUserDto);

      u['login'] = newUserAdded.displayName;
      u['name'] = newUserAdded.username;
      u['id'] = newUserAdded.id;
      u['ava_src'] = newUserAdded.ava_src;
    } catch (e) {
      res.status(e.response.status).send({ messages: e.response });
      return;
    }

    res.status(200).send(u);
  }

  @Post('login')
  async login(@Res() res, @Req() req, @Body() loginUserDto: LoginUserDto) {
    this.log(`login`);
    console.log(loginUserDto);
    const loggedInUser: LoggedInUserDto = await this.userApi.login(
      loginUserDto,
    );

    if (loggedInUser && loggedInUser.id > 0) {
      console.log(loggedInUser);
      res.status(200).send({ status: 200, user: loggedInUser });
      return;
    }
    console.log('Unable to login');
    res.status(422).send({ status: 422, user: {} });
    return;
  }

  @Get('profile')
  async getProfileById(@Res() res, @Req() req, @Query() query: GetUserDto) {
    this.log(`profile`);
    console.log(req.body);
    console.log(req.headers);
    console.log(query);

    const found: ProfileUserDto = await this.userApi.getProfileById(query);

    res.status(200).send({ user: found, status: 'success' });
  }

  @Get('byDisplayName')
  async getProfileByDisplayName(
    @Res() res,
    @Req() req,
    @Query() query: GetDisplayNameUserDto,
  ) {
    this.log(`profile`);
    console.log(req.body);
    console.log(req.headers);
    console.log(query);

    const found: ProfileUserDto = await this.userApi.getProfileByDisplayName(
      query,
    );
    console.log(found);
    res.status(200).send({ user: found, status: 'success' });
  }

  @Get('byUsername')
  async getProfileByUsername(
    @Res() res,
    @Req() req,
    @Query() query: GetUsernameUserDto,
  ) {
    this.log(`profile`);
    console.log(req.body);
    console.log(req.headers);
    console.log(query);

    const found: ProfileUserDto = await this.userApi.getProfileByUsername(
      query,
      req.headers['x-sid'],
    );
    console.log(found);
    res.status(200).send({ user: found, status: 'success' });
  }

  // @Get('byUserHash')
  // async getProfileByUserHash(
  //   @Res() res,
  //   @Req() req,
  //   @Query() query: GetByUserHashDto,
  // ) {
  //   this.log(`profile`);
  //   console.log(req.body);
  //   console.log(req.headers);
  //   console.log(query);
  //
  //   const found: ProfileUserDto = await this.userApi.getProfileByUserHash(
  //     query,
  //   );
  //   console.log(found);
  //   res.status(200).send({ user: found, status: 'success' });
  // }

  @Post('update')
  async updateUserProfile(
    @Res() res,
    @Req() req,
    @Body() body: UpdateProfileUserDto,
  ) {
    this.log(`update`);
    console.log(req.body);
    console.log(req.headers);
    // console.log(body);

    const updated: UserEntity = await this.userApi.updateUserProfile(body);

    res.status(200).send({ status: 'success', user: updated });
  }

  @Post('update-pwd')
  async updateUserPassword(
    @Res() res,
    @Req() req,
    @Body() body: UpdateProfileUserDto,
  ) {
    this.log(`update-pwd`);
    console.log(req.body);
    console.log(req.headers);
    // console.log(body);

    //const updated: UserEntity = await this.userApi.updateUserProfile(body);

    res.status(200).send({ status: 'success', user: null });
  }

  // @Get('resetToken')
  // async getPasswordResetToken(
  //   @Res() res,
  //   @Req() req,
  //   @Query() query: GetUserDto,
  // ) {
  //   this.log(`getPasswordResetToken`);
  //   console.log(req.body);
  //   console.log(req.headers);
  //   console.log(query);
  //
  //   const token = await this.userApi.getPasswordResetToken(query);
  //
  //   res.status(200).send({ token: token, status: 'success' });
  // }

  @Get('sec/list/mb')
  async profileListMutesAndBlocks(@Res() res, @Req() req, @Query() query) {
    console.log(query);
    let list;
    if (query['user_id'] && parseInt(query['user_id']) > 0) {
      list = await this.userApi.listMutesAndBlocks(query['user_id']);
      console.log(list);
    }

    res.status(200).send({ status: 'success', list: list });
  }

  @Post('sec/undo/mb')
  async profileUndoMutesAndBlocks(
    @Res() res,
    @Req() req,
    @Body() body: UndoMutesblocksDto,
  ) {
    // console.log(body);
    const result = await this.userApi.undoMutesAndBlocks(
      body.member_id,
      body.user_id,
      body.id,
      body.reason,
    );

    res.status(200).send({ status: 'success', result: result });
  }

  @Post('mention-list')
  async userMentionList(
    @Res() res,
    @Req() req,
    @Body() body: MentionsRequestDto,
  ) {
    console.log(body);
    const result = await this.userApi.listUsersToMention(
      body.member_id,
      body.search,
    );
    console.log(result.map((m: any) => m.displayName));
    res
      .status(200)
      .send({ status: 'success', result: result.map((m: any) => m.displayName) });
  }

  @Get('mail-template')
  async showMailTemplate(@Query() query, @Res() res: Response) {
    console.log(query);

    const { t } = query;
    if (t && t === 'forgotpassword') {
      const templateValues = {
        firstname: 'Wikus',
        resetcode: '01f6a9f3-bc98-465a-9aea-b73dfb684e7d',
      };

      const ress = await this.mailService.renderTemplate(
        'mail/forgot_password',
        templateValues,
      );

      return res.send(ress);
    }
    const template = await fs.readFileSync('views/mail/welcome.hbs', 'utf-8');
    console.log(template);
    const compiledTemplate = handlebars.compile(template);
    const resCompiled = compiledTemplate({ message: 'Hello world!' });
    console.log(resCompiled);
    return res.send(resCompiled);
  }

  @Get('list-invite-codes')
  async listInviteCodes(@Req() req, @Res() res) {
    console.log(req.headers);
    const existingCodes = await this.userApi.listInviteCodes();
    res.send(existingCodes);
  }

  @Get('generate-invite-codes')
  async generateCode(@Req() req, @Res() res, @Query() query) {
    console.log(req.headers);
    console.log(query);

    const existingCodes = await this.userApi.createInviteCode(query['qty']);
    res.send(existingCodes);
  }

  // @Get('list-followers')
  // async getFollowers(@Query() query, @Res() res, @Req() req) {
  //   console.log(query);
  //   const following = await this.userApi.listFollowersForUserId(
  //     query['user_id'],
  //   );
  //   console.log(following);
  //   res.status(200).send({ status: 'success', list: following });
  // }

  @Get('list-users')
  async getUserList(@Query() query, @Res() res, @Req() req) {
    const users = await this.userApi.listUsers(query['user_id']);
    res.status(200).send({ status: 'success', list: users });
  }

  @Get('list-following')
  async getFollowing(@Query() query, @Res() res, @Req() req) {
    console.log(query);
    const followers = await this.userApi.listFollowingForUserId(
      query['user_id'],
      1,
    );
    console.log(followers);
    res.status(200).send({ status: 'success', list: followers });
  }
}
