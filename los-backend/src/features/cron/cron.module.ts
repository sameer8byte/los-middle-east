import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailReminderCronService } from './services/email-reminder-cron.service';
import { CronController } from './controllers/cron.controller';
import { LoansModule } from '../loans/loans.modules';
import { CommunicationModule } from 'src/core/communication/communication.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CcReminderModule } from '../ccReminder/cc-reminder.module';
import { PartnerDashboardModule } from 'src/app/partner/dashboard/partner.dashboard.modules';
import { CronGuardService } from 'src/common/guards/cron-guard.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    LoansModule,
    CommunicationModule,
    PrismaModule,
    CcReminderModule,
    PartnerDashboardModule,
  ],
  controllers: [CronController],
  providers: [EmailReminderCronService, CronGuardService],
  exports: [EmailReminderCronService, CronGuardService],
})
export class CronModule implements OnModuleInit {
  constructor(private readonly cronGuardService: CronGuardService) {}

  /**
   * Disable cron jobs if running on a cluster worker (non-cron instance)
   */
  onModuleInit(): void {
    if (!this.cronGuardService.isCronEnabled()) {
      this.cronGuardService.disableAllCrons();
    }
  }
}
