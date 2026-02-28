import { Module, DynamicModule, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { CacheInterceptor } from './cache.interceptor';

export interface RedisModuleOptions {
  url: string;
  ttl?: number;
  enabled?: boolean;
}

@Global()
@Module({})
export class RedisModule {
  static register(options: RedisModuleOptions): DynamicModule {
    return {
      module: RedisModule,
      providers: [
        {
          provide: 'REDIS_OPTIONS',
          useValue: options,
        },
        {
          provide: RedisService,
          useFactory: (redisOptions: RedisModuleOptions) => {
            try {
              return new RedisService(redisOptions);
            } catch (error) {
              console.warn('⚠️  Redis initialization failed - application will continue without caching:', error.message);
              // Return a mock service or handle gracefully
              return new RedisService(redisOptions);
            }
          },
          inject: ['REDIS_OPTIONS'],
        },
        CacheInterceptor,
      ],
      exports: [RedisService, CacheInterceptor],
      global: true,
    };
  }
}