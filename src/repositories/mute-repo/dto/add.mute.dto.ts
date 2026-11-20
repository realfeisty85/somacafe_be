import { IsString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddMuteDto {
  @ApiProperty()
  @IsString()
  user_id: string;

  @ApiProperty()
  @IsString()
  post_user_id: string;

  @ApiProperty()
  @IsInt()
  status: number;
}
