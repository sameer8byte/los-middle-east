import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PennyDropService } from './pennyDrop.service';
import { PennyDropController } from './pennyDrop.controller';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    PrismaModule,
  ],
  controllers: [PennyDropController],
  providers: [PennyDropService],
  exports: [PennyDropService],
})
export class PennyDropModule {}
