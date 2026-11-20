import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { PostApiService } from '../post-api/post-api.service';
import { UserApiService } from '../user-api/user-api.service';
import { MessagingApiService } from '../messaging-api/messaging-api.service';
import { NotificationsApiService } from '../notifications-api/notifications-api.service';

@Controller('status/v1')
export class StatusApiController {
  constructor(
    private readonly postApi: PostApiService,
    private readonly userApi: UserApiService,
    private readonly messageApi: MessagingApiService,
    private readonly notifyApi: NotificationsApiService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('latest')
  async searchLatest(@Query('since') since: number, @Req() req, @Res() res) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      const newPosts: any = await this.postApi.countNewPosts(user, since);
      const newMessages: any = await this.messageApi.countNewMessages(user);
      const newNotifications: any = await this.notifyApi.countNotifications(
        user,
      );

      res.status(200).json({
        status: 200,
        data: {
          notifications: newNotifications,
          messages: parseInt(newMessages, 10),
          posts: parseInt(newPosts, 10),
        },
      });
      return;
    }

    res.status(500).json({
      status: 500,
      message: 'Error fetching status',
    });
  }
}
