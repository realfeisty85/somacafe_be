import { Module } from '@nestjs/common';
import { ResettokenRepoService } from './resettoken-repo.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResettokenEntity } from './entities/resettoken.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ResettokenEntity])],
  exports: [TypeOrmModule, ResettokenRepoService],
  providers: [ResettokenRepoService],
})
export class ResettokenRepoModule {}
