import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AddFollowRequestDto {
  @IsString()
  @ApiProperty()
  user_id: string;

  @IsString()
  @ApiProperty()
  followed_user_id: string;

  @IsString()
  @ApiProperty()
  type: string;
}
