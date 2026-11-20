import { ApiProperty } from '@nestjs/swagger';

export default class GetUsernameUserDto {
  @ApiProperty()
  username: string;
}
