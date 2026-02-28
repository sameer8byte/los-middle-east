import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AcefoneDialerService } from './acefone.dailer.service';
import { AcefoneDialerController } from './acefone.dailer.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { AcefoneService } from 'src/external/acefone/acefone.service';
import { AcefoneController } from 'src/external/acefone/acefone.controller';
import { LoginTokenModule } from 'src/shared/loginToken/login-token.module';

@Module({
  imports: [HttpModule, ConfigModule, LoginTokenModule],
  providers: [AcefoneService, AcefoneDialerService, PrismaService],
  controllers: [AcefoneController, AcefoneDialerController],
  exports: [AcefoneService, AcefoneDialerService],
})
export class AcefoneModule {}
