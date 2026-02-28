import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { BrandBankAccountService } from "./brandBankAccount.setting.service";
import { CreateBrandBankAccountDto } from "./dto/create-brand-bank-account.dto";
import { UpdateBrandBankAccountDto } from "./dto/update-brand-bank-account.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/settings/brand-bank-account")
export class BrandBankAccountController {
  constructor(
    private readonly brandBankAccountService: BrandBankAccountService,
  ) {}

  // getBrandBankAccounts
  @Get()
  async getBrandBankAccounts(@Param("brandId") brandId: string) {
    return this.brandBankAccountService.getBrandBankAccounts(brandId);
  }
  // getBrandBankAccount
  @Get(":bankAccountId")
  async getBrandBankAccount(
    @Param("brandId") brandId: string,
    @Query("bankAccountId") bankAccountId: string,
  ) {
    return this.brandBankAccountService.getBrandBankAccount(
      brandId,
      bankAccountId,
    );
  }

  @Post()
  async createBrandBankAccount(
    @Param("brandId") brandId: string,
    @Body() bankAccountData: CreateBrandBankAccountDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.brandBankAccountService.createBrandBankAccount(
      brandId,
      bankAccountData,
      partnerUser.id,
    );
  }

  @Post(":bankAccountId")
  async updateBrandBankAccount(
    @Param("brandId") brandId: string,
    @Param("bankAccountId") bankAccountId: string,
    @Body() bankAccountData: UpdateBrandBankAccountDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.brandBankAccountService.updateBrandBankAccount(
      brandId,
      bankAccountId,
      bankAccountData,
      partnerUser.id,
    );
  }
}
