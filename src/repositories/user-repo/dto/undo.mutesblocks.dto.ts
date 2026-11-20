import { ApiProperty } from '@nestjs/swagger';

export default class UndoMutesblocksDto {
  @ApiProperty()
  member_id: string;
  @ApiProperty()
  user_id: string;
  @ApiProperty()
  id: string;
  @ApiProperty()
  reason: string;
}
