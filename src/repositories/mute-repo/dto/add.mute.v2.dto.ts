import { ApiProperty } from '@nestjs/swagger';

export class AddMuteV2Dto {
  @ApiProperty()
  h?: string;
  @ApiProperty()
  u?: string;
}
