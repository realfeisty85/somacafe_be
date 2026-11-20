import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { LoggingInterceptor } from '../logging/logging.interceptor';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { UserApiService } from '../user-api/user-api.service';
import { NotificationsApiService } from './notifications-api.service';
import { UsersNotifyConfigEntity } from '../../repositories/notifications-repo/entities/users.notify.config.entity';
import { NotificationSettingsConfigDto } from '../../repositories/notifications-repo/dto/notification.settings.config.dto';

@UseInterceptors(LoggingInterceptor)
@Controller('notify/v1')
export class NotificationsApiController {
  constructor(
    private readonly userApi: UserApiService,
    private readonly notify: NotificationsApiService,
  ) {}

  // set notification settings
  @Post('config')
  @UseGuards(JwtAuthGuard)
  async setConfig(
    @Req() req,
    @Res() res,
    @Body() notifyConfig: NotificationSettingsConfigDto,
  ) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      const config: NotificationSettingsConfigDto =
        await this.notify.saveSettings(user, notifyConfig);

      return res
        .status(HttpStatus.OK)
        .json({ message: 'Config saved', config: config });
    }
  }

  @Post('markallread')
  @UseGuards(JwtAuthGuard)
  async setMarkAsAllRead(@Req() req, @Res() res) {
    try {
      const user = await this.userApi
        .getUserRepo()
        .getUserBySessionId(req['user']['userId']);
      if (user) {
        await this.notify.markAsAllRead(user);
      }
      return res.status(HttpStatus.OK).json({ message: 'Success' });
    } catch (e) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Failed' });
    }
  }

  // get notification settings
  @Get('config')
  @UseGuards(JwtAuthGuard)
  async getConfig(@Req() req, @Res() res) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      const config = await this.notify.loadSettings(user);
      return res
        .status(HttpStatus.OK)
        .json({ message: 'Config loaded', config: config });
    }
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  async getNotificationsList(@Query('pg') pg: number, @Req() req, @Res() res) {
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      const lst = await this.notify.getNotificationsList(user, pg);
      return res
        .status(HttpStatus.OK)
        .json({ message: 'Notifications', notifications: lst });
    }
  }
}
