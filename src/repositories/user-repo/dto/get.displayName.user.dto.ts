import { ApiProperty } from '@nestjs/swagger';

export default class GetDisplayNameUserDto {
  @ApiProperty()
  displayName: string;
}
