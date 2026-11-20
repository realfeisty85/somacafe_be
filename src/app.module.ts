import { LivechatRepoModule } from './repositories/livechat-repo/livechat-repo.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestingFormModule } from './apis/testing-form/testing-form.module';
import { UserRepoModule as UserRepoModule } from './repositories/user-repo/user-repo.module';
import { UserApiModule as UserApiModule } from './apis/user-api/user-api.module';
import { UserEntity } from './repositories/user-repo/entities/user.entity';
import { SecurityModule } from './modules/security/security.module';
import { BugsRepoModule } from './repositories/bugs-repo/bugs-repo.module';
import { BugEntity } from './repositories/bugs-repo/entities/bug.entity';
import { ResettokenRepoModule } from './repositories/resettoken-repo/resettoken-repo.module';
import { ResetApiModule } from './apis/reset-api/reset-api.module';
import { SearchApiModule } from './apis/search-api/search-api.module';
import { FollowApiModule } from './apis/follow-api/follow-api.module';
import { FollowRepoModule } from './repositories/follow-repo/follow-repo.module';
import { PostApiModule } from './apis/post-api/post-api.module';
import { PostRepoModule } from './repositories/post-repo/post-repo.module';
import { ReportApiModule } from './apis/report-api/report-api.module';
import { MuteApiController } from './apis/mute-api/mute-api.controller';
import { MuteApiModule } from './apis/mute-api/mute-api.module';
import { BlockApiModule } from './apis/block-api/block-api.module';
import { BookmarkApiModule } from './apis/bookmark-api/bookmark-api.module';
import { ReportRepoModule } from './repositories/report-repo/report-repo.module';
import { BookmarkRepoModule } from './repositories/bookmark-repo/bookmark-repo.module';
import { MuteRepoModule } from './repositories/mute-repo/mute-repo.module';
import { BlockRepoModule } from './repositories/block-repo/block-repo.module';
import { LoggingModule } from './apis/logging/logging.module';
import { LoginApiModule } from './apis/login-api/login-api.module';
import { AuthModule } from './auth/auth.module';
import { PostApiV2Module } from './apis/post-api-v2/post-api-v2.module';
import { UserApiV2Service } from './apis/user-api-v2/user-api-v2.service';
import { UserApiV2Module } from './apis/user-api-v2/user-api-v2.module';
import { MessagingApiModule } from './apis/messaging-api/messaging-api.module';
import { FollowApiV2Module } from './apis/follow-api-v2/follow-api-v2.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationsApiModule } from './apis/notifications-api/notifications-api.module';
import { NotificationsRepoModule } from './repositories/notifications-repo/notifications-repo.module';
import { SearchApiV2Module } from './apis/search-api-v2/search-api-v2.module';
import { RedisModule } from './modules/redis/redis.module';
import { StatusApiModule } from './apis/status-api/status-api.module';
import { EmojiApiModule } from './apis/emoji-api/emoji-api.module';
import { StreamRepoModule } from './repositories/stream-repo/stream-repo.module';
import { StreamApiModule } from './apis/stream-api/stream-api.module';
import { ChatModule } from './chat/chat.module';

require('dotenv').config();

@Module({
  imports: [
    LivechatRepoModule,
    TypeOrmModule.forRoot({
      type: 'mysql',
      name: 'default',
      host: process.env.MYSQL_HOST,
      port: parseInt(process.env.MYSQL_PORT),
      username: process.env.MYSQL_USERNAME,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      entities: [UserEntity, BugEntity],
      synchronize: process.env.NODE_ENV === 'development' ? true : false,
      autoLoadEntities: true,
    }),
    TestingFormModule,
    UserRepoModule,
    UserApiModule,
    SecurityModule,
    BugsRepoModule,
    ResettokenRepoModule,
    ResetApiModule,
    SearchApiModule,
    FollowApiModule,
    FollowRepoModule,
    PostApiModule,
    PostRepoModule,
    ReportApiModule,
    MuteApiModule,
    BlockApiModule,
    BookmarkApiModule,
    ReportRepoModule,
    BookmarkRepoModule,
    MuteRepoModule,
    BlockRepoModule,
    LoggingModule,
    LoginApiModule,
    AuthModule,
    PostApiV2Module,
    UserApiV2Module,
    MessagingApiModule,
    FollowApiV2Module,
    // MailModule,
    EventEmitterModule.forRoot(),
    NotificationsApiModule,
    NotificationsRepoModule,
    SearchApiV2Module,
    RedisModule,
    StatusApiModule,
    EmojiApiModule,
    StreamRepoModule,
    StreamApiModule,
    ChatModule,
  ],
  controllers: [AppController, MuteApiController],
  providers: [AppService, UserApiV2Service],
})
export class AppModule {}
