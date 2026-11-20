import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TestingFormService } from './testing-form.service';
import { NewBugDto } from '../../repositories/bugs-repo/dto/new.bug.dto';
import { LoggingInterceptor } from '../logging/logging.interceptor';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UserApiService } from '../user-api/user-api.service';

@UseInterceptors(LoggingInterceptor)
@Controller('bug/v1')
export class TestingFormController {
  constructor(
    private testingFormService: TestingFormService,
    private readonly userApi: UserApiService,
  ) {}

  @Get('echo')
  echo(@Res() res) {
    res.send('echo');
  }

  @Post('new')
  // @UseInterceptors(FileInterceptor('imageUpload'))
  async submitBug(
    @Res() res,
    @Req() req,
    // @UploadedFile() imageUpload: Express.Multer.File,
    @Body() newBug: NewBugDto,
  ) {
    await this.testingFormService.submitBug(newBug);
    console.log('new bug');
    console.log(newBug);
    res.status(200).json({ status: 'success' });
    // res.redirect(req.headers['referer']);
  }

  @UseGuards(JwtAuthGuard)
  @Post('report')
  @UseInterceptors(FilesInterceptor('attachments[]'))
  async addReport(
    @UploadedFiles() files,
    @Body('bugOption') bugOption: number,
    @Body('bugDescription') bugDescription: string,
    @Body('system') system: string,
    @Body('browser') browser: string,
    @Body('attachments') attach: any,
    @Req() req,
    @Res() res,
  ) {
    console.log('***************');
    const user = await this.userApi
      .getUserRepo()
      .getUserBySessionId(req['user']['userId']);
    if (user) {
      const saved = await this.testingFormService.report(
        user,
        bugOption,
        bugDescription,
        system,
        browser,
        files,
      );

      console.log(saved);
      res.status(200).json(saved);
      return;
    }
    res.status(500);
  }
}
