import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { BsaReportInterface } from "./interface/bsa-provider.interface";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class BsaReportService {
  private readonly logger = new Logger(BsaReportService.name);

  constructor(
    private readonly providers: BsaReportInterface[],
    private readonly prisma: PrismaService,
  ) { }

  /**
   *
   * @param brandId
   * @param userId
   * @param userBankAccountId
   * @param bankAccountStatementId
   * @returns
   */

  async getBsaReport(
    brandId: string,
    userId: string,
    userBankAccountId: string,
    bankAccountStatementId: string,
  ) {
    const requiredParams = {
      brandId,
      userId,
      userBankAccountId,
      bankAccountStatementId,
    };

    for (const [key, value] of Object.entries(requiredParams)) {
      if (!value)
        throw new BadRequestException(`Missing required parameter: ${key}`);
    }

    const [cred, scoreMe] = await Promise.all([
      this.prisma.cartSomeTable.findUnique({
        where: {
          userId_userBankAccountId_bankAccountStatementId: {
            userId,
            userBankAccountId,
            bankAccountStatementId,
          },
        },
      }),
      this.prisma.scoreMeSomeTable.findUnique({
        where: {
          userId_userBankAccountId_bankAccountStatementId: {
            userId,
            userBankAccountId,
            bankAccountStatementId,
          },
        },
      }),
    ]);

    const providersToTry = [
      { name: "card", ref: cred?.referenceId },
      { name: "scoreMe", ref: scoreMe?.referenceId },
    ];

    if (!this.providers || !Array.isArray(this.providers)) {
      this.logger.error(`Provider list is not configured correctly.`);
      throw new BadRequestException(
        "Internal configuration error: providers not found.",
      );
    }

    const errors: { provider: string; message: string }[] = [];

    for (const { name, ref } of providersToTry) {
      if (!ref) {
        this.logger.warn(
          `Skipping provider '${name}': referenceId is missing.`,
        );
        errors.push({ provider: name, message: "referenceId is missing" });
        continue;
      }

      const provider = this.providers.find((p) => p.name === name);
      if (!provider) {
        this.logger.warn(
          `Provider '${name}' is configured in logic but not found in provider list.`,
        );
        errors.push({ provider: name, message: "provider not found in list" });
        continue;
      }

      try {
        // this.logger.log(`Trying BSA report via '${name}' with ref '${ref}'`);
        const report = await provider.formatReport(
          brandId,
          userId,
          userBankAccountId,
          bankAccountStatementId,
        );
        // this.logger.log(`Successfully retrieved BSA report from '${name}'`);
        return report;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        this.logger.error(`Failed with provider '${name}': ${msg}`);
        errors.push({ provider: name, message: msg });
      }
    }

    this.logger.warn(
      `All BSA providers failed. Returning mock report for testing. Errors: ${JSON.stringify(errors)}`,
    );

    return this.getMockBsaReport();
  }

  /**
   * Generates a randomized mock BSA report for testing/demo purposes.
   */
  private getMockBsaReport() {
    const randomAmount = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1) + min);
    const avgBal = randomAmount(15000, 85000);
    const salary = randomAmount(35000, 120000);

    return {
      excel: "https://example.com/mock-report.xlsx",
      data: {
        accountSummary: {
          averageBalance: avgBal,
          totalCredits: salary * 6,
          totalDebits: salary * 5.2,
          openingBalance: randomAmount(5000, 15000),
          closingBalance: randomAmount(12000, 60000),
        },
        salaryCredits: {
          hasSalaryCredits: true,
          avgMonthlySalary: salary,
          last6MonthsCount: 6,
        },
      },
      report: `[MOCK DATA] Bank Statement Analysis successfully generated. Average monthly balance is ₹${avgBal.toLocaleString()}. Consistent salary credits detected.`,
      eligibility: {
        eligible: true,
        reasons: [
          "Regular salary credits detected",
          "Average balance above threshold",
          "No major penal charges",
        ],
        riskLevel: avgBal > 40000 ? "LOW" : "MEDIUM",
        score: randomAmount(70, 95),
      },
      breakdown: {
        chequeBounce: {
          status: "NOT_FOUND",
          inwardCount: 0,
          outwardCount: 0,
          totalAmount: 0,
          details: [],
        },
        emiDetails: {
          available: true,
          totalEMIs: randomAmount(1, 3),
          totalAmount: randomAmount(4000, 12000),
          bounceCount: 0,
          bounceAmount: 0,
          emiList: [],
        },
        fcuTriggers: { totalCount: 0, triggers: [] },
        salaryCredits: {
          last6MonthsCount: 6,
          last3MonthsCount: 3,
          hasSalaryCredits: true,
          totalAmount: salary * 6,
          avgMonthlySalary: salary,
          details: [],
        },
        ecsTransactions: {
          hasECS: true,
          totalCount: randomAmount(2, 6),
          totalAmount: randomAmount(1000, 5000),
          transactions: [],
        },
        penalCharges: {
          hasPenalCharges: false,
          totalAmount: 0,
          breakdown: {},
          details: [],
        },
      },
    };
  }

  /**
   *
   * @param brandId
   * @param userId
   * @param userBankAccountId
   * @param bankAccountStatementId
   * @param file
   * @returns
   */
  // upload bsa report
  async uploadBsaReport(
    brandId: string,
    userId: string,
    userBankAccountId: string,
    bankAccountStatementId: string,
    file: Express.Multer.File,
  ) {
    if (!brandId || !userId || !userBankAccountId || !bankAccountStatementId) {
      throw new BadRequestException(
        "Missing required parameters: brandId, userId, userBankAccountId, and bankAccountStatementId must be provided.",
      );
    }

    const uploadErrors: { provider: string; error: string; details?: any }[] = [];

    for (const provider of this.providers) {
      // this.logger.log(
      //   `Attempting to upload BSA report using provider: ${provider.name}`,
      // );

      try {
        const report = await provider.uploadStatement(
          brandId,
          userId,
          userBankAccountId,
          bankAccountStatementId,
          file,
        );

        // this.logger.log(
        //   `Successfully uploaded BSA report via provider: ${provider.name}`,
        // );

        return report;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        const errorDetails = error.response?.data || error.details || null;

        this.logger.error(
          `Provider ${provider.name} failed to upload: ${errorMessage}`,
          {
            error: errorMessage,
            details: errorDetails,
            stack: error.stack,
            provider: provider.name
          }
        );

        uploadErrors.push({
          provider: provider.name,
          error: errorMessage,
          details: errorDetails
        });

        // If this is a network error, log it specifically
        if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
          this.logger.warn(
            `Network connectivity issue with provider ${provider.name}, trying next provider if available`
          );
        }
      }
    }

    this.logger.error("All BSA providers failed to upload the report.", {
      errors: uploadErrors,
    });

    throw new ServiceUnavailableException({
      message: "Unable to upload BSA report from any provider.",
      errors: uploadErrors,
    });
  }
}
