import { Module } from '@nestjs/common';
import { BlockEntity } from './entities/block.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockRepoService } from './block-repo.service';

@Module({
  providers: [BlockRepoService],
  imports: [TypeOrmModule.forFeature([BlockEntity])],
  exports: [TypeOrmModule, BlockRepoService],
})
export class BlockRepoModule {}
