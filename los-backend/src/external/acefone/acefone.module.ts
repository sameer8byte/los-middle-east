import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AcefoneService } from './acefone.service';
import { AcefoneController } from './acefone.controller';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [AcefoneService],
  controllers: [AcefoneController],
  exports: [AcefoneService],
})
export class AcefoneModule {}
