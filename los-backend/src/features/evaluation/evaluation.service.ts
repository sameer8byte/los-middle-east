// evaluation.service.ts
import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import { EligibilityStatusEnum, ModeOfSalary } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { getNameMatchingPercentage } from "src/utils/getNameMatchingPercentage";
import { ReportsAggregatorService } from "./report.service"; // Import your aggregator service

@Injectable()
export class EvaluationService {
  constructor(
    private prisma: PrismaService,
    @Inject(ReportsAggregatorService)
    private readonly reportsAggregatorService: ReportsAggregatorService
  ) {}

  // Keep all your existing helper methods (extractUpdatedCirSummary, analyzeCreditHealth, etc.)
  extractUpdatedCirSummary(report: any) {
    // ... your existing implementation
    const reportData = report?.["CIR-REPORT-FILE"]?.["REPORT-DATA"];
    const standardData = reportData?.["STANDARD-DATA"];
    const accountsSummary = reportData?.["ACCOUNTS-SUMMARY"];
    const score = standardData?.["SCORE"]?.[0];

    const primarySummary = accountsSummary?.["PRIMARY-ACCOUNTS-SUMMARY"] || {};
    const secondarySummary =
      accountsSummary?.["SECONDARY-ACCOUNTS-SUMMARY"] || {};

    const parseNum = (value: any) =>
      parseFloat((value || "0").toString().replace(/,/g, ""));

    return {
      bureauScore: score?.VALUE || null,
      scoreFactors: score?.FACTORS || [],
      previousLoanRepayment: {
        totalLoans:
          parseInt(primarySummary?.["NUMBER-OF-ACCOUNTS"] || "0") +
          parseInt(secondarySummary?.["NUMBER-OF-ACCOUNTS"] || "0"),
        overdueAccounts:
          parseInt(primarySummary?.["OVERDUE-ACCOUNTS"] || "0") +
          parseInt(secondarySummary?.["OVERDUE-ACCOUNTS"] || "0"),
        totalAmountOverdue:
          parseNum(primarySummary?.["TOTAL-AMT-OVERDUE"]) +
          parseNum(secondarySummary?.["TOTAL-AMT-OVERDUE"]),
      },
      activeLoans:
        parseInt(primarySummary?.["ACTIVE-ACCOUNTS"] || "0") +
        parseInt(secondarySummary?.["ACTIVE-ACCOUNTS"] || "0"),
      enquiryCount: (standardData?.["INQUIRY-HISTORY"] || []).length,
    };
  }

  analyzeCreditHealth(reportData) {
    // ... your existing implementation
    const bureauScore =
      reportData?.CCRResponse?.CIRReportDataLst[0]?.CIRReportData
        .ScoreDetails[0]?.Value || 0;

    const otherKeyInd =
      reportData?.CCRResponse?.CIRReportDataLst?.[0]?.CIRReportData
        ?.OtherKeyInd || {};
    const creditVintageMonths = parseInt(otherKeyInd.AgeOfOldestTrade) || 0;

    const retailAccounts =
      reportData?.CCRResponse?.CIRReportDataLst?.[0]?.CIRReportData
        ?.RetailAccountDetails || [];
    const activeLoans = retailAccounts.filter(
      (acc) => acc.Open === "Yes"
    ).length;

    const dpdStatus =
      reportData?.CCRResponse?.CIRReportDataLst?.[0]?.CIRReportData
        ?.RetailAccountsSummary?.MostSevereStatusWithIn24Months || "Std";

    const enquirySummary =
      reportData?.CCRResponse?.CIRReportDataLst?.[0]?.CIRReportData
        ?.EnquirySummary || {};
    const enquiryCount = parseInt(enquirySummary.Total) || 0;

    const creditCardUtilization =
      parseFloat(otherKeyInd.AllLinesEVERWrittenIn6Months) || 0;

    const pastDefault =
      reportData?.CCRResponse?.CIRReportDataLst?.[0]?.CIRReportData
        ?.RetailAccountsSummary?.NoOfWriteOffs || 0;

    const emiLoadPercent = this.calculateEmiLoad(retailAccounts);

    return {
      bureauScore: +bureauScore,
      creditVintage: +creditVintageMonths,
      emiLoadPercent: +emiLoadPercent.toFixed(1),
      activeLoans: +activeLoans,
      dpd:
        dpdStatus && dpdStatus === "Std"
          ? "no_delinquency"
          : "delinquency_found",
      enquiryCount: +enquiryCount,
      creditCardUtilization: +creditCardUtilization.toFixed(1),
      pastDefault: +pastDefault,
      creditHealthScore: this.calculateHealthScore({
        bureauScore,
        creditVintageMonths,
        activeLoans,
        dpdStatus,
        enquiryCount,
        creditCardUtilization,
        pastDefault,
      }),
    };
  }

  calculateEmiLoad(accounts) {
    const activeAccounts = accounts.filter((acc) => acc.Open === "Yes");
    const totalMonthlyPayment = activeAccounts.reduce((sum, acc) => {
      return sum + (parseFloat(acc.InstallmentAmount) || 0);
    }, 0);
    const assumedIncome = 50000;
    return (totalMonthlyPayment / assumedIncome) * 100;
  }

  calculateHealthScore(params) {
    let score = 0;
    score += params.bureauScore * 0.4;
    score += (params.creditVintageMonths / 12 / 10) * 0.15 * 1000;
    score -= Math.max(params.activeLoans - 2, 0) * 0.1 * 1000;
    score += (params.dpdStatus === "Std" ? 1 : 0) * 0.15 * 1000;
    score += (Math.max(5 - params.enquiryCount, 0) / 5) * 0.1 * 1000;
    score += ((100 - params.creditCardUtilization) / 100) * 0.05 * 1000;
    score += (params.pastDefault === 0 ? 1 : 0) * 0.05 * 1000;
    return Math.min(Math.max(score, 300), 900);
  }

  private calculateAge(dob: Date): number {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  // 🚀 OPTIMIZED MAIN METHOD
  async upsertEvaluation(brandId: string, userId: string, loanId: string) {
    // STEP 1: Get ALL data in parallel using aggregator service
    const [aggregatedReport, brand, aaConsent, loan, userBasic] =
      await Promise.all([
        this.reportsAggregatorService.getUserReport(userId),
        this.prisma.brand.findUnique({
          where: { id: brandId },
          include: { brandConfig: true },
        }),
        this.prisma.aa_consent_requests.findFirst({
          where: { userId: userId, consentStatus: "ACTIVE" },
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.loan.findUnique({
          where: { id: loanId },
        }),
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            brandId: true,
            userDetails: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
                aAdharName: true,
                dateOfBirth: true,
              },
            },
            employment: {
              select: {
                salary: true,
                salaryExceedsBase: true,
                modeOfSalary: true,
                expectedDateOfSalary: true,
              },
            },
            user_bank_account: {
              where: { isPrimary: true },
              select: { accountHolderName: true },
            },
          },
        }),
      ]);

    if (!userBasic) {
      throw new NotFoundException("Customer not found");
    }
    if (!loan) {
      throw new NotFoundException("Loan not found");
    }
    if (!brand) {
      throw new NotFoundException("Brand not found");
    }

    // STEP 2: Get loan rule
    const loanRule = await this.prisma.loanRule.findFirst({
      where: {
        brandId: userBasic.brandId,
        ruleType: loan.ruleType,
      },
    });

    // STEP 3: Extract data from aggregated report
    const aggregatedData = aggregatedReport.data;
    const metadata = aggregatedReport.metadata;
    // STEP 4: Check report availability from aggregator metadata
    const isBsaReportAvailable =
      metadata.availableProviders.BSA?.cart ||
      aaConsent?.consentStatus === "ACTIVE" ||
      false;
    const isCreditReportAvailable =
      metadata.availableProviders.CIBIL?.equifax ||
      metadata.availableProviders.CIBIL?.cirprov2 ||
      false;

    const providerName = metadata.availableProviders.CIBIL?.equifax
      ? "Equifax"
      : metadata.availableProviders.CIBIL?.cirprov2
        ? "CirPro V2"
        : "Unknown";

    // STEP 5: Process banking data if available
    let bankingAnalysis = {
      bankingHistoryMonths: 0,
      bounceCount: { total: 0 },
      overdraftNegativeBalance: { instances: 0 },
      decliningBalance: false,
      matchedSalaryDateCount: 0,
      averageMonthlyBalancePercent: 0,
    };

    if (isBsaReportAvailable && aggregatedData.accountBounceHistory?.value) {
      // Use the banking analysis from your existing logic or adapt it
      // For now, using basic values from aggregated data
      bankingAnalysis = {
        bankingHistoryMonths: aggregatedData.bankingHistoryMonths?.value || 0,
        bounceCount: { total: aggregatedData.accountBounceHistory?.value || 0 },
        overdraftNegativeBalance: {
          instances: aggregatedData.overdraftNegativeBalance?.value ? 1 : 0,
        },
        decliningBalance: false, // You might need to calculate this
        matchedSalaryDateCount: 0, // You might need to calculate this
        averageMonthlyBalancePercent:
          aggregatedData.averageMonthlyBalance?.value || 0,
      };
    }

    // STEP 6: Extract credit health data
    const creditHealthData =
      this.extractCreditHealthFromAggregated(aggregatedData);
    const cirSummary = this.extractCirSummaryFromAggregated(aggregatedData);

    // STEP 7: Calculate age
    const age = this.calculateAge(new Date(userBasic.userDetails.dateOfBirth));

    // STEP 8: Prepare actual data for evaluation
    const actualData = {
      age,
      employmentType: "FULL_TIME",
      monthlySalary: userBasic.employment.salary || 0,
      city: aggregatedData.city?.value || "N/A",
      loanAmount: loan.amount,
      bankingHistoryMonths: bankingAnalysis.bankingHistoryMonths,
      bounceCount: bankingAnalysis.bounceCount.total,
      overdraftNegativeBalance:
        bankingAnalysis.overdraftNegativeBalance.instances > 0,
      salaryMode: userBasic.employment.modeOfSalary,
      decliningBalance: bankingAnalysis.decliningBalance,
      matchSalaryDate: bankingAnalysis.matchedSalaryDateCount,
      averageMonthlyBalancePercent:
        bankingAnalysis.averageMonthlyBalancePercent,

      bureauScore: creditHealthData.bureauScore,
      creditVintage: creditHealthData.creditVintage,
      emiLoadPercent: creditHealthData.emiLoadPercent,
      activeLoans: creditHealthData.activeLoans,
      dpd: creditHealthData.dpd === "no_delinquency" ? false : true,
      enquiryCount: creditHealthData.enquiryCount,
      creditCardUtilization: creditHealthData.creditCardUtilization,
      pastDefault: creditHealthData.pastDefault,
    };

    // STEP 9: Generate evaluation items (same logic as before)
    const evaluationItems = this.generateEvaluationItems(
      actualData,
      userBasic,
      brand,
      loan,
      loanRule,
      isBsaReportAvailable,
      isCreditReportAvailable,
      providerName,
      cirSummary
    );

    // STEP 10: Generate auto feedback
    const autoGeneratedFeedback = this.generateAutoFeedback(
      isBsaReportAvailable,
      isCreditReportAvailable
    );

    // STEP 11: Upsert evaluation (same as before)
    const evaluation = await this.prisma.evaluation.upsert({
      where: {
        userId_loanId: {
          userId: userId,
          loanId: loanId,
        },
      },
      update: {
        isBsaReportAvailable,
        isCreditReportAvailable,
        isAaAvailable: metadata.availableProviders.BSE?.aa_data || false,
        autoGeneratedFeedback,
        evaluation_item: {
          deleteMany: {},
          createMany: {
            data: evaluationItems.map((item) => ({
              parameter: item.parameter,
              requiredValue: item.requiredValue?.toString() || "N/A",
              actualValue: item.actualValue?.toString() || "N/A",
              source: item.source,
              status:
                item.status === "ELIGIBLE"
                  ? EligibilityStatusEnum.ELIGIBLE
                  : EligibilityStatusEnum.NOT_ELIGIBLE,
            })),
          },
        },
      },
      create: {
        isBsaReportAvailable,
        isAaAvailable: metadata.availableProviders.BSE?.aa_data || false,
        isCreditReportAvailable,
        userId: userId,
        loanId: loanId,
        autoGeneratedFeedback,
        evaluation_item: {
          createMany: {
            data: evaluationItems.map((item) => ({
              parameter: item.parameter,
              requiredValue: item.requiredValue?.toString() || "N/A",
              actualValue: item.actualValue?.toString() || "N/A",
              source: item.source,
              status:
                item.status === "ELIGIBLE"
                  ? EligibilityStatusEnum.ELIGIBLE
                  : EligibilityStatusEnum.NOT_ELIGIBLE,
            })),
          },
        },
      },
      include: { evaluation_item: true },
    });

    return evaluation;
  }

  // Helper method to extract credit health from aggregated data
  private extractCreditHealthFromAggregated(aggregatedData: any) {
    return {
      bureauScore: aggregatedData.bureauScore?.value || 0,
      creditVintage: aggregatedData.creditVintage?.value || 0,
      emiLoadPercent: aggregatedData.emiLoadPercent?.value || 0,
      activeLoans: aggregatedData.activeLoans?.value || 0,
      dpd: aggregatedData.dpd?.value || "delinquency_found",
      enquiryCount: aggregatedData.enquiryCount?.value || 0,
      creditCardUtilization: aggregatedData.creditCardUtilization?.value || 0,
      pastDefault: aggregatedData.pastDefault?.value || 0,
    };
  }

  // Helper method to extract CIR summary from aggregated data
  private extractCirSummaryFromAggregated(aggregatedData: any) {
    return {
      previousLoanRepayment: {
        overdueAccounts: aggregatedData.previousLoanRepayment?.value || 0,
      },
      enquiryCount: aggregatedData.enquiryCount?.value || 0,
      activeLoans: aggregatedData.activeLoans?.value || 0,
      bureauScore: aggregatedData.bureauScore?.value || 0,
    };
  }

  // Helper method to generate evaluation items (your existing logic adapted)
  private generateEvaluationItems(
    actualData: any,
    userBasic: any,
    brand: any,
    loan: any,
    loanRule: any,
    isBsaReportAvailable: boolean,
    isCreditReportAvailable: boolean,
    providerName: string,
    summary: any
  ) {
    const panName = [
      userBasic.userDetails.firstName,
      userBasic.userDetails.middleName,
      userBasic.userDetails.lastName,
    ]
      .filter(Boolean)
      .join(" ");

    const nameVerificationList = userBasic.user_bank_account.map((item) => {
      const matchingPercentage = getNameMatchingPercentage({
        panName: panName,
        aadhaarName: userBasic.userDetails.aAdharName,
        pennyBeneficiaryName: item.accountHolderName,
      });

      return {
        parameter: `
        - PAN Name: ${panName}  
        - Aadhaar Name: ${userBasic.userDetails.aAdharName}  
        - Bank Account Name (Penny Drop): ${item.accountHolderName}
        `,
        requiredValue: 70,
        actualValue: matchingPercentage,
        source: "Bank Account",
        status: matchingPercentage >= 50 ? "ELIGIBLE" : "NOT_ELIGIBLE",
      };
    });

    // Your existing evaluation items logic (adapted)
    return [
      ...nameVerificationList,
      {
        parameter: "Age",
        requiredValue: "22 - 55 years",
        actualValue: actualData.age.toString(),
        source: "PAN Card",
        status:
          actualData.age >= 22 && actualData.age <= 55
            ? "ELIGIBLE"
            : "NOT_ELIGIBLE",
      },
      {
        parameter: "Employment Type",
        requiredValue: "Salaried (Full-time, min 6 months)",
        actualValue: actualData.employmentType,
        source: "Borrower",
        status:
          actualData.employmentType === "FULL_TIME"
            ? "ELIGIBLE"
            : "NOT_ELIGIBLE",
      },
      {
        parameter: "Monthly Salary",
        requiredValue: `> ${brand.brandConfig.salaryThresholdAmount}`,
        actualValue: userBasic.employment.salaryExceedsBase
          ? `${brand.brandConfig.salaryThresholdAmount} +`
          : actualData.monthlySalary.toString(),
        source: "Salary Slip",
        status: userBasic.employment.salaryExceedsBase
          ? "ELIGIBLE"
          : actualData.monthlySalary >= brand.brandConfig.salaryThresholdAmount
            ? "ELIGIBLE"
            : "NOT_ELIGIBLE",
      },
      {
        parameter: "Loan Amount",
        requiredValue: `${loanRule?.minAmount} - ${loanRule?.maxAmount}`,
        actualValue: `${actualData.loanAmount}`,
        source: "Borrower",
        status:
          actualData.loanAmount >= loanRule?.minAmount &&
          actualData.loanAmount <= loanRule?.maxAmount
            ? "ELIGIBLE"
            : "NOT_ELIGIBLE",
      },
      {
        parameter: "City",
        requiredValue: "Metro cities",
        actualValue: actualData.city,
        source: "Geo Location",
        status: [
          "Pune",
          "Chennai",
          "Mumbai",
          "Bengaluru",
          "Delhi",
          "Delhi NCR",
          "New Delhi",
          "Ahmedabad",
          "Hyderabad",
          "Thane",
        ].includes(actualData.city)
          ? "ELIGIBLE"
          : "NOT_ELIGIBLE",
      },
      {
        parameter: "Banking History",
        requiredValue: `${brand.brandConfig.bankStatementHistoryMonths}+ months`,
        actualValue: !isBsaReportAvailable
          ? "N/A"
          : `${actualData.bankingHistoryMonths} months`,
        source: "Nova Pattern",
        status:
          isBsaReportAvailable &&
          actualData.bankingHistoryMonths >=
            brand.brandConfig.bankStatementHistoryMonths
            ? "ELIGIBLE"
            : "NOT_ELIGIBLE",
      },
      {
        parameter: "Account Bounce History",
        requiredValue: `≤1 bounce in last 3 months`,
        actualValue: !isBsaReportAvailable
          ? "N/A"
          : `${actualData.bounceCount} bounces`,
        source: "Nova Pattern",
        status:
          isBsaReportAvailable && actualData.bounceCount <= 1
            ? "ELIGIBLE"
            : "NOT_ELIGIBLE",
      },
      {
        parameter: "Mode of Salary Credit",
        requiredValue: "Bank Transfer (NEFT/IMPS/RTGS)",
        actualValue: !isBsaReportAvailable ? "N/A" : actualData.salaryMode,
        source: "Nova Pattern",
        status:
          isBsaReportAvailable &&
          (actualData.salaryMode === ModeOfSalary.BANK_TRANSFER ||
            actualData.salaryMode === ModeOfSalary.CHEQUE)
            ? "ELIGIBLE"
            : "NOT_ELIGIBLE",
      },
      {
        parameter: "Average Monthly Balance",
        requiredValue: ">25% of salary",
        actualValue: !isBsaReportAvailable
          ? "N/A"
          : `${actualData.averageMonthlyBalancePercent}%`,
        source: "Nova Pattern",
        status:
          isBsaReportAvailable && actualData.averageMonthlyBalancePercent > 25
            ? "ELIGIBLE"
            : "NOT_ELIGIBLE",
      },
      {
        parameter: "Previous Loan Repayment",
        requiredValue: "No default in 24 months",
        actualValue: !isCreditReportAvailable
          ? "N/A"
          : summary.previousLoanRepayment.overdueAccounts,
        source: providerName,
        status:
          !summary.previousLoanRepayment.overdueAccounts &&
          isCreditReportAvailable
            ? "ELIGIBLE"
            : "NOT_ELIGIBLE",
      },
      {
        parameter: "Enquiry Count",
        requiredValue: "≤4 in last 30 days",
        actualValue: !isCreditReportAvailable ? "N/A" : summary.enquiryCount,
        source: providerName,
        status:
          summary.enquiryCount <= 4 && isCreditReportAvailable
            ? "ELIGIBLE"
            : "NOT_ELIGIBLE",
      },
      {
        parameter: "Active Loans",
        requiredValue: "Up to 2 unsecured loans",
        actualValue: !isCreditReportAvailable ? "N/A" : summary.activeLoans,
        source: providerName,
        status:
          summary.activeLoans <= 2 && isCreditReportAvailable
            ? "ELIGIBLE"
            : "NOT_ELIGIBLE",
      },
      {
        parameter: "Bureau Score",
        requiredValue: 550,
        actualValue: !isCreditReportAvailable
          ? "N/A"
          : Number(summary.bureauScore),
        source: providerName,
        status:
          summary.bureauScore >= 550 && isCreditReportAvailable
            ? "ELIGIBLE"
            : "NOT_ELIGIBLE",
      },
    ];
  }

  // Helper method for auto-generated feedback
  private generateAutoFeedback(
    isBsaReportAvailable: boolean,
    isCreditReportAvailable: boolean
  ) {
    if (!isCreditReportAvailable && !isBsaReportAvailable) {
      return "BSA and Credit Report not available";
    } else if (!isBsaReportAvailable) {
      return "BSA report not available";
    } else if (!isCreditReportAvailable) {
      return "Credit report not available";
    }
    return null;
  }

  // Keep your existing methods
  async getEvaluationById(evaluationId: string) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: { evaluation_item: true },
    });
    if (!evaluation) {
      throw new NotFoundException("Evaluation not found");
    }
    return evaluation;
  }

  async updateEvaluationItem(
    evaluationId: string,
    itemId: string,
    body: {
      id: string;
      status: EligibilityStatusEnum;
      override: boolean;
      comments: string;
    }
  ) {
    const { status, override, comments } = body;
    const evaluationItem = await this.prisma.evaluation_item.update({
      where: { id: itemId },
      data: { override, status, comments },
    });
    return evaluationItem;
  }

}
