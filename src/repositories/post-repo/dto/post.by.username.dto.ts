import { ApiProperty } from '@nestjs/swagger';

export class PostByUsernameDto {
  @ApiProperty()
  u: string;
  @ApiProperty()
  pg: number;
  @ApiProperty()
  isStream?: boolean;
}
