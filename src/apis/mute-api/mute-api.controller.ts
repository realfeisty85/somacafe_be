import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { MuteApiService } from './mute-api.service';
import { AddMuteDto } from '../../repositories/mute-repo/dto/add.mute.dto';
import { LoggingInterceptor } from '../logging/logging.interceptor';

@UseInterceptors(LoggingInterceptor)
@Controller('mute/v1')
export class MuteApiController {
  constructor(private muteApi: MuteApiService) {}

  @Post('mute')
  async toggleMute(@Body() body: AddMuteDto, @Res() res, @Req() req) {
    //const result: boolean = await this.muteApi.toggle(body);
    res.status(200).send({});
  }
}
