import { Module } from '@nestjs/common';
import { EmojiApiController } from './emoji-api.controller';
import { EmojiApiService } from './emoji-api.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [EmojiApiController],
  providers: [EmojiApiService],
  imports: [HttpModule],
})
export class EmojiApiModule {}
