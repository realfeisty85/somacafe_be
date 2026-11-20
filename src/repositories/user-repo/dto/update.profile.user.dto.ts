import { ApiProperty } from '@nestjs/swagger';

export default class UpdateProfileUserDto {
  @ApiProperty()
  user_id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  bio: string;
  @ApiProperty()
  email?: string;
  @ApiProperty()
  ava_src: string;
  @ApiProperty()
  birthday: string;
  @ApiProperty()
  profile_background_url: string;
  @ApiProperty()
  raw_ava_src?: string;
  @ApiProperty()
  raw_profile_background?: string;
}
