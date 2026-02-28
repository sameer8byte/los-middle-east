import { SetMetadata } from '@nestjs/common';

export const CACHE_KEY = 'cache_key';
export const CACHE_TTL = 'cache_ttl';

export interface CacheOptions {
  key?: string;
  ttl?: number;
}

export const Cache = (options?: CacheOptions) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(CACHE_KEY, options?.key || `${target.constructor.name}_${propertyKey}`)(target, propertyKey, descriptor);
    SetMetadata(CACHE_TTL, options?.ttl || 300)(target, propertyKey, descriptor);
    return descriptor;
  };
};