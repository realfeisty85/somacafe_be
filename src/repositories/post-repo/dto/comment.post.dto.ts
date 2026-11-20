import { ApiProperty } from '@nestjs/swagger';

export class CommentPostDto {
  @ApiProperty()
  post_hash: string;

  @ApiProperty()
  comment: string;

  @ApiProperty()
  site_user_id: string;
}
