import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

export interface RedisModuleOptions {
  url: string;
  ttl?: number;
  enabled?: boolean;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly redis: Redis | null;
  private readonly defaultTtl: number;
  private isRedisAvailable = false;

  constructor(@Inject('REDIS_OPTIONS') private readonly options: RedisModuleOptions) {
    this.defaultTtl = options.ttl || 300; // Default 5 minutes
    
    // Check if Redis is disabled via environment variable
    if (options.enabled === false) {
      this.logger.log('🚫 Redis is disabled via configuration - application will run without caching');
      this.redis = null;
      this.isRedisAvailable = false;
      return;
    }
    
    try {
      this.redis = new Redis(options.url, {
        maxRetriesPerRequest: 2,
        lazyConnect: false,
        connectTimeout: 5000, // 5 seconds
        commandTimeout: 3000, // 3 seconds
        enableOfflineQueue: false, // Don't queue commands when offline
      });

      this.redis.on('connect', () => {
        this.logger.log('✅ Redis connected successfully');
        this.isRedisAvailable = true;
      });

      this.redis.on('error', (error) => {
        this.logger.warn('⚠️  Redis connection error (application will continue without caching):', error.message);
        this.isRedisAvailable = false;
      });

      this.redis.on('close', () => {
        this.logger.warn('⚠️  Redis connection closed (application will continue without caching)');
        this.isRedisAvailable = false;
      });

      this.redis.on('reconnecting', () => {
        this.logger.log('🔄 Redis reconnecting...');
      });

    } catch (error) {
      this.logger.warn('⚠️  Failed to initialize Redis client (application will continue without caching):', error.message);
      this.redis = null;
      this.isRedisAvailable = false;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch (error) {
        this.logger.warn('Error closing Redis connection:', error.message);
      }
    }
  }

  private async checkRedisAvailability(): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      await this.redis.ping();
      if (!this.isRedisAvailable) {
        this.isRedisAvailable = true;
        this.logger.log('✅ Redis connection restored');
      }
      return true;
    } catch (error) {
      if (this.isRedisAvailable) {
        this.logger.warn('⚠️  Redis became unavailable (operations will continue without caching)');
        this.isRedisAvailable = false;
      }
      return false;
    }
  }

  getRedisStatus(): { available: boolean; message: string; enabled: boolean } {
    const isDisabled = this.options.enabled === false;
    
    let message: string;
    if (isDisabled) {
      message = 'Redis is disabled via configuration - application running without cache';
    } else if (this.isRedisAvailable) {
      message = 'Redis is available';
    } else {
      message = 'Redis is unavailable - application running without cache';
    }
    
    return {
      available: this.isRedisAvailable,
      enabled: !isDisabled,
      message
    };
  }

  async get<T>(key: string): Promise<T | null> {
    if (!await this.checkRedisAvailability()) {
      return null; // Gracefully fail without cache
    }

    try {
      const value = await this.redis.get(key);
      if (value === null) return null;
      return JSON.parse(value);
    } catch (error) {
      this.logger.warn(`Redis get operation failed for key ${key} (continuing without cache):`, error.message);
      this.isRedisAvailable = false;
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!await this.checkRedisAvailability()) {
      return; // Gracefully fail without cache
    }

    try {
      const serializedValue = JSON.stringify(value);
      const ttlToUse = ttl || this.defaultTtl;
      await this.redis.setex(key, ttlToUse, serializedValue);
    } catch (error) {
      this.logger.warn(`Redis set operation failed for key ${key} (continuing without cache):`, error.message);
      this.isRedisAvailable = false;
    }
  }

  async del(key: string): Promise<void> {
    if (!await this.checkRedisAvailability()) {
      return; // Gracefully fail without cache
    }

    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`Redis delete operation failed for key ${key} (continuing without cache):`, error.message);
      this.isRedisAvailable = false;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!await this.checkRedisAvailability()) {
      return false; // Gracefully fail without cache
    }

    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.warn(`Redis exists operation failed for key ${key} (continuing without cache):`, error.message);
      this.isRedisAvailable = false;
      return false;
    }
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    if (!await this.checkRedisAvailability()) {
      return []; // Gracefully fail without cache
    }

    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      this.logger.warn(`Redis keys operation failed for pattern ${pattern} (continuing without cache):`, error.message);
      this.isRedisAvailable = false;
      return [];
    }
  }

  async ttl(key: string): Promise<number> {
    if (!await this.checkRedisAvailability()) {
      return -1; // Gracefully fail without cache
    }

    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.warn(`Redis TTL operation failed for key ${key} (continuing without cache):`, error.message);
      this.isRedisAvailable = false;
      return -1;
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    if (!await this.checkRedisAvailability()) {
      return false; // Gracefully fail without cache
    }

    try {
      const result = await this.redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      this.logger.warn(`Redis expire operation failed for key ${key} (continuing without cache):`, error.message);
      this.isRedisAvailable = false;
      return false;
    }
  }

  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    if (!await this.checkRedisAvailability()) {
      return keys.map(() => null); // Gracefully fail without cache
    }

    try {
      const values = await this.redis.mget(...keys);
      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      });
    } catch (error) {
      this.logger.warn(`Redis mget operation failed (continuing without cache):`, error.message);
      this.isRedisAvailable = false;
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void> {
    if (!await this.checkRedisAvailability()) {
      return; // Gracefully fail without cache
    }

    try {
      const pipeline = this.redis.pipeline();
      const ttlToUse = ttl || this.defaultTtl;
      
      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serializedValue = JSON.stringify(value);
        pipeline.setex(key, ttlToUse, serializedValue);
      }
      
      await pipeline.exec();
    } catch (error) {
      this.logger.warn(`Redis mset operation failed (continuing without cache):`, error.message);
      this.isRedisAvailable = false;
    }
  }

  async flushall(): Promise<void> {
    if (!await this.checkRedisAvailability()) {
      this.logger.warn('Cannot flush Redis cache - Redis is not available');
      return; // Gracefully fail without cache
    }

    try {
      await this.redis.flushall();
      this.logger.log('✅ Redis cache flushed successfully');
    } catch (error) {
      this.logger.warn(`Redis flushall operation failed (continuing without cache):`, error.message);
      this.isRedisAvailable = false;
    }
  }

  async ping(): Promise<string> {
    if (!this.redis) {
      throw new Error('Redis client not initialized');
    }

    try {
      const result = await this.redis.ping();
      this.isRedisAvailable = true;
      return result;
    } catch (error) {
      this.logger.warn('Redis ping failed:', error.message);
      this.isRedisAvailable = false;
      throw error;
    }
  }

  // Get the raw Redis client for advanced operations (use with caution)
  getClient(): Redis | null {
    return this.redis;
  }
}