import { ApiProperty } from '@nestjs/swagger';

export class AddReportV2Dto {
  @ApiProperty()
  post: string; // post hash
  @ApiProperty()
  reason: string;
}
