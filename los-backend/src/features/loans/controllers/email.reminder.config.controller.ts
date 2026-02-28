import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  BadRequestException,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { EmailReminderConfigService } from "../services/email.reminder.config.service";
import { EmailType } from "@prisma/client";
 
export interface CreateEmailReminderConfigDto {
  reminderType: string;
  daysBeforeDue: number;
  isEnabled: boolean;
  frequency: "once" | "daily";
  loanStatuses: string[];
  subjectTemplate: string;
  bodyTemplate: string;
  emailType: EmailType;
}

export interface UpdateEmailReminderConfigDto
  extends Partial<CreateEmailReminderConfigDto> {}

@AuthType("partner")
@Controller("partner/brand/:brandId/email-reminder-configs")
export class EmailReminderConfigController {
  constructor(
    private readonly emailReminderConfigService: EmailReminderConfigService,
  ) {}

  @Get()
  async getEmailReminderConfigs(@Param("brandId") brandId: string) {
    if (!brandId) {
      throw new BadRequestException("Brand ID is required");
    }
    return this.emailReminderConfigService.getConfigsByBrand(brandId);
  }

  @Get(":configId")
  async getEmailReminderConfig(
    @Param("brandId") brandId: string,
    @Param("configId") configId: string,
  ) {
    if (!brandId || !configId) {
      throw new BadRequestException("Brand ID and Config ID are required");
    }
    return this.emailReminderConfigService.getConfigById(brandId, configId);
  }

  @Post()
  async createEmailReminderConfig(
    @Param("brandId") brandId: string,
    @Body() createDto: CreateEmailReminderConfigDto,
  ) {
    if (!brandId) {
      throw new BadRequestException("Brand ID is required");
    }
    return this.emailReminderConfigService.createConfig(brandId, createDto);
  }

  @Put(":configId")
  async updateEmailReminderConfig(
    @Param("brandId") brandId: string,
    @Param("configId") configId: string,
    @Body() updateDto: UpdateEmailReminderConfigDto,
  ) {
    if (!brandId || !configId) {
      throw new BadRequestException("Brand ID and Config ID are required");
    }
    return this.emailReminderConfigService.updateConfig(
      brandId,
      configId,
      updateDto,
    );
  }

  @Delete(":configId")
  async deleteEmailReminderConfig(
    @Param("brandId") brandId: string,
    @Param("configId") configId: string,
  ) {
    if (!brandId || !configId) {
      throw new BadRequestException("Brand ID and Config ID are required");
    }
    return this.emailReminderConfigService.deleteConfig(brandId, configId);
  }

  @Post(":configId/toggle")
  async toggleEmailReminderConfig(
    @Param("brandId") brandId: string,
    @Param("configId") configId: string,
  ) {
    if (!brandId || !configId) {
      throw new BadRequestException("Brand ID and Config ID are required");
    }
    return this.emailReminderConfigService.toggleConfig(brandId, configId);
  }

  @Get("templates/defaults")
  async getDefaultTemplates(@Param("brandId") brandId: string) {
    return this.emailReminderConfigService.getDefaultTemplates();
  }

  @Post("reset-defaults")
  async resetToDefaults(@Param("brandId") brandId: string) {
    if (!brandId) {
      throw new BadRequestException("Brand ID is required");
    }
    return this.emailReminderConfigService.resetToDefaults(brandId);
  }
}
