import { ApiProperty } from '@nestjs/swagger';

export class PostFetchRequestDto {
  @ApiProperty()
  h: string;
}
