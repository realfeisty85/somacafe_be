import { ApiProperty } from '@nestjs/swagger';

export class DeletePostDto {
  @ApiProperty()
  user_id: number;
  @ApiProperty()
  post_id: number;
}
