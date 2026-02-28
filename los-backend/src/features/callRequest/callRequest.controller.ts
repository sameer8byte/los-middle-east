import { Body, Controller, Param, Post } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { CallRequestService } from "./callRequest.service";
import { PrismaService } from "src/prisma/prisma.service";
import { GenerateAccessTokenDto } from "./dto/generate-access-token.dto";

@Controller("partner/brand/:brandId/call-requests")
export class CallRequestController {
  constructor(
    private readonly callRequestService: CallRequestService,
    private readonly prisma: PrismaService,
  ) {}

  @AuthType("partner")
  @Post("generate-access-token")
  async generateAccessToken(
    @Param("brandId") brandId: string,
    @Body() data: GenerateAccessTokenDto,
  ) {
    const { userId, partnerUserId, loanId } = data;

    // Generate access token using the service
    return this.callRequestService.generateAccessToken(
      userId,
      partnerUserId,
      loanId,
    );
  }

  @AuthType("public")
  @Post("recording")
  async recordCall(
    @Param("brandId") brandId: string,
    @Body() data: { userCallRecordingsId: string },
  ) {
    return this.callRequestService.getRecording(data.userCallRecordingsId);
  }
}
