import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Logger,
} from "@nestjs/common";
import { AccountAggregatorService } from "../aa.service";
import { AuthType } from "src/common/decorators/auth.decorator";
import { PrismaService } from "src/prisma/prisma.service";

@Controller("webhook/aa")
@AuthType("public")
export class AAWebhookController {
  private readonly logger = new Logger(AAWebhookController.name);

  constructor(
    private readonly aaService: AccountAggregatorService,
    private readonly prisma: PrismaService
  ) {}

  // Single endpoint for both ConsentStatusNotification and Push_Data
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers() headers: Record<string, string>,
    @Body() payload: any
  ): Promise<any> {
    try {
      // try {
      //   await this.prisma.aa_webhook.create({
      //     data: { data: payload },
      //   });
      // } catch (e) {
      //   this.logger.error("Failed to log webhook payload to database:", e);
      // }

      if (payload && (payload as any).purpose === "ConsentStatusNotification") {
        const csn = payload as any;
        // Update consent status in database
        await this.aaService.updateConsentStatus({
          clientTransactionId: csn.clienttxnid,
          consentId: csn.ConsentStatusNotification.consentId,
          consentStatus: csn.ConsentStatusNotification.consentStatus,
          consentHandle: csn.ConsentStatusNotification.consentHandle,
        });

        // Store consent notification in aa_consent_notifications table
        await this.aaService.storeConsentNotification({
          txnId: csn.txnid,
          consentId: csn.ConsentStatusNotification.consentId,
          consentHandle: csn.ConsentStatusNotification.consentHandle,
          consentStatus: csn.ConsentStatusNotification.consentStatus,
          fetchType: csn.Fetchtype,
          frequency: csn.Frequency,
          consentStartDate: csn.consentStartDate,
          consentEndDate: csn.consentEndDate,
          notifierId: csn.Notifier?.id,
          notifierType: csn.Notifier?.type,
          timestamp: csn.timestamp,
          purpose: csn.purpose,
          clientTransactionId: csn.clienttxnid,
          rawData: payload,
        });
      }
      // Handle Push_Data
      if (payload && (payload as any).purpose === "Push_Data") {
        const pd = payload as any;

        // Store data session in database
        await this.aaService.storeDataSession({
          clientTransactionId: pd.clienttxnid,
          fipId: pd.fipid,
          fipName: pd.fipname,
          maskedAccountNumber: pd.maskedAccountNumber,
          accRefNumber: pd.accRefNumber,
          dataType: pd.datarequested,
          rawData: payload,
          pdfData: pd.dataDetail?.pdfbase64,
          jsonData: pd.dataDetail?.jsonData,
          xmlData: pd.dataDetail?.xmlData,
          csvData: pd.dataDetail?.csvData,
        });
      }
      // Handle Processed_Data similarly to Push_Data
      if (payload && (payload as any).purpose === "Processed_Data") {
        const pd = payload as any;

        // Store data session in database
        await this.aaService.storeDataSession({
          clientTransactionId: pd.clienttxnid,
          fipId: pd.fipid ?? null,
          fipName: pd.fipname ?? null,
          maskedAccountNumber: pd.maskedAccountNumber ?? null,
          accRefNumber: pd.accRefNumber ?? null,
          dataType: pd.datarequested ?? null,
          rawData: pd, // raw payload saved
          pdfData: pd.dataDetail?.pdfbase64 ?? null,
          jsonData:
            typeof pd.dataDetail?.jsonData === "string"
              ? JSON.parse(pd.dataDetail.jsonData)
              : (pd.dataDetail?.jsonData ?? null),
          xmlData: pd.dataDetail?.xmlData ?? null,
          csvData: pd.dataDetail?.csvData ?? null,
          reportData: pd.dataDetail?.reportData ?? null,
        });
      }

      return {
        clienttxnid: (payload as any)?.clienttxnid ?? null,
        result: "true",
        message: "success",
      };
    } catch (error) {
      this.logger.error("Error processing AA webhook:");
      return {
        clienttxnid: (payload as any)?.clienttxnid ?? null,
        result: "false",
        message: "Error processing webhook",
      };
    }
  }
}
