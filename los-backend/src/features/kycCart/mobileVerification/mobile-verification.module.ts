// src/mobile-verification/mobile-verification.module.ts
import { Module } from '@nestjs/common';
import { MobileVerificationController } from './mobile-verification.controller';
import { MobileVerificationService } from './mobile-verification.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [HttpModule, ConfigModule],
  controllers: [MobileVerificationController],
  providers: [MobileVerificationService],
})
export class MobileVerificationModule {}