import { PrismaService } from "src/prisma/prisma.service";
import { BsaReportInterface } from "../interface/bsa-provider.interface";
import { Injectable } from "@nestjs/common";
import { CardService } from "src/external/cart/services/cart.service";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { BankStatementService } from "src/external/cart/bankStatementService";

@Injectable()
export class CardProvider implements BsaReportInterface {
  name = "card";

  constructor(
    private readonly prisma: PrismaService,
    private readonly cardService: CardService,
    private readonly awsS3Service: AwsPublicS3Service,
  ) {}

  private validateInputs(inputs: Record<string, any>) {
    for (const [key, value] of Object.entries(inputs)) {
      if (!value) {
        throw new Error(`${key} is required`);
      }
    }
  }
  private async getReportRecord(
    userId: string,
    userBankAccountId: string,
    bankAccountStatementId: string,
  ) {
    const record = await this.prisma.cartSomeTable.findUnique({
      where: {
        userId_userBankAccountId_bankAccountStatementId: {
          userId,
          userBankAccountId,
          bankAccountStatementId,
        },
      },
    });

    if (!record) {
      throw new Error("Card record not found");
    }

    if (!record.referenceId) {
      throw new Error("Card referenceId is missing");
    }

    return record;
  }
  async uploadStatement(
    brandId: string,
    userId: string,
    userBankAccountId: string,
    bankAccountStatementId: string,
    file: Express.Multer.File,
  ) {
    this.validateInputs({
      brandId,
      userId,
      userBankAccountId,
      bankAccountStatementId,
      file,
    });
    return await this.cardService.uploadStatementSession(
      userId,
      bankAccountStatementId,
      userBankAccountId,
      file,
    );
  }

  async initReport(
    brandId: string,
    userId: string,
    userBankAccountId: string,
    bankAccountStatementId: string,
  ) {
    return true;
  }

  async generateReport(
    brandId: string,
    userId: string,
    userBankAccountId: string,
    bankAccountStatementId: string,
  ) {
    await this.validateInputs({
      brandId,
      userId,
      userBankAccountId,
      bankAccountStatementId,
    });
    const cart = await this.getReportRecord(
      userId,
      userBankAccountId,
      bankAccountStatementId,
    );

    await this.cardService.downloadReport(
      brandId,
      userId,
      cart.referenceId,
      "json",
    );
    await this.cardService.downloadReport(
      brandId,
      userId,
      cart.referenceId,
      "xlsx",
    );

    return true;
  }

  async formatReport(
    brandId: string,
    userId: string,
    userBankAccountId: string,
    bankAccountStatementId: string,
  ) {
    this.validateInputs({
      brandId,
      userId,
      userBankAccountId,
      bankAccountStatementId,
    });
    await this.generateReport(
      brandId,
      userId,
      userBankAccountId,
      bankAccountStatementId,
    );
    const cart = await this.getReportRecord(
      userId,
      userBankAccountId,
      bankAccountStatementId,
    );
    const awsLink = await this.awsS3Service.getSignedUrl(
      cart.bsaReportXlsxPrivateKey,
    );
    const bankStatementJson =
      typeof cart.bsaReportDownloadJson === "string"
        ? JSON.parse(cart.bsaReportDownloadJson)
        : null;

    // Example usage:

    // Basic analysis
    const analysis =
      await BankStatementService.analyzeBankStatementData(bankStatementJson);

    // Get formatted report
    const report =
      await BankStatementService.getFormattedReport(bankStatementJson);

    // Check loan eligibility
    const eligibility =
      await BankStatementService.performLoanEligibilityCheck(bankStatementJson);

    // Get detailed breakdown
    const breakdown =
      await BankStatementService.getDetailedBreakdown(bankStatementJson);

    return {
      excel: awsLink, // Assuming the record has an excelUrl field
      data: analysis,
      report,
      eligibility,
      breakdown,
    };
  }
}
