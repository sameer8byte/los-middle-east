import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { PartnerUnavailabilityDatesService } from "./partnerUnavailabilityDates.service";
import { CreatePartnerUnavailabilityDateDto } from "./dto/create-partner-unavailability-date.dto";
import { UpdatePartnerUnavailabilityDateDto } from "./dto/update-partner-unavailability-date.dto";
import { GetPartnerUnavailabilityDatesQueryDto } from "./dto/get-partner-unavailability-dates-query.dto";

@AuthType("partner")
@Controller("partner/partner-user/:partnerUserId/unavailability-dates")
export class PartnerUnavailabilityDatesController {
  constructor(
    private readonly partnerUnavailabilityDatesService: PartnerUnavailabilityDatesService,
  ) {}

  @Post()
  async createUnavailabilityDate(
    @Param("partnerUserId") partnerUserId: string,
    @Body() createDto: CreatePartnerUnavailabilityDateDto,
  ) {
    return this.partnerUnavailabilityDatesService.createUnavailabilityDate(
      partnerUserId,
      createDto,
    );
  }

  @Get()
  async getUnavailabilityDates(
    @Param("partnerUserId") partnerUserId: string,
    @Query() query: GetPartnerUnavailabilityDatesQueryDto,
  ) {
    return this.partnerUnavailabilityDatesService.getUnavailabilityDates(
      partnerUserId,
      query,
    );
  }

  @Get(":id")
  async getUnavailabilityDateById(
    @Param("partnerUserId") partnerUserId: string,
    @Param("id") id: string,
  ) {
    return this.partnerUnavailabilityDatesService.getUnavailabilityDateById(
      partnerUserId,
      id,
    );
  }

  @Put(":id")
  async updateUnavailabilityDate(
    @Param("partnerUserId") partnerUserId: string,
    @Param("id") id: string,
    @Body() updateDto: UpdatePartnerUnavailabilityDateDto,
  ) {
    return this.partnerUnavailabilityDatesService.updateUnavailabilityDate(
      partnerUserId,
      id,
      updateDto,
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUnavailabilityDate(
    @Param("partnerUserId") partnerUserId: string,
    @Param("id") id: string,
  ) {
    return this.partnerUnavailabilityDatesService.deleteUnavailabilityDate(
      partnerUserId,
      id,
    );
  }

  @Get("check/:date")
  async checkPartnerAvailable(
    @Param("partnerUserId") partnerUserId: string,
    @Param("date") date: string,
  ) {
    return this.partnerUnavailabilityDatesService.checkIsPartnerAvailable(
      partnerUserId,
      new Date(date),
    );
  }
}
