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
import { ResetApiService } from './reset-api.service';
import { LinktokenDto } from '../../repositories/resettoken-repo/dto/linktoken.dto';
import { ValidatetokenDto } from '../../repositories/resettoken-repo/dto/validatetoken.dto';
import { ResetpwdDto } from '../../repositories/resettoken-repo/dto/resetpwd.dto';
import { LoggingInterceptor } from '../logging/logging.interceptor';
import { ResetProfilePwdDto } from '../../repositories/resettoken-repo/dto/reset.profile.pwd.dto';
import { MailService } from '../../modules/mail/mail.service';
import { UserApiService } from '../user-api/user-api.service';
import ProfileUserDto from '../../repositories/user-repo/dto/profile.user.dto';

@UseInterceptors(LoggingInterceptor)
@Controller('reset/v1')
export class ResetApiController {
  constructor(
    private resetApi: ResetApiService,
    private mailService: MailService,
    private userService: UserApiService,
  ) {}

  @Get('token')
  async generateResetToken(@Query() query, @Req() req, @Res() res) {
    const newToken = await this.resetApi.getToken();
    res.status(200).json({ token: newToken });
  }

  @Post('link')
  async linkEmailToToken(@Body() body: LinktokenDto, @Req() req, @Res() res) {
    // console.log(body);
    const linkedToken = await this.resetApi.linkEmailToToken(body);

    const user: ProfileUserDto = await this.userService.getProfileByEmail(
      body.email,
    );
    console.log(user);

    const templateValues = {
      firstname: user.displayName,
      resetcode: linkedToken.token,
    };

    // const ress = await this.mailService.renderTemplate(
    //   'mail/forgot_password',
    //   templateValues,
    // );
    //
    // await this.mailService.sendMail(
    //   user.email,
    //   'Soma Cafe Forgot Password',
    //   '',
    //   ress,
    // );

    console.log(linkedToken);

    res.status(200).json(linkedToken);
  }

  @Post('validate')
  async validateToken(@Body() body: ValidatetokenDto, @Req() req, @Res() res) {
    // console.log(body);
    const linkedToken = await this.resetApi.validateToken(body);

    console.log(linkedToken);

    res.status(200).json({ result: linkedToken });
  }

  @Post('reset')
  async resetPassword(@Body() body: ResetpwdDto, @Req() req, @Res() res) {
    // console.log(body);
    const result = await this.resetApi.resetPassword(
      body.password,
      body.confirmPassword,
      body.token,
    );

    console.log('Reset result :', result);

    res.status(200).json({ result: result });
  }

  @Post('auth-reset')
  async resetProfilePassword(
    @Body() body: ResetProfilePwdDto,
    @Req() req,
    @Res() res,
  ) {
    const result = await this.resetApi.resetProfilePassword(
      body.oldPassword,
      body.newPassword,
      body.newConfirmPassword,
      body.siteUserId,
    );

    res.status(200).json({ result: result });
  }
}
