import { Module } from '@nestjs/common';
import { BookmarkApiController } from './bookmark-api.controller';

@Module({
  controllers: [BookmarkApiController],
})
export class BookmarkApiModule {}
