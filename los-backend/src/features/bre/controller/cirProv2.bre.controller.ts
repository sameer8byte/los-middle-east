import { Controller, Post, Body } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { CirProV2BreService } from "../services/cirProV2.bre.service";

@AuthType("partner")
@Controller("bre/cirProV2")
export class CirProV2BreController {
  constructor(private readonly cirProV2BreService: CirProV2BreService) {}

  @Post()
  async getBreCirProV2Report(
    @Body() body: { userId: string; brandId: string },
  ) {
    return this.cirProV2BreService.cibilReport(body.brandId, body.userId);
  }
}
