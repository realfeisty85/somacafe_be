import { ApiProperty } from '@nestjs/swagger';

export class LikePostDto {
  @ApiProperty()
  user_id: string;
  @ApiProperty()
  post_hash: string;
  @ApiProperty()
  status: string;
}
