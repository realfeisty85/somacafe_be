import { ApiProperty } from '@nestjs/swagger';

export default class GetByUserHashDto {
  @ApiProperty()
  userHash: string;
  @ApiProperty()
  pg?: number;
}
