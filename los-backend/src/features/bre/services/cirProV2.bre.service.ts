import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { CirProV2Service } from "src/external/cirProV2/cirProV2.service";

@Injectable()
export class CirProV2BreService {
  private readonly logger = new Logger(CirProV2BreService.name);

  constructor(
    private readonly cirProV2Service: CirProV2Service,

  ) {}

  async cibilReport(brandId: string, userId: string) {
    try {
      const response = await this.cirProV2Service.fetchCreditReport(
        brandId,
        userId,
      );

      if (!response) {
        this.logger.error(`No CIBIL report found for user: ${userId}`);
        throw new BadRequestException("CIBIL report not found");
      }

      return response;
    } catch (error) {
      this.logger.error(
        `Error fetching CIBIL report for user ${userId}: ${error.message}`,
      );

      if (error.message?.includes("No pending loan found")) {
        throw new BadRequestException(
          "No pending loan found for the user. A pending loan is required to fetch the CIR PRO V2 report.",
        );
      }
      if (error.message?.includes("CIR PRO V2 Error")) {
        throw new BadRequestException(error.message);
      }
      if (error.message?.includes("User or user details not found")) {
        throw new BadRequestException("User details not found");
      }
      if (error.message?.includes("PAN not found")) {
        throw new BadRequestException("PAN document not found for user");
      }
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        `Failed to fetch CIBIL report: ${error.message}`,
      );
    }
  }
}
