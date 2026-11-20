import { ApiProperty } from '@nestjs/swagger';

export class VotePostDto {
  @ApiProperty()
  site_user_id: string;
  @ApiProperty()
  pollhash: string;
  @ApiProperty()
  option: string;
}
