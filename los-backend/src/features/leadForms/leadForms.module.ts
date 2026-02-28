import { Module } from '@nestjs/common';
import { LeadFormsController } from './leadForms.controller';
import { LeadFormsService } from './leadForms.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [LeadFormsController],
  providers: [LeadFormsService, PrismaService],
  exports: [LeadFormsService],
})
export class LeadFormsModule {}
