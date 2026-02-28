import { ScoreMeService } from "src/external/scoreme/scoreme.service";
import { PrismaService } from "src/prisma/prisma.service";
import { BsaReportInterface } from "../interface/bsa-provider.interface";
import { BadRequestException, Injectable } from "@nestjs/common";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";

@Injectable()
export class ScoreMeProvider implements BsaReportInterface {
  name = "scoreMe";

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoreMeService: ScoreMeService,
    private readonly awsS3Service: AwsPublicS3Service,
  ) {}

  private validateInputs(inputs: Record<string, any>) {
    for (const [key, value] of Object.entries(inputs)) {
      if (!value) {
        throw new BadRequestException(`${key} is required`);
      }
    }
  }

  private async getReportRecord(
    userId: string,
    userBankAccountId: string,
    bankAccountStatementId: string,
  ) {
    const record = await this.prisma.scoreMeSomeTable.findUnique({
      where: {
        userId_userBankAccountId_bankAccountStatementId: {
          userId,
          userBankAccountId,
          bankAccountStatementId,
        },
      },
    });

    if (!record) {
      throw new BadRequestException("ScoreMe record not found");
    }

    if (!record.referenceId) {
      throw new BadRequestException("ScoreMe referenceId is missing");
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
    return await this.scoreMeService.uploadStatementSession(
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
    this.validateInputs({
      brandId,
      userId,
      userBankAccountId,
      bankAccountStatementId,
    });

    const scoreMe = await this.getReportRecord(
      userId,
      userBankAccountId,
      bankAccountStatementId,
    );

    if (!scoreMe.bsaReportJson) {
      return await this.scoreMeService.getStatementReport(scoreMe.referenceId);
    }

    return scoreMe.bsaReportJson;
  }

  async generateReport(
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

    const scoreMe = await this.getReportRecord(
      userId,
      userBankAccountId,
      bankAccountStatementId,
    );
    await this.scoreMeService.downloadReport(
      brandId,
      userId,
      scoreMe.referenceId,
      "json",
    );
    await this.scoreMeService.downloadReport(
      brandId,
      userId,
      scoreMe.referenceId,
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

    await this.initReport(
      brandId,
      userId,
      userBankAccountId,
      bankAccountStatementId,
    );
    await this.generateReport(
      brandId,
      userId,
      userBankAccountId,
      bankAccountStatementId,
    );

    const scoreMe = await this.getReportRecord(
      userId,
      userBankAccountId,
      bankAccountStatementId,
    );

    const reportData = scoreMe.bsaReportJson || {};
    const awsLink = await this.awsS3Service.getSignedUrl(
      scoreMe.bsaReportXlsxPrivateKey,
    );
    return {
      excel: awsLink,
      data: {
        averageBalance: null,
        chequeBounced: null,
        salaryCredit: null,
        outgoingEmi: null,
        largeValueTransactions: null,
        utilityDetails: null,
        eNachBounce: null,
      },
    };
  }
}
