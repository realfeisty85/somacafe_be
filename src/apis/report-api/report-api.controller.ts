import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ReportApiService } from './report-api.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('report/v1')
export class ReportApiController {
  constructor(private reportApi: ReportApiService) {}

  // @Post('add')
  // async addReport(@Body() body: AddReportDto, @Res() res, @Req() req) {
  //   const result: ReportEntity = await this.reportApi.add(body);
  //   res.status(200).send(result);
  // }
}
