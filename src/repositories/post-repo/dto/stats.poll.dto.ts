import { ApiProperty } from '@nestjs/swagger';

export class StatsPollDto {
  @ApiProperty()
  site_user_id: string;

  @ApiProperty()
  pollhash: string;
}
