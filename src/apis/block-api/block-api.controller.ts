import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { MuteApiService } from '../mute-api/mute-api.service';
import { AddMuteDto } from '../../repositories/mute-repo/dto/add.mute.dto';
import { BlockApiService } from './block-api.service';
import { AddBlockDto } from '../../repositories/block-repo/dto/add.block.dto';
import { LoggingInterceptor } from '../logging/logging.interceptor';

@UseInterceptors(LoggingInterceptor)
@Controller('block/v1')
export class BlockApiController {
  constructor(private blockApi: BlockApiService) {}

  @Post('block')
  async toggleBlock(@Body() body: AddBlockDto, @Res() res, @Req() req) {
    // const result: boolean = await this.blockApi.toggleBlock(body);
    res.status(200).send({});
  }
}
