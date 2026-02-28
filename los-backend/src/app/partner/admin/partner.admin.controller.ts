import { Controller, Get, UseGuards } from "@nestjs/common";

import { AuthType } from "src/common/decorators/auth.decorator";
import { Roles } from "src/common/decorators/roles.decorator";
import { RolesGuard } from "src/common/guards/roles.guard";
import { ParterAdminService } from "./partner.admin.services";

@AuthType("partner")
@UseGuards(RolesGuard)
@Controller("partner/admin")
export class PartnerAdminController {
  constructor(private readonly parterAdminService: ParterAdminService) {}

  @Get("brands")
  @Roles("SUPER_ADMIN")
  async getAllBrands() {
    return this.parterAdminService.getAllBrands();
  }
}
