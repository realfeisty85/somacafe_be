import { ApiProperty } from '@nestjs/swagger';

export class NewBugDto {
  @ApiProperty()
  errorreason: string;

  @ApiProperty()
  bug: string;

  @ApiProperty()
  imageUpload?: string;

  @ApiProperty()
  userId: string;
}
