import { ApiProperty } from '@nestjs/swagger';

export default class MentionsRequestDto {
  @ApiProperty()
  member_id: string;
  @ApiProperty()
  search: string;
}
