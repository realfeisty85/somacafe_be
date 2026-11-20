import { ApiProperty } from '@nestjs/swagger';

export default class ProfileUserDto {
  @ApiProperty()
  id: number | string;
  @ApiProperty()
  username: string;
  @ApiProperty()
  displayName: string;
  @ApiProperty()
  surname: string;
  @ApiProperty()
  email: string;
  @ApiProperty()
  bio: string;
  @ApiProperty()
  ava_src: string;
  @ApiProperty()
  isActive: boolean;
  @ApiProperty()
  created_at: Date;
  @ApiProperty()
  updated_at: Date;
  @ApiProperty()
  followers_count: number;
  @ApiProperty()
  following_count: number;
  @ApiProperty()
  profile_background_url?: string;
  @ApiProperty()
  birthday?: Date;
}
