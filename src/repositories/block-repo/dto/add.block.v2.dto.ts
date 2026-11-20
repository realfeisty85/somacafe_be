import { ApiProperty } from '@nestjs/swagger';

export class AddBlockV2Dto {
  @ApiProperty()
  h?: string;
  @ApiProperty()
  u?: string;
}
