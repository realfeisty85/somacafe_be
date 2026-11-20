import { Module } from '@nestjs/common';
import { MuteRepoService } from './mute-repo.service';
import { MuteEntity } from './entities/mute.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  providers: [MuteRepoService],
  imports: [TypeOrmModule.forFeature([MuteEntity])],
  exports: [TypeOrmModule, MuteRepoService],
})
export class MuteRepoModule {}
