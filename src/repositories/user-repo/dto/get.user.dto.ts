import { ApiProperty } from '@nestjs/swagger';

export default class GetUserDto {
  @ApiProperty()
  userId: string;
}
