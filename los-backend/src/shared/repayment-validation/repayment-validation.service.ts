import { Injectable } from "@nestjs/common";
import { BrandNonRepaymentDatesService } from "../../app/partner/settings/brandNonRepaymentDates/brandNonRepaymentDates.service";

@Injectable()
export class RepaymentValidationService {
  constructor(
    private readonly brandNonRepaymentDatesService: BrandNonRepaymentDatesService,
  ) {}

  /**
   * Validates if a repayment is allowed for a specific brand, date, and state
   * This service can be used by the loan processing system
   */
  async validateRepaymentDate(
    brandId: string,
    repaymentDate: Date,
    userState?: string,
  ): Promise<{
    isAllowed: boolean;
    reason?: string;
    conflictingRule?: {
      date: string;
      reason: string;
      state: string;
    };
  }> {
    const result =
      await this.brandNonRepaymentDatesService.checkIsRepaymentAllowed(
        brandId,
        repaymentDate,
        userState,
      );

    return {
      isAllowed: result.isRepaymentAllowed,
      reason: result.reason || undefined,
      conflictingRule: result.reason
        ? {
            date: repaymentDate.toISOString().split("T")[0],
            reason: result.reason,
            state: result.state || "all",
          }
        : undefined,
    };
  }

  /**
   * Suggests the next available repayment date if the requested date is not allowed
   */
  async suggestNextAvailableDate(
    brandId: string,
    requestedDate: Date,
    userState?: string,
    maxDaysAhead: number = 30,
  ): Promise<{
    suggestedDate: Date | null;
    daysDelayed: number;
  }> {
    const currentDate = new Date(requestedDate);

    for (let daysAhead = 0; daysAhead <= maxDaysAhead; daysAhead++) {
      const testDate = new Date(currentDate);
      testDate.setDate(testDate.getDate() + daysAhead);

      const validation = await this.validateRepaymentDate(
        brandId,
        testDate,
        userState,
      );

      if (validation.isAllowed) {
        return {
          suggestedDate: testDate,
          daysDelayed: daysAhead,
        };
      }
    }

    return {
      suggestedDate: null,
      daysDelayed: -1,
    };
  }

  /**
   * Batch validation for multiple dates
   * Useful for validating repayment schedules
   */
  async validateMultipleDates(
    brandId: string,
    dates: Date[],
    userState?: string,
  ): Promise<
    Array<{
      date: Date;
      isAllowed: boolean;
      reason?: string;
    }>
  > {
    const validations = await Promise.all(
      dates.map(async (date) => {
        const result = await this.validateRepaymentDate(
          brandId,
          date,
          userState,
        );
        return {
          date,
          isAllowed: result.isAllowed,
          reason: result.reason,
        };
      }),
    );

    return validations;
  }
}
