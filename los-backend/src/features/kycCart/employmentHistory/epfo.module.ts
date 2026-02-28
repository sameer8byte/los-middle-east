// src/epfo/epfo.module.ts
import { Module } from '@nestjs/common';
import { EpfoController } from './epfo.controller';
import { EpfoService } from './epfo.service';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PhoneToUanModule } from "../../../external/phoneToUan/phoneToUan.module";
import { UanToEmploymentModule } from "../../../external/uanToEmployment/uanToEmployment.modules";

@Module({
  imports: [
    HttpModule, 
    ConfigModule,
    PhoneToUanModule, // Import the MODULE
    UanToEmploymentModule // Import the MODULE
  ],
  controllers: [EpfoController],
  providers: [EpfoService],
  // Remove individual services from providers when importing modules
})
export class EpfoModule {}