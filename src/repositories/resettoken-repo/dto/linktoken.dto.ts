import { ApiProperty } from '@nestjs/swagger';

export class LinktokenDto {
  @ApiProperty()
  email: string;
  @ApiProperty()
  token: string;
}
