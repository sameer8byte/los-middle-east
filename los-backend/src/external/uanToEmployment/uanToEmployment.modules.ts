import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UanToEmploymentService } from './uanToEmployment.service';
import { UanToEmploymentController } from './uanToEmployment.controller';
import { PhoneToUanModule } from "../phoneToUan/phoneToUan.module";


@Module({
  imports: [
    HttpModule,
    ConfigModule,
    PrismaModule,
    PhoneToUanModule
  ],
  controllers: [UanToEmploymentController],
  providers: [UanToEmploymentService],
  exports: [UanToEmploymentService],
})

export class UanToEmploymentModule {}