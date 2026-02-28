import { Module } from '@nestjs/common';
import { CcReminderController } from './cc-reminder.controller';
import { CcReminderService } from './cc-reminder.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CommunicationModule } from 'src/core/communication/communication.module';
import { LoansModule } from 'src/features/loans/loans.modules';

@Module({
  imports: [PrismaModule, CommunicationModule, LoansModule],
  controllers: [CcReminderController],
  providers: [CcReminderService],
  exports: [CcReminderService],
})
export class CcReminderModule {}
