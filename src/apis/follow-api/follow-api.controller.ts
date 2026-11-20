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
import { AddFollowRequestDto } from '../../repositories/follow-repo/dto/add.follow.request.dto';
import { FollowApiService } from './follow-api.service';
import { LoggingInterceptor } from '../logging/logging.interceptor';

@UseInterceptors(LoggingInterceptor)
@Controller('follow/v1')
export class FollowApiController {
  constructor(private follow: FollowApiService) {}

  @Post('follow')
  async followUser(
    @Query() query,
    @Body() body: AddFollowRequestDto,
    @Res() res,
    @Req() req,
  ) {
    console.log('body for follow user');
    console.log(JSON.stringify(body));
    await this.follow.followUser(body);

    res.status(200).json({ status: 'success' });
  }

  @Post('check-follow')
  async checkFollow(
    @Query() query,
    @Body() body: AddFollowRequestDto,
    @Res() res,
    @Req() req,
  ) {
    console.log('body for follow user');
    console.log(JSON.stringify(body));
    const following: boolean = await this.follow.isFollowing(body);

    res.status(200).json({ status: 200, follower: following });
  }
}
