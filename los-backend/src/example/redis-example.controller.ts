import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseInterceptors,
} from '@nestjs/common';
import { RedisService } from '../core/redis/redis.service';
import { CacheInterceptor, Cache } from '../core/redis';

@Controller('redis-example')
export class RedisExampleController {
  constructor(private readonly redis: RedisService) {}

  @Post('set/:key')
  async setValue(
    @Param('key') key: string,
    @Body() data: { value: any; ttl?: number },
  ) {
    await this.redis.set(key, data.value, data.ttl);
    return {
      success: true,
      message: `Value set for key: ${key}`,
      ttl: data.ttl || 300,
    };
  }

  @Get('get/:key')
  async getValue(@Param('key') key: string) {
    const value = await this.redis.get(key);
    const ttl = await this.redis.ttl(key);
    return {
      key,
      value,
      ttl,
      exists: value !== null,
    };
  }

  @Delete('delete/:key')
  async deleteValue(@Param('key') key: string) {
    await this.redis.del(key);
    return {
      success: true,
      message: `Key deleted: ${key}`,
    };
  }

  @Get('ping')
  async ping() {
    const result = await this.redis.ping();
    return {
      result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('keys/:pattern?')
  async getKeys(@Param('pattern') pattern: string = '*') {
    const keys = await this.redis.keys(pattern);
    return {
      pattern,
      keys,
      count: keys.length,
    };
  }

  // Example of using the cache decorator
  @Get('cached-example/:id')
  @UseInterceptors(CacheInterceptor)
  @Cache({ key: 'example_data', ttl: 60 }) // Cache for 1 minute
  async getCachedExample(@Param('id') id: string) {
    // Simulate expensive operation
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    return {
      id,
      data: `This is expensive data for ${id}`,
      timestamp: new Date().toISOString(),
      message: 'This response will be cached for 1 minute',
    };
  }

  @Post('bulk-set')
  async setBulkValues(@Body() data: Record<string, any>) {
    await this.redis.mset(data);
    return {
      success: true,
      message: `Set ${Object.keys(data).length} keys`,
      keys: Object.keys(data),
    };
  }

  @Post('bulk-get')
  async getBulkValues(@Body() data: { keys: string[] }) {
    const values = await this.redis.mget(...data.keys);
    const result = {};
    
    for (const [index, key] of data.keys.entries()) {
      result[key] = values[index];
    }

    return result;
  }
}
