import { Module } from '@nestjs/common';
import { RedisExampleController } from './redis-example.controller';

@Module({
  controllers: [RedisExampleController],
})
export class RedisExampleModule {}
