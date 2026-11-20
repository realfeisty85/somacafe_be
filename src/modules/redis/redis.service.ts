import { Injectable, Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

const REDIS_PREFIX = 'sm_';

@Injectable()
export class RedisService {
  // constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async get(key: string): Promise<string> {
    return Promise.resolve(null);
    // return Promise.resolve(await this.cache.get(`${REDIS_PREFIX}${key}`));
  }

  async set(key: string, value: string | any, ttl: number) {
    // await this.cache.set(`${REDIS_PREFIX}${key}`, value, { ttl: ttl });
  }
}
