import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from './redis.service';
import { CACHE_KEY, CACHE_TTL } from './cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const cacheKey = this.reflector.get<string>(CACHE_KEY, context.getHandler());
    const cacheTtl = this.reflector.get<number>(CACHE_TTL, context.getHandler());

    if (!cacheKey) {
      return next.handle();
    }

    // Generate cache key with parameters
    const request = context.switchToHttp().getRequest();
    const fullCacheKey = this.generateCacheKey(cacheKey, request);

    // Try to get from cache
    const cachedResult = await this.redisService.get(fullCacheKey);
    if (cachedResult !== null) {
      return of(cachedResult);
    }

    // If not in cache, execute the method and cache the result
    return next.handle().pipe(
      tap(async (result) => {
        if (result !== null && result !== undefined) {
          await this.redisService.set(fullCacheKey, result, cacheTtl);
        }
      }),
    );
  }

  private generateCacheKey(baseKey: string, request: any): string {
    // Include query parameters and body in cache key
    const queryString = JSON.stringify(request.query || {});
    const bodyString = JSON.stringify(request.body || {});
    const userIdString = request.user?.id || 'anonymous';
    
    return `${baseKey}:${Buffer.from(queryString + bodyString + userIdString).toString('base64')}`;
  }
}