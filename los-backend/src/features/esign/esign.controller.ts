import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { EsignService } from "./esign.service";
@Controller("esign")
export class EsignController {
  constructor(private readonly esignService: EsignService) {}

  @AuthType("partner")
  @Post("send-document")
  async sendDocumentForSigning(
    @Body()
    body: {
      userId: string;
      agreementId: string;
      provider: "SIGNDESK" | "SIGNZY" | "DIGITAP";
    },
  ) {
    return this.esignService.sendDocumentForSigning(
      body.userId,
      body.agreementId,
      body.provider,
    );
  }
  @AuthType("web")
  @Post("generate-document")
  async generateEsignDocument(
    @Body()
    body: {
      userId: string;
      loanId: string;
    },
  ) {
    return this.esignService.generateAutoEsignDocument(
      body.userId,
      body.loanId,
    );
  }

  @Get("agreement")
  @AuthType("partner")
  async getAgreements(@Query("loanAgreementId") loanAgreementId: string) {
    return this.esignService.getAgreements(loanAgreementId);
  }

  @Get("agreement-details")
  @AuthType("partner")
  async getAgreementDetails(@Query("loanAgreementId") loanAgreementId: string) {
    return this.esignService.getAgreementDetails(loanAgreementId);
  }

  @AuthType("public")
  @Post("webhook")
  async webhook(
    @Body()
    body: any,
  ) {
    return this.esignService.webhook(body);
  }
  // Signzy V3 Contract webhook
  @AuthType("public")
  @Post("v3/webhook")
  async signzyV3Webhook(
    @Body()
    body: any,
  ) {
    return this.esignService.signzyV3ContractWebhook(body);
  }
  @AuthType("public")
  @Post("digitap/webhook")
  async digitapWebhook(
    @Body()
    body: any,
  ) {
    return this.esignService.digitapWebhook(body);
  }
  // sync status of agreement
  @AuthType("public")
  @Post("sync-agreement-status")
  async syncAgreementStatus(@Body() body: { brandId: string }) {
    return this.esignService.syncAgreementStatus(body.brandId);
  }

  @AuthType("partner")
  @Post("reset-agreement-status")
  async resetAgreementStatus(@Body() body: { loanAgreementId: string }) {
    return this.esignService.resetAgreementStatus(body.loanAgreementId);
  }

  @AuthType("partner")
  @Get("signed-document")
  async getESignedDocument(@Query("loanId") loanId: string) {
    return this.esignService.getESignedDocument(loanId);
  }

  @AuthType("partner")
  @Post("send-for-approved-loan")
  async sendDocumentForApprovedLoan(
    @Body() body: { loanId: string; provider?: "SIGNZY" },
  ) {
    return this.esignService.sendDocumentForApprovedLoan(
      body.loanId,
      body.provider,
    );
  }
}
