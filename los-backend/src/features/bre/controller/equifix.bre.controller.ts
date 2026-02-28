import { Controller, Post, Body } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { EquifixBreService } from "../services/equifix.bre.service";

@AuthType("partner")
@Controller("bre/equifax")
export class EquifixBreController {
  constructor(private readonly equifixBreService: EquifixBreService) {}

  @Post()
  async getEquifaxCibilReport(
    @Body() body: { userId: string },
  ) {
    return this.equifixBreService.cibilReport(body.userId);
  }
}
