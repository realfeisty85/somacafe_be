import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { SearchApiService } from './search-api.service';
import { SearchUserDto } from '../../repositories/dto/search.user.dto';
import { LoggingInterceptor } from '../logging/logging.interceptor';

@UseInterceptors(LoggingInterceptor)
@Controller('search/v1')
export class SearchApiController {
  constructor(private readonly search: SearchApiService) {}

  @Post('users')
  async searchUsers(@Body() body: SearchUserDto, @Res() res, @Req() req) {
    const result = await this.search.lookupUsers(body);

    console.log(result);
    res.status(200).json({ users: result });
  }
}
