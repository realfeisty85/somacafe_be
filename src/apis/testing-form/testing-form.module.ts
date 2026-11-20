import { Module } from '@nestjs/common';
import { TestingFormService } from './testing-form.service';
import { TestingFormController } from './testing-form.controller';
import { BugsRepoModule } from '../../repositories/bugs-repo/bugs-repo.module';
import { MulterModule } from '@nestjs/platform-express';
import { UserApiModule } from '../user-api/user-api.module';

@Module({
  providers: [TestingFormService],
  controllers: [TestingFormController],
  imports: [
    BugsRepoModule,
    UserApiModule,
    MulterModule.register({
      dest: './public/uploads/bugs',
    }),
  ],
})
export class TestingFormModule {}
