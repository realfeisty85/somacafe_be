import { ApiProperty } from '@nestjs/swagger';

export class LoggedInUserDto {
  @ApiProperty()
  id: number;
  @ApiProperty()
  name: string;
  @ApiProperty()
  login: string;
  @ApiProperty()
  ava_src: string;
}
