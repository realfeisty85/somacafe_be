import { ApiProperty } from '@nestjs/swagger';

export class AddBlockDto {
  @ApiProperty()
  user_id: string;
  @ApiProperty()
  post_id: string;
  @ApiProperty()
  status: number;
}
