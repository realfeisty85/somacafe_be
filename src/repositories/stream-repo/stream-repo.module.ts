import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StreamEntity } from './entities/stream.entity';
import { StreamRepoService } from './stream-repo.service';

@Module({
  imports: [TypeOrmModule.forFeature([StreamEntity])],
  providers: [StreamRepoService],
  exports: [StreamRepoService],
})
export class StreamRepoModule {}
