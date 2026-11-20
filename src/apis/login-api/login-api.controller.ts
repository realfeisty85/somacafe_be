import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { LocalAuthGuard } from '../../auth/local-auth.guard';
import { LoggingInterceptor } from '../logging/logging.interceptor';
import { ApiBody, ApiResponse } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { RegisterUserV2Dto } from '../../repositories/user-repo/dto/register.user.v2.dto';
import { RegisterUserDto } from '../../repositories/user-repo/dto/register.user.dto';
import { UserSessionEntity } from '../../repositories/user-repo/entities/user.session.entity';
import { UserApiService } from '../user-api/user-api.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@UseInterceptors(LoggingInterceptor)
@Controller('login/v1')
export class LoginApiController {
  constructor(
    private authService: AuthService,
    private userApi: UserApiService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Post('auth')
  @ApiBody({ type: LoginDto })
  async login(@Req() req) {
    return this.authService.login(req.user);
  }

  @ApiResponse({
    status: 201,
    description: 'The record is successfully created',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  @ApiResponse({
    status: 500,
    description: 'Unable to register, please try again.',
  })
  @Post('register')
  async register(
    @Res() res,
    @Req() req,
    @Body() newUserDto: RegisterUserV2Dto,
  ) {
    try {
      if (newUserDto.password === newUserDto.confirmPassword) {
        const nu = new RegisterUserDto();
        nu.invite_code = newUserDto.invite_code;
        if (newUserDto.username.indexOf('@') > -1) {
          newUserDto.username = newUserDto.username
            .split('')
            .filter((c) => c !== '@')
            .join('');
        }
        if (newUserDto.username.indexOf('+') > -1) {
          newUserDto.username = newUserDto.username
            .split('')
            .filter((c) => c !== '+')
            .join('');
        }
        if (newUserDto.username.indexOf('#') > -1) {
          newUserDto.username = newUserDto.username
            .split('')
            .filter((c) => c !== '#')
            .join('');
        }

        nu.login = newUserDto.username;
        nu.name = newUserDto.name;
        nu.email = newUserDto.email;
        nu.bio = newUserDto.bio;
        nu.password = newUserDto.password;

        const newUserCreated = await this.userApi.addUser(nu);
        if (newUserCreated['id']) {
          const loggedIn = await this.authService.login(newUserCreated);
          res.status(HttpStatus.CREATED).send(loggedIn);
          return;
        }
      } else {
        res
          .status(HttpStatus.BAD_REQUEST)
          .send({ messages: 'Passwords do not match.' });
        return;
      }
    } catch (e) {
      if (e['response']) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(e['response']);
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          messages: `Unable to register [${e}] Please try again.`,
        });
      }
      console.log(e);
      return;
    }
  }

  @ApiResponse({
    status: 500,
    description: 'Unable to register, please try again.',
  })
  @Post('contact')
  async contactUs(
    @Res() res,
    @Req() req,
    @Body('name') contactName: string,
    @Body('email') contactEmail: string,
    @Body('message') message: string,
  ) {
    try {
      if (contactName && contactEmail && message) {
        const newContactUs = await this.userApi.logContactUs(
          contactName,
          contactEmail,
          message,
        );
        if (newContactUs && newContactUs.id > 0) {
          res
            .status(HttpStatus.OK)
            .send({ messages: 'Thank you for contacting us.' });
          return;
        }
      } else {
        res
          .status(HttpStatus.BAD_REQUEST)
          .send({ messages: 'Invalid message.' });
        return;
      }
    } catch (e) {
      if (e['response']) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(e['response']);
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          messages: `Unable to save contact message [${e}] Please try again.`,
        });
      }
      console.log(e);
      return;
    }
  }
}
