import { ApiProperty } from '@nestjs/swagger';

export class PostByHashDto {
  @ApiProperty()
  h: string;
  @ApiProperty()
  pg: number;
}
