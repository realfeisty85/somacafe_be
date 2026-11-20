import { ApiProperty } from '@nestjs/swagger';

export class NewBugReportDto {
  @ApiProperty()
  user_id: number;

  @ApiProperty()
  bugOption: number;

  @ApiProperty()
  bugDescription: string;

  @ApiProperty()
  system: string;

  @ApiProperty()
  browser: string;

  @ApiProperty()
  attachments: object;
}
