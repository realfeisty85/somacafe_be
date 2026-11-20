import { ApiProperty } from '@nestjs/swagger';

export class PostLikeToggleRequestDto {
  @ApiProperty()
  post?: string;
}
