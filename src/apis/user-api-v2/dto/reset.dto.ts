import { ApiProperty } from '@nestjs/swagger';

export class ResetDto {
  @ApiProperty()
  email: string;
}
