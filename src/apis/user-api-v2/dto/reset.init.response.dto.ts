import { ApiProperty } from '@nestjs/swagger';

export class ResetInitResponseDto {
  @ApiProperty()
  password: string;

  @ApiProperty()
  confirmPassword: string;

  @ApiProperty()
  token?: string;
}
