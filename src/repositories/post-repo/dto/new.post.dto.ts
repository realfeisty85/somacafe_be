import { ApiProperty } from '@nestjs/swagger';

export class NewPostDto {
  @ApiProperty()
  user_id: string;
  @ApiProperty()
  post_type: string;
  @ApiProperty()
  text: string;
  @ApiProperty()
  gallery: string;
  @ApiProperty()
  privacy: string;
  @ApiProperty()
  mentions: string;
  @ApiProperty()
  parent_post_id?: number | string;
}
