import { ApiProperty } from '@nestjs/swagger';

export class FeedPostDto {
  @ApiProperty()
  user_id: string;
  @ApiProperty()
  site_user_id?: string;
  @ApiProperty()
  limit: string;
  @ApiProperty()
  max_post_id: string;
  @ApiProperty()
  h?: string;
  @ApiProperty()
  pg?: number;
  @ApiProperty()
  isStream?: boolean;
}
