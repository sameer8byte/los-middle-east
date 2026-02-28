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
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { BrandNonRepaymentDatesService } from "./brandNonRepaymentDates.service";
import { CreateNonRepaymentDateDto } from "./dto/create-non-repayment-date.dto";
import { UpdateNonRepaymentDateDto } from "./dto/update-non-repayment-date.dto";
import { GetNonRepaymentDatesQueryDto } from "./dto/get-non-repayment-dates-query.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/settings/non-repayment-dates")
export class BrandNonRepaymentDatesController {
  constructor(
    private readonly brandNonRepaymentDatesService: BrandNonRepaymentDatesService,
  ) {}

  @Post()
  async createNonRepaymentDate(
    @Param("brandId") brandId: string,
    @Body() createDto: CreateNonRepaymentDateDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.brandNonRepaymentDatesService.createNonRepaymentDate(
      brandId,
      createDto,
      partnerUser.id,
    );
  }

  @Get()
  async getNonRepaymentDates(
    @Param("brandId") brandId: string,
    @Query() query: GetNonRepaymentDatesQueryDto,
  ) {
    return this.brandNonRepaymentDatesService.getNonRepaymentDates(
      brandId,
      query,
    );
  }

  @Get(":id")
  async getNonRepaymentDateById(
    @Param("brandId") brandId: string,
    @Param("id") id: string,
  ) {
    return this.brandNonRepaymentDatesService.getNonRepaymentDateById(
      brandId,
      id,
    );
  }

  @Put(":id")
  async updateNonRepaymentDate(
    @Param("brandId") brandId: string,
    @Param("id") id: string,
    @Body() updateDto: UpdateNonRepaymentDateDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.brandNonRepaymentDatesService.updateNonRepaymentDate(
      brandId,
      id,
      updateDto,
      partnerUser.id,
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNonRepaymentDate(
    @Param("brandId") brandId: string,
    @Param("id") id: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.brandNonRepaymentDatesService.deleteNonRepaymentDate(
      brandId,
      id,
      partnerUser.id,
    );
  }

  @Get("check/:date")
  async checkRepaymentAllowed(
    @Param("brandId") brandId: string,
    @Param("date") date: string,
    @Query("state") state?: string,
  ) {
    return this.brandNonRepaymentDatesService.checkIsRepaymentAllowed(
      brandId,
      new Date(date),
      state,
    );
  }
}
