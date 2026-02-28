import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PartnerActivityTrackingController } from './partner.activity-tracking.controller';
import { PartnerActivityTrackingService } from './partner.activity-tracking.service';

@Module({
  imports: [PrismaModule],
  controllers: [PartnerActivityTrackingController],
  providers: [PartnerActivityTrackingService],
  exports: [PartnerActivityTrackingService],
})
export class PartnerActivityTrackingModule {}


