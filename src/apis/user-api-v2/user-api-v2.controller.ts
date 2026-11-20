import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LoggingInterceptor } from '../logging/logging.interceptor';
import { UserApiService } from '../user-api/user-api.service';
import { MailService } from '../../modules/mail/mail.service';
import { ResetApiService } from '../reset-api/reset-api.service';
import { ResetDto } from './dto/reset.dto';
import { ResettokenEntity } from '../../repositories/resettoken-repo/entities/resettoken.entity';
import ProfileUserDto from '../../repositories/user-repo/dto/profile.user.dto';
import { ApiBody, ApiOkResponse, ApiResponse } from '@nestjs/swagger';
import { ResetInitResponseDto } from './dto/reset.init.response.dto';
import { UserRepoService } from '../../repositories/user-repo/user-repo.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PostApiService } from '../post-api/post-api.service';
import { AddBlockV2Dto } from '../../repositories/block-repo/dto/add.block.v2.dto';
import { BlockApiService } from '../block-api/block-api.service';
import { AddMuteV2Dto } from '../../repositories/mute-repo/dto/add.mute.v2.dto';
import { MuteApiService } from '../mute-api/mute-api.service';
import UpdateProfileUserDto from '../../repositories/user-repo/dto/update.profile.user.dto';
import { UserEntity } from '../../repositories/user-repo/entities/user.entity';
import { InviteUserEntity } from '../../repositories/user-repo/entities/invite.user.entity';
import { ResetLoginDto } from './dto/reset.login.dto';
import { LoginDto } from '../login-api/dto/login.dto';
import { AuthService } from '../../auth/auth.service';
import * as moment from 'moment';
import { FilesInterceptor } from '@nestjs/platform-express';
const TOKEN_TYPES = {
  FCM: 1,
};

@UseInterceptors(LoggingInterceptor)
@Controller('user/v2')
export class UserApiV2Controller {
  constructor(
    private userApi: UserApiService,
    private mailService: MailService,
    private readonly userService: UserRepoService,
    private resetApi: ResetApiService,
    private readonly postApi: PostApiService,
    private blockApi: BlockApiService,
    private muteApi: MuteApiService,
    private authService: AuthService,
  ) {}

  log(text: string) {
    console.log(`UserApiV2Controller - ${text}`);
  }

  @Post('reset/init')
  @ApiOkResponse({ type: ResetInitResponseDto })
  async generateResetToken(@Body() body: ResetDto, @Req() req, @Res() res) {
    const newToken = await this.resetApi.getToken();
    const token: ResettokenEntity = await this.resetApi.linkEmailToToken({
      token: newToken,
      email: body.email,
    });
    const user: ProfileUserDto = await this.userApi.getProfileByEmail(
      body.email,
    );

    if (req['headers']['host'].indexOf('localhost') > -1) {
      res.status(200).json({
        message: 'If you have an account, a reset password email was sent.',
        token: token.token,
      });
    } else {
      if (token.isActive) {
        // send Email
        const templateValues = {
          firstname: user.displayName,
          resetcode: token.token,
        };
        const testMessage = `Hi ${user.displayName}! Please follow the link below to reset your password: https://soma.cafe/reset/confirm/${token.token}`;

        const ress = await this.mailService.renderTemplate(
          'mail/forgot_password',
          templateValues,
        );
        await this.mailService.sendMail(
          user.email,
          'Soma Cafe Forgot Password',
          testMessage,
          ress,
        );
      }
      res.status(200).json({
        message: 'If you have an account, a reset password email was sent.',
      });
    }
  }

  @Post('reset')
  @ApiResponse({
    status: 201,
    description: 'The record is successfully created',
  })
  @ApiResponse({
    status: 423,
    description: 'Bad request',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  // @ApiOkResponse({ type:  })
  async resetUserLoginWithToken(
    @Body() body: ResetInitResponseDto,
    @Req() req,
    @Res() res,
  ) {
    const result = await this.resetApi.resetPassword(
      body.password,
      body.confirmPassword,
      body.token,
    );

    if (result) {
      res.status(201).json({
        message: 'Password updated successfully.',
      });
    } else {
      res.status(423).json({
        message: 'Bad Request.',
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('account/reset-password')
  async resetPasswordOnAccount(
    @Req() req,
    @Res() res,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
    @Body('confirmPassword') confirmPassword: string,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const result = await this.userApi.resetProfilePasswordByUserId(
        oldPassword,
        newPassword,
        confirmPassword,
        user.id,
      );
      res.status(200).json({
        message: result ? 'Password updated' : 'Password not updated',
        result: result,
      });
      return;
    }

    res.status(423).json({
      message: 'Bad Request.',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiResponse({
    status: 200,
    description: 'User Profile',
  })
  @ApiResponse({
    status: 423,
    description: 'Bad request',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getUserProfileByJwt(@Req() req, @Res() res) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const profileUser = await this.userApi.getProfileByUserHash(
        {
          userHash: user.getIdAsHash(),
        },
        true,
        user,
      );
      delete profileUser['sessionId'];
      delete profileUser['isAdmin'];
      res.status(200).json({
        message: 'My Profile.',
        profile: profileUser,
      });
      return;
    }
    res.status(423).json({
      message: 'Bad Request.',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('u/:username')
  async getProfileByUsername(
    @Res() res,
    @Param('username') username: string,
    @Req() req,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const profileUser = await this.userApi.getProfileByUsername(
        { username },
        user.id.toString(),
      );
      res.status(200).send({ user: profileUser, status: 'success' });
    } else {
      res.status(423).json({
        message: 'Bad Request.',
      });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('profile/update')
  async updateUserProfile(
    @Res() res,
    @Req() req,
    @Body() body: UpdateProfileUserDto,
  ) {
    try {
      const user = await this.userApi
        .getUserRepo()
        .getUserBySessionId(req['user']['userId']);

      if (user) {
        const updated: UserEntity = await this.userApi.updateUserProfile(
          body,
          user,
        );
        res.status(200).send({ status: 'success', user: updated });
        return;
      }
    } catch (e) {
      res.status(e.status).send({ status: 'failed', message: e.message });
      return;
    }
    res.status(500).send({ status: 'failed' });
  }

  @UseGuards(JwtAuthGuard)
  @Get('follow/who')
  async getWhoToFollow(
    @Req() req,
    @Res() res,
    @Query() query,
    @Query('pg') pg,
  ) {
    try {
      const user = await this.userApi
        .getUserRepo()
        .getUserBySessionId(req['user']['userId']);

      if (user) {
        const result = await this.postApi.findUnfollowedUsers(user.id, pg);
        res.status(200).json({
          status: 200,
          message: [...result],
        });
        return;
      }
    } catch (e) {
      //console.loge);
      //console.log'Error fetching post for commenting');
      return res.status(500).json({ status: 500 });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('block/toggle')
  async toggleBlock(@Query() query: AddBlockV2Dto, @Res() res, @Req() req) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const result: any = await this.blockApi.toggleBlockByUserHash(
        query,
        user,
      );
      if (!result) {
        res.status(200).send({ message: 'Unable to block user.' });
        return;
      }
      res.status(200).send(result);
      return;
    }

    res.status(500).json({ status: 500 });
  }

  @UseGuards(JwtAuthGuard)
  @Get('block/list')
  async listBlockedUsers(@Query('pg') pg: number, @Res() res, @Req() req) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const result: any = await this.blockApi.listBlockedUsers(user, pg);
      res.status(200).send({ result, status: 200 });
      return;
    }

    res.status(500).json({ status: 500 });
  }

  @UseGuards(JwtAuthGuard)
  @Get('mute/toggle')
  async toggleMute(@Query() query: AddMuteV2Dto, @Res() res, @Req() req) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      console.log(query);
      const result: any = await this.muteApi.toggle(query, user);
      if (!result) {
        res.status(200).send({ message: 'Unable to mute user' });
        return;
      }
      res.status(200).send(result);
      return;
    }

    res.status(500).json({ status: 500 });
  }

  @UseGuards(JwtAuthGuard)
  @Get('mute/list')
  async listMutedUsers(@Query('pg') pg, @Res() res, @Req() req) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const result: any = await this.muteApi.listMutedUsers(user, pg);
      res.status(200).send({ result, status: 200 });
      return;
    }

    res.status(500).json({ status: 500 });
  }

  @UseGuards(JwtAuthGuard)
  @Post('invite')
  async invuteFriend(
    @Body('name') name,
    @Body('email') email,
    @Res() res,
    @Req() req,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const isExistingUser = await this.userApi.getProfileByEmail(email);
      if (
        isExistingUser &&
        isExistingUser?.email.trim().toLowerCase() ===
          email.trim().toLowerCase()
      ) {
        res.status(HttpStatus.FORBIDDEN).send({
          message: 'The user is already a member on Soma Cafe',
          status: HttpStatus.FORBIDDEN,
        });
        return;
      }

      const invite: InviteUserEntity = await this.userApi.inviteFriend(
        user,
        name,
        email,
      );

      const templateValues = {
        friendName: name,
        somaUsername: user.username,
        inviteUrl: `${process.env.IMAGES_URL}/register?invite=${invite.invite_code}`,
        inviteCode: invite.invite_code,
      };

      const testMessage = `Hi ${name}, your friend ${
        user.username
      } has invited you to Soma Cafe. Please follow this link to accept the invititation: ${`${process.env.IMAGES_URL}/register?invite=${invite.invite_code}`}`;

      const ress = await this.mailService.renderTemplate(
        'mail/invite_friend',
        templateValues,
      );
      await this.mailService.sendMail(
        email,
        'Soma Cafe Invite',
        testMessage,
        ress,
      );

      res.status(200).send({ inviteCode: invite.invite_code, status: 200 });
      return;
    }

    res.status(500).json({ status: 500 });
  }

  @UseGuards(JwtAuthGuard)
  @Get('user-tokens')
  async getUserToken(@Query('type') tokenType: string, @Res() res, @Req() req) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      const result: any = await this.userApi.getUserToken(user, tokenType);
      res.status(200).send({ result, status: 200 });
      return;
    }

    res.status(500).json({ status: 500 });
  }

  @UseGuards(JwtAuthGuard)
  @Post('user-tokens')
  async addUserToken(
    @Query('type') tokenType: string,
    @Body('token') token: string,
    @Res() res,
    @Req() req,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      console.log({ token });
      const result: any = await this.userApi.addUserToken(
        user,
        TOKEN_TYPES[tokenType.toUpperCase()],
        token,
      );
      res.status(200).send({ message: 'Token Saved', status: 200 });
      return;
    }

    res.status(500).json({ status: 500 });
  }

  @Get('refresh-token')
  async refreshToken(
    @Query('refresh') refresh: string,
    @Req() req,
    @Res() res,
  ) {
    const jwtDecoded: any = await this.userApi.decodeJwt(refresh);
    if (jwtDecoded) {
      const user = await this.userApi
        .getUserRepo()
        .getUserBySessionId(jwtDecoded?.sub);
      if (user) {
        const result: any = await this.authService.refreshToken(user, refresh);
        if (result?.access_token) {
          res.status(200).send(result);
          return;
        }
      }
    }
    res.status(500).json({ status: 500 });
  }

  @UseGuards(JwtAuthGuard)
  @Post('add-moji')
  @UseInterceptors(FilesInterceptor('emoji'))
  async userAddEmoji(
    @UploadedFiles() files,
    @Body('name') name: string,
    @Body('emoji') emoji: any,
    @Res() res,
    @Req() req,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      try {
        const cleanName = name.toLowerCase().trim().replace(' ', '_');
        const result: any = await this.userApi.userAddEmoji(
          user,
          files,
          cleanName,
        );
        if (!result) {
          res.status(500).send({ message: 'Emoji exists', status: 500 });
          return;
        }

        res.status(200).send({ message: 'Emoji Saved', status: 200 });
        return;
      } catch (e) {
        if ('Maximum allowed custom emojis' === e.message) {
          res.status(500).send({ message: `Error saving emoji: ${e.message}` });
          return;
        }
      }
    }
    res.status(500).json({ status: 500 });
  }

  @UseGuards(JwtAuthGuard)
  @Get('emoji')
  async getUserEmoji(@UploadedFiles() files, @Res() res, @Req() req) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      const result: any = await this.userApi.getUserEmoji(user);

      const ress = {};
      result.map((e) => {
        ress[e.keywords] = e;
      });

      res.status(200).send({ message: 'Emojis', status: 200, result: ress });
      return;
    }

    res.status(500).json({ status: 500 });
  }

  @UseGuards(JwtAuthGuard)
  @Delete('emoji/:name')
  async deleteUserEmoji(@Param('name') name: string, @Res() res, @Req() req) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      const result: any = await this.userApi.delUserEmoji(user, name);

      res.status(200).send({
        message: result ? 'Emoji removed' : 'Unable to remove emoji',
        status: 200,
        result: result,
      });
      return;
    }

    res.status(500).json({ status: 500 });
  }
}
