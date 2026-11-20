import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
// import * as redisStore from 'cache-manager-redis';

@Module({
  providers: [RedisService],
  imports: [
    // CacheModule.register({
    //   store: redisStore,
    //   host: process.env.REDIS_HOST,
    //   port: parseInt(process.env.REDIS_PORT, 10),
    //   db: parseInt(process.env.REDIS_DB, 10),
    //   keyPrefix: 'sm_',
    // }),
  ],
  exports: [RedisService],
})
export class RedisModule {}
