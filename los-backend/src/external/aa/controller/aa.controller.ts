// src/aa/aa.controller.ts
// =============================
import { Body, Controller, Post, Get, Param, Query } from "@nestjs/common";
import { AccountAggregatorService } from "../aa.service";
import { AuthType } from "../../../common/decorators/auth.decorator";
import { AAConsentStatus } from "@prisma/client";

@AuthType("public")
@Controller("aa")
export class AccountAggregatorController {
  constructor(private readonly aa: AccountAggregatorService) {}

  @Post("consent-request")
  async createConsentRequest(
    @Body() body: { userId: string; brandId: string }
  ) {
    return this.aa.createConsentRequest(body);
  }

  @Post("consent-request/manual")
  async createManualConsentRequest(
    @Body() body: { userId: string; mobile: string; brandId: string }
  ) {
    return this.aa.createManualConsentRequest(body);
  }

  @Post("redirect-url")
  async createRedirect(@Body() body: { userId: string; clienttrnxid: string }) {
    const { redirectionurl, response } = await this.aa.getRedirectUrl({
      userId: body.userId,
      clienttrnxid: body.clienttrnxid,
    });

    return { redirectionurl, meta: response };
  }

  @Get("consent-request/:id")
  async getConsentRequest(@Param("id") id: string) {
    return this.aa.getConsentRequest(id);
  }

  @Get("user/:userId/consent-requests")
  async getUserConsentRequests(@Param("userId") userId: string) {
    return this.aa.getUserConsentRequests(userId);
  }

  @Get("consent-request/:id/data-sessions")
  async getDataSessions(@Param("id") id: string) {
    return this.aa.getDataSessions(id);
  }

  @Post("user/:userId/send-consent-email")
  async sendConsentRequestEmail(@Param("userId") userId: string) {
    const success = await this.aa.sendConsentRequestEmail(userId);
    return {
      success,
      message: success
        ? "Consent request email sent successfully"
        : "Failed to send consent request email",
    };
  }

  @Post("user/:userId/generate-consent-url")
  async generateConsentUrl(
    @Param("userId") userId: string,
    @Body() body: { brandId: string }
  ) {
    try {
      const consentData = await this.aa.createConsentRequest({
        userId,
        brandId: body.brandId,
      });
      return {
        success: true,
        consentUrl: consentData.redirectionUrl,
        consentRequestId: consentData.consentRequestId,
        message: "Consent URL generated successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Failed to generate consent URL",
      };
    }
  }

  @Post("consent-request/:id/status")
  async updateConsentStatus(
    @Param("id") id: string,
    @Body()
    body: {
      consentStatus: AAConsentStatus;
      clientTransactionId?: string | null;
      consentHandle?: string | null;
    }
  ) {
    return this.aa.updateConsentStatus({
      consentId: id,
      consentStatus: body.consentStatus,
      clientTransactionId: body.clientTransactionId, // Not used here
      consentHandle: body.consentHandle, // Not used here
    });
  }

  @Post("fetch-periodic-data")
  async fetchPeriodicData(
    @Body()
    body: {
      userId: string;
      consentRequestId: string;
    }
  ) {
    return this.aa.fetchPeriodicData(body);
  }
}
