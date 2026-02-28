import { Controller, Post, Param, Logger } from '@nestjs/common';
import { AuthType } from 'src/common/decorators/auth.decorator';
import { EmailReminderCronService } from '../services/email-reminder-cron.service';

@AuthType('partner')
@Controller('cron')
export class CronController {
  private readonly logger = new Logger(CronController.name);

  constructor(
    private readonly emailReminderCronService: EmailReminderCronService,
  ) {}

  /**
   * Manual trigger endpoint for email reminders
   * POST /cron/trigger-email-reminders
   */
  @Post('trigger-email-reminders')
  async triggerEmailReminders() {
    this.logger.log('Manual trigger request received for all brands');
    return this.emailReminderCronService.triggerManualEmailReminders();
  }

  /**
   * Manual trigger endpoint for email reminders for specific brand
   * POST /cron/trigger-email-reminders/:brandId
   */
  @Post('trigger-email-reminders/:brandId')
  async triggerEmailRemindersForBrand(@Param('brandId') brandId: string) {
    this.logger.log(`Manual trigger request received for brand: ${brandId}`);
    return this.emailReminderCronService.triggerManualEmailReminders(brandId);
  }
}
