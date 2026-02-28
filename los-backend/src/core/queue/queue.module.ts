import { Module, OnModuleInit, Logger } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ReminderQueueDispatcherService } from "./reminder-queue-dispatcher.service";
import { ReminderCreatorService } from "./reminder-creator.service";
import { QueueController } from "./queue.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { AwsModule } from "src/core/aws/aws.module";
import { CronGuardService } from "src/common/guards/cron-guard.service";

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AwsModule],
  controllers: [QueueController],
  providers: [ReminderQueueDispatcherService, ReminderCreatorService, CronGuardService],
  exports: [ReminderQueueDispatcherService, ReminderCreatorService, CronGuardService],
})
export class QueueModule implements OnModuleInit {
  private readonly logger = new Logger(QueueModule.name);

  constructor(private readonly cronGuardService: CronGuardService) {}

  /**
   * Disable queue dispatcher cron jobs if running on a cluster worker
   */
  onModuleInit(): void {
    if (this.cronGuardService.isCronEnabled()) {
      this.logger.log('Queue dispatcher cron jobs enabled (cron worker mode)');
    } else {
      this.logger.warn('Queue dispatcher cron jobs disabled (cluster worker mode)');
      this.cronGuardService.disableAllCrons();
    }
  }
}
