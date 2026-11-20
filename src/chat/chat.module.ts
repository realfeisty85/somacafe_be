import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
/*
https://docs.nestjs.com/modules
*/

import { Module } from '@nestjs/common';
import { LivechatRepoModule } from 'src/repositories/livechat-repo/livechat-repo.module';
import { PostApiModule } from 'src/apis/post-api/post-api.module';
import { UserApiModule } from 'src/apis/user-api/user-api.module';

@Module({
  imports: [LivechatRepoModule, PostApiModule, UserApiModule],
  controllers: [],
  providers: [ChatGateway, ChatService],
})
export class ChatModule {}
