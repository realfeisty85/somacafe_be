import { ApiProperty } from '@nestjs/swagger';

export class SearchUserDto {
  @ApiProperty()
  login: string;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  user_id: number;
}
