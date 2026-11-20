import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../../user-repo/entities/user.entity';

export class PollQuestionv2 {
  @ApiProperty()
  title: string;

  @ApiProperty()
  expireAt: string;

  @ApiProperty()
  options: string[];
}

export class CreatePollv2 {
  @ApiProperty()
  poll: PollQuestionv2;

  @ApiProperty()
  user: UserEntity;
}
