import { ApiProperty } from '@nestjs/swagger';

export class AddReportDto {
  @ApiProperty()
  user_id: string;
  @ApiProperty()
  post_user_hash: string;
  @ApiProperty()
  reason: string;
  @ApiProperty()
  pid: string;
}
