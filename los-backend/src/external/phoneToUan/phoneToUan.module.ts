import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PhoneToUanService } from './phoneToUan.service';
import { PhoneToUanController } from './phoneToUan.controller';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    PrismaModule,
  ],
  controllers: [PhoneToUanController],
  providers: [PhoneToUanService],
  exports: [PhoneToUanService],
})
export class PhoneToUanModule {}