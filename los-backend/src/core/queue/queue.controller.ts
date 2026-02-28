import { Controller, Get, Post, HttpCode, HttpStatus } from "@nestjs/common";
import { ReminderQueueDispatcherService } from "./reminder-queue-dispatcher.service";
import { ReminderCreatorService } from "./reminder-creator.service";

@Controller("api/v1/queue")
export class QueueController {
  constructor(
    private readonly reminderQueueDispatcherService: ReminderQueueDispatcherService,
    private readonly reminderCreatorService: ReminderCreatorService,
  ) {}

  @Post("dispatch-reminders")
  @HttpCode(HttpStatus.OK)
  async triggerDispatch() {
    const result = await this.reminderQueueDispatcherService.triggerDispatch();
    return {
      ...result,
      message: `${result.count} reminders dispatched to SQS queue`,
    };
  }

  @Post("create-reminders")
  @HttpCode(HttpStatus.OK)
  async triggerCreation() {
    await this.reminderCreatorService.createScheduledReminders();
    return {
      success: true,
      message: "Reminder creation process triggered",
    };
  }

  @Get("stats")
  @HttpCode(HttpStatus.OK)
  async getStats() {
    return await this.reminderQueueDispatcherService.getDispatcherStats();
  }

  @Get("creation-stats")
  @HttpCode(HttpStatus.OK)
  async getCreationStats() {
    return await this.reminderCreatorService.getCreationStats();
  }
}
