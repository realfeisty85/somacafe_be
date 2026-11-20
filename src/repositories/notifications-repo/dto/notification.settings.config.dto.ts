import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NotificationSettingsConfigDto {
  @ApiProperty()
  @IsInt()
  mentions: boolean;

  @ApiProperty()
  @IsInt()
  shares: boolean;

  @ApiProperty()
  @IsInt()
  likes: boolean;

  @ApiProperty()
  @IsInt()
  replies: boolean;

  @ApiProperty()
  @IsInt()
  follower: boolean;

  @ApiProperty()
  @IsInt()
  messages: boolean;
}
