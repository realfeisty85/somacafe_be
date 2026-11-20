import { ApiProperty } from '@nestjs/swagger';

export class PollQuestionOption {
  @ApiProperty()
  id: string;

  @ApiProperty()
  val: string;
}

export class PollQuestion {
  @ApiProperty()
  pollQuestion: string;

  @ApiProperty()
  options: [PollQuestionOption];
}

export class CreatePollDto {
  @ApiProperty()
  poll: PollQuestion;
  @ApiProperty()
  site_user_id: string;
}
