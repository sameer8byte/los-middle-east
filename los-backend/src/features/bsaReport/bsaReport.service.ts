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
  ) {}

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

    for (const { name, ref } of providersToTry) {
      if (!ref) {
        this.logger.warn(
          `Skipping provider '${name}': referenceId is missing.`,
        );
        continue;
      }

      const provider = this.providers.find((p) => p.name === name);
      if (!provider) {
        this.logger.warn(
          `Provider '${name}' is configured in logic but not found in provider list.`,
        );
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
        this.logger.error(`Failed with provider '${name}': ${err.message}`);
      }
    }

    throw new BadRequestException(
      "Unable to generate BSA report from any provider.",
    );
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
