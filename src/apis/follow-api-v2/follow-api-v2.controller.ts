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
import { ApiResponse } from '@nestjs/swagger';
import { UserApiService } from '../user-api/user-api.service';
import { MailService } from '../../modules/mail/mail.service';
import { UserRepoService } from '../../repositories/user-repo/user-repo.service';
import { ResetApiService } from '../reset-api/reset-api.service';
import { FollowApiV2Service } from './follow-api-v2.service';
import { ToggleFollowRequestDto } from './dto/toggle.follow.request.dto';

@Controller('follow/v2')
export class FollowApiV2Controller {
  constructor(
    private userApi: UserApiService,
    private followApiSrv2: FollowApiV2Service,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('status')
  @ApiResponse({
    status: 200,
    description: 'Follow Status',
  })
  @ApiResponse({
    status: 423,
    description: 'Bad request',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getFollowStatus(@Req() req, @Res() res, @Query() query) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const { h, pg } = query;
      let profileUser;
      profileUser = user;
      if (h) {
        profileUser = await this.userApi.getProfileByUserHash(
          {
            userHash: query.h,
          },
          false,
          user,
        );
      }

      const result = await this.followApiSrv2.getAllFollowing(
        user,
        pg,
        profileUser.username,
      );
      res.status(200).json({
        message: 'Following these users.',
        profile: result,
      });
      return;
    }
    res.status(423).json({
      message: 'Bad Request.',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('toggle')
  @ApiResponse({
    status: 200,
    description: 'Follow Status',
  })
  @ApiResponse({
    status: 423,
    description: 'Bad request',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getToggleFollowStatus(
    @Req() req,
    @Res() res,
    @Body() body: ToggleFollowRequestDto,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const result = await this.followApiSrv2.toggleFollow(user, body.userHash);
      res.status(200).json({
        message: 'Toggle result.',
        result: result,
      });
      return;
    }
    res.status(423).json({
      message: 'Bad Request.',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('followers')
  async getFollowers(
    @Query('pg') pg: number,
    @Query('u') username: string,
    @Req() req,
    @Res() res,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const result = await this.followApiSrv2.getAllFollowers(
        user,
        pg,
        username,
      );
      res.status(200).json({
        message: 'Followers',
        result: result,
      });
      return;
    }
    res.status(423).json({
      message: 'Bad Request.',
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('following')
  async getFollowing(
    @Query('pg') pg: number,
    @Query('u') username: string,
    @Req() req,
    @Res() res,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);

    if (user) {
      const result = await this.followApiSrv2.getAllFollowing(
        user,
        pg,
        username,
      );
      res.status(200).json({
        message: 'Following',
        result: result,
      });
      return;
    }
    res.status(423).json({
      message: 'Bad Request.',
    });
  }
}
