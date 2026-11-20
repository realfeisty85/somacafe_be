import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserV2Dto {
  @ApiProperty()
  invite_code?: string;
  @ApiProperty()
  username: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  email: string;
  @ApiProperty()
  bio: string;
  @ApiProperty()
  password: string;
  @ApiProperty()
  confirmPassword: string;
}
