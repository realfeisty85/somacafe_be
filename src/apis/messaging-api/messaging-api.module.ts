import { Module } from '@nestjs/common';
import { MessagingApiController } from './messaging-api.controller';
import { MessagingApiService } from './messaging-api.service';
import { RethinkdbProvider } from './rethinkdb.provider';
import { UserApiModule } from '../user-api/user-api.module';

@Module({
  controllers: [MessagingApiController],
  providers: [MessagingApiService, RethinkdbProvider],
  exports: [RethinkdbProvider, MessagingApiService],
  imports: [UserApiModule],
})
export class MessagingApiModule {}
