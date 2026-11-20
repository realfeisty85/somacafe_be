import { ApiProperty } from '@nestjs/swagger';

export class EditPostDto {
  @ApiProperty()
  user_id: string;
  @ApiProperty()
  post_hash: string;
  @ApiProperty()
  post_text: string;
  @ApiProperty()
  post_gallery: string;
  @ApiProperty()
  post_privacy: string;
}
