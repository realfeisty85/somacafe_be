import { ApiProperty } from '@nestjs/swagger';

export class ResetLoginDto {
  @ApiProperty()
  email: string;

  @ApiProperty()
  token: string;
}
