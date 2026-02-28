// controllers/blocklist.controller.ts
import { Body, Controller, Post } from "@nestjs/common";
import { BlocklistService } from "./blocklist.service";
import { UpsertBlocklistDto } from "./dto/upsert-blocklist.dto";
import { AuthType } from "src/common/decorators/auth.decorator";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";

@AuthType("partner")
@Controller("blocklist")
export class BlocklistController {
  constructor(private readonly service: BlocklistService) {}

  @Post("pan")
  async upsertPan(@Body() dto: UpsertBlocklistDto, @GetPartnerUser() partnerUser: AuthenticatedPartnerUser) {
    return this.service.upsertPan(dto, partnerUser.id);
  }

  @Post("mobile")
  async upsertMobile(@Body() dto: UpsertBlocklistDto, @GetPartnerUser() partnerUser: AuthenticatedPartnerUser) {
    return this.service.upsertMobile(dto, partnerUser.id);
  }

  @Post("aadhar")
  async upsertAadhar(@Body() dto: UpsertBlocklistDto, @GetPartnerUser() partnerUser: AuthenticatedPartnerUser) {
    return this.service.upsertAadhar(dto, partnerUser.id);
  }

  @Post("account-number")
  async upsertAccountNumber(@Body() dto: UpsertBlocklistDto, @GetPartnerUser() partnerUser: AuthenticatedPartnerUser) {
    return this.service.upsertAccountNumber(dto, partnerUser.id);
  }
}
