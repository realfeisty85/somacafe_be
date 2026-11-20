import { ApiProperty } from '@nestjs/swagger';

export class ToggleFollowRequestDto {
  @ApiProperty()
  userHash: string;
}
