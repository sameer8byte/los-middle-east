import { Controller, Post, Get, Body, Param } from "@nestjs/common";
import { ScoreMeBdaService } from "./scoreMeBda.service";
import { AuthType } from "src/common/decorators/auth.decorator";

@AuthType("partner")
@Controller("scoreme-bda")
export class ScoreMeBdaController {
  constructor(private readonly scoreMeBdaService: ScoreMeBdaService) {}

  @Post("initiate-retail/:userId")
  async initiateRetailRequest(
    @Param("userId") userId: string,
    @Body()
    body: {
      firstName?: string;
      middleName?: string;
      lastName?: string;
      address?: string;
      state?: string;
      pincode?: string;
      city?: string;
      mobileNumber?: string;
      panNumber?: string;
      dateOfBirth?: string;
    },
  ) {
    return await this.scoreMeBdaService.initiateRetailRequest(userId, body);
  }

  @Post("validate-otp")
  async validateOtp(@Body() body: { referenceId: string; otp: string }) {
    const { referenceId, otp } = body;
    return await this.scoreMeBdaService.validateOtp(referenceId, otp);
  }

  @Get("report/:referenceId")
  async getBdaReport(@Param("referenceId") referenceId: string) {
    return await this.scoreMeBdaService.getBdaReport(referenceId);
  }
}
