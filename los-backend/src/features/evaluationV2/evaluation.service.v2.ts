import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { current_status_enum, EligibilityStatusEnum } from "@prisma/client";
import { AADataExtractorService } from "src/external/aa/services/aa-data-extractor.service";
import { CartDataExtractorService } from "src/external/cart/services/cart-data-extractor.service";
import {
  CirProV2DataExtractorService,
  ExtractedCirProV2Data,
} from "src/external/cirProV2/services/cirProV2-data-extractor";
import {
  EquifaxDataExtractorService,
  ExtractedEquifaxData,
} from "src/external/equifax/services/equifax-data-extractor";
type EvaluationItem = {
  id: string;
  parameter: string;
  requiredValue: string;
  stage: string;
};

type UserForEvaluation = {
  id: string;
  status_id:bigint|null;
  occupation_type_id:bigint|null;
  is_terms_accepted: boolean;
  email: string | null;
  userDetails?: {
    age?: number | null;
    city?: string | null;
    isGoaAndPanMatching?: boolean | null;
    residenceType?: string | null;
    creditScore?: number | null;
    isAadhaarLinkedWithPan?: boolean | null;
    isFraudulentByCMS?: boolean | null;
    isServicablePinCodesByCMS?: boolean | null;
  } | null;
  employment?: {
    salary?: number | null;
    employmenttype?: string | null;
    companyName?: string | null;
  } | null;
} | null;

type BrandForEvaluation = {
  id: string;
  brandConfig?: {
    id: string;
    createdAt: Date;
    brandId: string;
    updatedAt: Date;
    salaryThresholdAmount: number;
    rejectionDuration: number;
    bankStatementHistoryMonths: number;
    esignFinalCopyRecipients: string;
    autoAllocationType: string;
    // Add other properties as needed
    [key: string]: any;
  } | null;
} | null;

type EvaluationUpdate = {
  where: { id: string };
  data: {
    actualValue: string;
    status: EligibilityStatusEnum;
  };
};

@Injectable()
export class EvaluationV2Service {
  private readonly logger = new Logger(EvaluationV2Service.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aaDataExtractor: AADataExtractorService,
    private readonly cartDataExtractorService: CartDataExtractorService,
    private readonly equifaxDataExtractor: EquifaxDataExtractorService,
    private readonly cirProV2DataExtractor: CirProV2DataExtractorService,
  ) {}

  async upsertEvaluateByLoanId(
    loanId: string,
    userId: string,
    brandId: string,
  ) {
    try {
      // Check if evaluation already exists
      let existingEvaluation = await this.prisma.evaluation.findFirst({
        where: { loanId, userId },
        include: {
          evaluation_item: {
            include: { brand_evaluation_items: true },
          },
        },
      });

      const [brandEvaluationConfig, user, loan] = await Promise.all([
        // Fetch loan here too
        this.prisma.brand_evaluation_items.findMany({
          where: { brandId, isActive: true },
          orderBy: { priority: "asc" },
        }),
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
          },
        }),
        this.prisma.loan.findFirst({
          // Fetch loan data
          where: { id: loanId },
          select: { amount: true },
        }),
      ]);

      if (brandEvaluationConfig.length === 0) {
        throw new NotFoundException("Brand evaluation configuration not found");
      }
      if (!user) {
        throw new NotFoundException("User not found");
      }
      if (!loan) {
        throw new NotFoundException("Loan not found");
      }

      // If evaluation doesn't exist, create it
      if (!existingEvaluation) {
        // Check data availability before creating evaluation
        const dataAvailability = await this.checkDataAvailability(userId);

        existingEvaluation = await this.prisma.evaluation.create({
          data: {
            loanId,
            userId,
            isBsaReportAvailable: dataAvailability?.isBsaReportAvailable,
            isCreditReportAvailable: dataAvailability.isCreditReportAvailable,
            isAaAvailable: dataAvailability.isAaAvailable,
            is_cam_available: dataAvailability.isCamAvailable,
            evaluation_item: {
              create: brandEvaluationConfig.map((item) => ({
                parameter: item.parameter,
                requiredValue: item.requiredValue,
                actualValue: "",
                source: item.sources.join(", "),
                status: EligibilityStatusEnum.NOT_ELIGIBLE,
                override: false,
                comments: "",
                brandEvaluationItemId: item.id,
                stage: item.stage,
                availableSources: item.sources,
              })),
            },
          },
          include: {
            evaluation_item: {
              include: { brand_evaluation_items: true },
            },
          },
        });
      }

      // Always sync all stages to update evaluation items with latest data
      const updatedEvaluation = await this.syncAllStages(
        loanId,
        userId,
        brandId,
      );
      return updatedEvaluation;
    } catch (error) {
      throw error;
    }
  }

  async syncAllStages(loanId: string, userId: string, brandId: string) {
    const [evaluation, user, brand, dataAvailability, loan, documents] =
      await Promise.all([
        this.prisma.evaluation.findFirst({
          where: { loanId, userId },
          include: { evaluation_item: true },
        }),
        this.prisma.user.findUnique({
          where: { id: userId },
          include: {
            userDetails: true,
            employment: {
              select: {
                salary: true,
              },
            },
          },
        }),
        this.prisma.brand.findFirst({
          where: { id: brandId },
          include: { brandConfig: true },
        }),
        this.checkDataAvailability(userId),
        this.prisma.loan.findFirst({
          where: { id: loanId },
          select: { amount: true },
        }),
        this.prisma.document.findMany({
          // Fetch documents with provider data
          where: {
            userId: userId,
            providerData: { not: null },
          },
          select: { providerData: true },
        }),
      ]);

    if (!evaluation) {
      throw new NotFoundException("Evaluation not found");
    }

    if (!loan) {
      throw new NotFoundException("Loan not found");
    }

    if (!brand) {
      throw new NotFoundException("Brand not found");
    }

    // Update data availability flags
    await this.prisma.evaluation.update({
      where: { id: evaluation.id },
      data: {
        isBsaReportAvailable: dataAvailability?.isBsaReportAvailable,
        isCreditReportAvailable: dataAvailability.isCreditReportAvailable,
        is_cam_available: dataAvailability.isCamAvailable,
        isAaAvailable: dataAvailability.isAaAvailable,
      },
    });

    const [
      stageOneUpdates,
      stageTwoUpdates,
      stageThreeUpdates,
      stageFourUpdates,
    ] = await Promise.all([
      this.processStageOneItems(
        loanId,
        evaluation.evaluation_item.filter(
          (item) => item.stage === "ONE" && !item.override,
        ),
        user,
        [brand], // Pass as array to maintain compatibility
        documents, // Pass documents to processStageOneItems
      ),
      this.processStageTwoItems(
        loanId,
        evaluation.evaluation_item.filter(
          (item) => item.stage === "TWO" && !item.override,
        ),
        user,
        [brand], // Pass as array to maintain compatibility
        dataAvailability,
      ),
      this.processStageThreeItems(
        loanId,
        evaluation.evaluation_item.filter(
          (item) => item.stage === "THREE" && !item.override,
        ),
        user,
        [brand], // Pass as array to maintain compatibility
        dataAvailability,
      ),
      this.processStageFourItems(
        loanId,
        evaluation.evaluation_item.filter(
          (item) => item.stage === "FOUR" && !item.override,
        ),
        user,
        [brand], // Pass as array to maintain compatibility
        loan,
      ),
    ]);

    // Batch update all items at once
    const allUpdates = [
      ...stageOneUpdates,
      ...stageTwoUpdates,
      ...stageThreeUpdates,
      ...stageFourUpdates,
    ];

    await Promise.all(
      allUpdates.map((update) => this.prisma.evaluation_item.update(update)),
    );

    return this.getEvaluationByLoanId(loanId, userId);
  }

  private async processStageOneItems(
    loanId: string,
    items: EvaluationItem[],
    user: UserForEvaluation,
    brand: BrandForEvaluation[],
    documents?: any[], // Add documents parameter
  ): Promise<EvaluationUpdate[]> {
    const updates: EvaluationUpdate[] = [];

    // Extract PAN-Aadhaar data from documents
    const panAadhaarData =
      await this.extractPanAadhaarDataFromDocuments(documents);
    const calculatedAge = await this.calculateAgeFromDOB(panAadhaarData.dob);

    for (const item of items) {
      let actualValue = "";
      let status: EligibilityStatusEnum = EligibilityStatusEnum.NOT_ELIGIBLE;

      switch (item.parameter) {
        case "Central De-dupe":
          const isDuplicate = false;
          actualValue = isDuplicate ? "Duplicate Found" : "No Duplicate";
          status = isDuplicate
            ? EligibilityStatusEnum.NOT_ELIGIBLE
            : EligibilityStatusEnum.ELIGIBLE;
          break;

        case "Salaried Person":
          const isSalaried =
            user?.occupation_type_id === BigInt(1) || false; // Assuming 1 represents salaried occupation type
          actualValue = isSalaried ? "Salaried" : "Not Salaried";
          status = isSalaried
            ? EligibilityStatusEnum.ELIGIBLE
            : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "PAN-Aadhaar Link":
          const isLinked =
            panAadhaarData.aadhaarLinked !== null
              ? panAadhaarData.aadhaarLinked
              : user?.userDetails?.isAadhaarLinkedWithPan || false;

          actualValue = isLinked ? "Linked" : "Not Linked";
          status = isLinked
            ? EligibilityStatusEnum.ELIGIBLE
            : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Fraud Database":
          const isFraudulent = user?.userDetails?.isFraudulentByCMS || false;
          actualValue = isFraudulent ? "Fraudulent" : "Clear";
          status = isFraudulent
            ? EligibilityStatusEnum.NOT_ELIGIBLE
            : EligibilityStatusEnum.ELIGIBLE;
          break;

        case "City Category":
          const userCity = (user?.userDetails?.city || "").trim();
          const userCityLower = userCity.toLowerCase();

          // Define city groups
          const catA = [
            "delhi",
            "ncr",
            "new delhi",
            "bengaluru",
            "bangalore",
            "chennai",
            "pune",
            "mumbai",
            "thane",
            "hyderabad",
            "gurugram",
            "gurgaon",
            "noida",
          ];
          const catB = ["bhopal", "indore", "ahmedabad", "surat", "kolkata"];

          // Determine city category
          let cityCategory: string;
          let categoryDisplay: string;

          if (catA.some((c) => userCityLower.includes(c))) {
            cityCategory = "A";
            categoryDisplay = `Cat A - ${userCity}`;
          } else if (catB.some((c) => userCityLower.includes(c))) {
            cityCategory = "B";
            categoryDisplay = `Cat B - ${userCity}`;
          } else {
            cityCategory = "C";
            categoryDisplay = `Cat C - ${userCity}`;
          }

          actualValue = categoryDisplay;
          status =
            cityCategory === "A" || cityCategory === "B"
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Salary Threshold":
          const salary = user?.employment?.salary || 0;
          const brandThreshold =
            brand[0]?.brandConfig?.salaryThresholdAmount || 0;
          // Use the dynamic brand threshold as the required value
          const requiredValue = brandThreshold.toString();

          actualValue = `₹${salary.toLocaleString("en-IN")}`;
          status =
            salary >= brandThreshold
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          // Update the required value in the evaluation item
          await this.prisma.evaluation_item.update({
            where: { id: item.id },
            data: { requiredValue },
          });
          break;

        case "Location":
          // TODO: Implement actual location eligibility logic
          const location =
            user?.userDetails?.isServicablePinCodesByCMS || false;
          actualValue = location ? "Servicable" : "Not Servicable";
          status = location
            ? EligibilityStatusEnum.ELIGIBLE
            : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Address Match":
          const isAddressMatch =
            user?.userDetails?.isGoaAndPanMatching || false;
          actualValue = isAddressMatch ? "Match" : "No Match";
          status = isAddressMatch
            ? EligibilityStatusEnum.ELIGIBLE
            : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Age":
          // Use calculated age from documents first, fallback to userDetails
          const age =
            calculatedAge !== null
              ? calculatedAge
              : user?.userDetails?.age || 0;

          actualValue = age.toString();
          status =
            age >= parseInt(item.requiredValue)
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        default:
          actualValue = "N/A";
          status = EligibilityStatusEnum.NOT_ELIGIBLE;
      }

      updates.push({
        where: { id: item.id },
        data: { actualValue, status },
      });
    }

    return updates;
  }

  // Helper method to extract PAN-Aadhaar data from documents
  private async extractPanAadhaarDataFromDocuments(documents?: any[]): Promise<{
    aadhaarLinked: boolean | null;
    dob: string | null;
  }> {
    if (!documents || documents.length === 0) {
      return { aadhaarLinked: null, dob: null };
    }
    try {
      for (const doc of documents) {
        if (doc.providerData && typeof doc.providerData === "object") {
          const providerData = doc.providerData as any;

          // Check if the document has the expected structure with "result" field
          if (providerData.result && typeof providerData.result === "object") {
            const result = providerData.result;

            // Extract Aadhaar linked status
            const aadhaarLinked =
              result.aadhaar_linked !== undefined
                ? Boolean(result.aadhaar_linked)
                : null;

            // Extract DOB
            const dob = result.dob || null;

            if (aadhaarLinked !== null || dob !== null) {
              return { aadhaarLinked, dob };
            }
          }
        }
      }
    } catch (error) {
      this.logger.error(
        "Error extracting PAN-Aadhaar data from documents",
        error,
      );
    }

    return { aadhaarLinked: null, dob: null };
  }

  // Helper method to calculate age from DOB
  private async calculateAgeFromDOB(
    dobString: string | null,
  ): Promise<number | null> {
    if (!dobString) {
      return null;
    }

    try {
      // Parse the date - handle different formats (DD/MM/YYYY, MM/DD/YYYY, etc.)
      let dob: Date;

      if (dobString.includes("/")) {
        // Handle DD/MM/YYYY format
        const [day, month, year] = dobString.split("/").map(Number);
        dob = new Date(year, month - 1, day); // month is 0-indexed in JavaScript Date
      } else {
        // Try to parse as ISO string or other formats
        dob = new Date(dobString);
      }

      // Check if the date is valid
      if (isNaN(dob.getTime())) {
        this.logger.warn(`Invalid DOB format: ${dobString}`);
        return null;
      }

      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();

      // Adjust age if birthday hasn't occurred this year
      const monthDiff = today.getMonth() - dob.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < dob.getDate())
      ) {
        age--;
      }

      return age;
    } catch (error) {
      this.logger.error("Error calculating age from DOB", error);
      return null;
    }
  }

  private async processStageTwoItems(
    loanId: string,
    items: EvaluationItem[],
    user: UserForEvaluation,
    brand: BrandForEvaluation[],
    dataAvailability?: any,
  ): Promise<EvaluationUpdate[]> {
    const updates: EvaluationUpdate[] = [];

    // Extract AA data - required for stage two items
    let extractedData = null;

    // Use pre-fetched data if available, otherwise fetch fresh data
    if (dataAvailability?.aaConsentRequest?.aa_data_sessions?.[0]?.jsonData) {
      try {
        const primaryJsonData =
          dataAvailability.aaConsentRequest.aa_data_sessions[0].jsonData;
        // For secondary data, we need to fetch with take: 2
        const aaConsentRequestWithSecondary =
          await this.prisma.aa_consent_requests.findFirst({
            where: {
              userId: user?.id || "",
              consentStatus: "ACTIVE",
            },
            orderBy: {
              createdAt: "desc",
            },
            select: {
              aa_data_sessions: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 2,
                select: {
                  jsonData: true,
                },
              },
            },
          });

        const secondaryJsonData =
          aaConsentRequestWithSecondary?.aa_data_sessions?.[1]?.jsonData ||
          null;
        extractedData = await this.aaDataExtractor.extractFinancialData(
          primaryJsonData,
          secondaryJsonData,
        );
      } catch (error) {
        this.logger.error("Error extracting AA data for evaluation", error);
      }
    } else if (dataAvailability?.cartSomeData?.bsaReportDownloadJson) {
      try {
        extractedData =
          await this.cartDataExtractorService.extractFinancialData(
            dataAvailability.cartSomeData.bsaReportDownloadJson,
          );
      } catch (error) {
        this.logger.error(
          "Error extracting AA data from cart_some_table for evaluation",
          error,
        );
      }
    } else {
      // Fallback: fetch fresh data if not provided
      const aaConsentRequest = await this.prisma.aa_consent_requests.findFirst({
        where: {
          userId: user?.id || "",
          consentStatus: "ACTIVE",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          aa_data_sessions: {
            orderBy: {
              createdAt: "desc",
            },
            take: 2,
            select: {
              jsonData: true,
            },
          },
        },
      });

      if (aaConsentRequest?.aa_data_sessions?.[0]?.jsonData) {
        try {
          const primaryJsonData = aaConsentRequest.aa_data_sessions[0].jsonData;
          const secondaryJsonData =
            aaConsentRequest.aa_data_sessions[1]?.jsonData || null;
          extractedData = await this.aaDataExtractor.extractFinancialData(
            primaryJsonData,
            secondaryJsonData,
          );
        } catch (error) {
          this.logger.error("Error extracting AA data for evaluation", error);
        }
      } else {
        const cartSomeData = await this.prisma.cartSomeTable.findFirst({
          where: {
            userId: user?.id || "",
            bsaReportDownloadJson: { not: null },
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            bsaReportDownloadJson: true,
          },
        });
        if (cartSomeData?.bsaReportDownloadJson) {
          try {
            extractedData =
              await this.cartDataExtractorService.extractFinancialData(
                cartSomeData.bsaReportDownloadJson,
              );
          } catch (error) {
            this.logger.error(
              "Error extracting AA data from cart_some_table for evaluation",
              error,
            );
          }
        }
      }
    }
    if (!extractedData) {
      for (const item of items) {
        updates.push({
          where: { id: item.id },
          data: {
            actualValue: "AA/BSA data not available",
            status: EligibilityStatusEnum.NOT_ELIGIBLE,
          },
        });
      }

      return updates;
    }
    for (const item of items) {
      let actualValue = "";
      let status: EligibilityStatusEnum = EligibilityStatusEnum.NOT_ELIGIBLE;

      switch (item.parameter) {
        case "Last three month salary":
          const lastThreeMonthSalary =
            extractedData.lastThreeMonthSalary?.totalAmount || 0;
          actualValue = `₹${lastThreeMonthSalary.toLocaleString("en-IN")}`;
          status =
            lastThreeMonthSalary >= parseInt(item.requiredValue)
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Company Domain":
          const companyName =
            extractedData.companyName?.companyName || "UNKNOWN";
          actualValue = companyName;
          status =
            companyName !== "UNKNOWN"
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Bank statement modified":
          // TODO: Implement actual bank statement verification from extracted data
          const isBankStatementModified = false;
          actualValue = isBankStatementModified ? "Modified" : "Not Modified";
          status = isBankStatementModified
            ? EligibilityStatusEnum.NOT_ELIGIBLE
            : EligibilityStatusEnum.ELIGIBLE;
          break;

        case "Salary Credits Consistency":
          const consistency = extractedData.salaryCreditsConsistency;
          if (consistency) {
            actualValue = consistency.isConsistent
              ? `Consistent (Score: ${(consistency.consistencyScore * 100).toFixed(1)}%)`
              : `Inconsistent (Score: ${(consistency.consistencyScore * 100).toFixed(1)}%)`;
            status = consistency.isConsistent
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          } else {
            actualValue = "Data not available";
            status = EligibilityStatusEnum.NOT_ELIGIBLE;
          }
          break;

        case "Monthly Salary Threshold":
          const avgSalary =
            extractedData.monthlySalaryThreshold?.averageSalary || 0;
          const brandThreshold =
            brand[0]?.brandConfig?.salaryThresholdAmount || 0;

          // Get salary credit details from company name (which includes salary credits)
          const companyData = extractedData.companyName?.companyName || "";
          const salaryCreditsInfo = companyData.includes("Salary Credits:")
            ? companyData.split("| Salary Credits:")[1] || ""
            : "";

          actualValue = `₹${avgSalary.toLocaleString("en-IN")} (avg) | Threshold: ₹${brandThreshold.toLocaleString("en-IN")}${salaryCreditsInfo ? " | " + salaryCreditsInfo : ""}`;
          status =
            avgSalary >= brandThreshold
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Company Name":
          const extractedCompanyName =
            extractedData.companyName?.companyName || "UNKNOWN";
          actualValue = extractedCompanyName;
          status =
            extractedCompanyName !== "UNKNOWN"
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Employment Type":
          const employmentType =
            extractedData.employmentType?.type || "UNKNOWN";
          const confidence = extractedData.employmentType?.confidence || 0;
          actualValue = `${employmentType} (${(confidence * 100).toFixed(0)}% confidence)`;

          // Check if employment type is salaried AND confidence is greater than 75%
          if (employmentType === item.requiredValue && confidence > 0.75) {
            status = EligibilityStatusEnum.ELIGIBLE;
          } else {
            status = EligibilityStatusEnum.NOT_ELIGIBLE;
          }
          break;

        case "Account Bounce History":
          const bounceHistory = extractedData.accountBounceHistory;
          if (bounceHistory) {
            actualValue = bounceHistory.hasBounces
              ? `${bounceHistory.bounceCount} bounces (₹${bounceHistory.totalBounceAmount.toLocaleString("en-IN")})`
              : "No Bounce History";
            status =
              bounceHistory.hasBounces && bounceHistory.bounceCount > 4
                ? EligibilityStatusEnum.NOT_ELIGIBLE
                : EligibilityStatusEnum.ELIGIBLE;
          } else {
            actualValue = "Data not available";
            status = EligibilityStatusEnum.NOT_ELIGIBLE;
          }
          break;

        case "Email id":
          const email = extractedData.emailId?.extractedEmail || "UNKNOWN";
          const isValid = extractedData.emailId?.isValid || false;
          actualValue = `${email} (${isValid ? "valid" : "invalid"})`;
          status =
            email !== "UNKNOWN" && isValid
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Bank address match":
          const address = extractedData.bankAddressMatch?.address || "UNKNOWN";
          actualValue = address;
          status =
            address !== "UNKNOWN"
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Regular Salary Credits":
          const salaryCredits = extractedData.regularSalaryCredits;
          if (salaryCredits) {
            actualValue = salaryCredits.hasRegularCredits
              ? `Regular Credits (${salaryCredits.frequency} months)`
              : "Irregular Credits";
            status = salaryCredits.hasRegularCredits
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          } else {
            actualValue = "Data not available";
            status = EligibilityStatusEnum.NOT_ELIGIBLE;
          }
          break;

        case "Pay Day loans":
          const payDayLoans = extractedData.payDayLoans;
          if (payDayLoans) {
            actualValue = payDayLoans.hasPayDayLoans
              ? `${payDayLoans.loanCount} payday loans (₹${payDayLoans.totalAmount.toLocaleString("en-IN")})`
              : "No Pay Day Loans";
            status = payDayLoans.hasPayDayLoans
              ? EligibilityStatusEnum.NOT_ELIGIBLE
              : EligibilityStatusEnum.ELIGIBLE;
          } else {
            actualValue = "Data not available";
            status = EligibilityStatusEnum.NOT_ELIGIBLE;
          }
          break;

        default:
          actualValue = "Parameter not supported";
          status = EligibilityStatusEnum.NOT_ELIGIBLE;
      }

      updates.push({
        where: { id: item.id },
        data: { actualValue, status },
      });
    }

    return updates;
  }

  private async processStageThreeItems(
    loanId: string,
    items: EvaluationItem[],
    user: UserForEvaluation,
    brand: BrandForEvaluation[],
    dataAvailability?: any,
  ): Promise<EvaluationUpdate[]> {
    const updates: EvaluationUpdate[] = [];

    // Get credit data - use pre-fetched data if available
    let extractedData: ExtractedEquifaxData | ExtractedCirProV2Data | null =
      null;
    let dataSource = "";

    // Use pre-fetched data if available
    if (dataAvailability?.equifax?.braReportJson) {
      this.logger.log("Using pre-fetched Equifax data for user");
      try {
        extractedData = await this.equifaxDataExtractor.extractFinancialData(
          dataAvailability.equifax.braReportJson,
        );
        dataSource = "Equifax";
      } catch (error) {
        this.logger.error(
          "Error extracting Equifax data for evaluation",
          error,
        );
      }
    } else if (dataAvailability?.cirProV2?.rawReportJson) {
      this.logger.log("Using pre-fetched CIR Pro V2 data for user");
      try {
        extractedData = await this.cirProV2DataExtractor.extractFinancialData(
          dataAvailability.cirProV2.rawReportJson,
        );
        dataSource = "CIR Pro V2";
      } catch (error) {
        this.logger.error(
          "Error extracting CIR Pro V2 data for evaluation",
          error,
        );
      }
    } else {
      // Fallback: fetch fresh data if not provided
      const equifax = await this.prisma.equifaxSomeTable.findFirst({
        where: { userId: user?.id || "" },
        orderBy: { createdAt: "desc" },
      });

      if (equifax?.braReportJson) {
        this.logger.log("Equifax data found for user");
        try {
          extractedData = await this.equifaxDataExtractor.extractFinancialData(
            equifax.braReportJson,
          );
          dataSource = "Equifax";
        } catch (error) {
          this.logger.error(
            "Error extracting Equifax data for evaluation",
            error,
          );
        }
      } else {
        const cirProV2 = await this.prisma.cirProV2SomeTable.findFirst({
          where: { userId: user?.id || "" },
          orderBy: { createdAt: "desc" },
        });

        if (cirProV2?.rawReportJson) {
          this.logger.log("CIR Pro V2 data found for user");
          try {
            extractedData =
              await this.cirProV2DataExtractor.extractFinancialData(
                cirProV2.rawReportJson,
              );
            dataSource = "CIR Pro V2";
          } catch (error) {
            this.logger.error(
              "Error extracting CIR Pro V2 data for evaluation",
              error,
            );
          }
        }
      }
    }

    if (!extractedData) {
      for (const item of items) {
        updates.push({
          where: { id: item.id },
          data: {
            actualValue: "Credit data not available",
            status: EligibilityStatusEnum.NOT_ELIGIBLE,
          },
        });
      }
      return updates;
    }

    for (const item of items) {
      let actualValue = "";
      let status: EligibilityStatusEnum = EligibilityStatusEnum.NOT_ELIGIBLE;

      switch (item.parameter) {
        case "Loan Inquiry Count":
          const inquiryCount = extractedData.loanInquiryCount.last30Days;
          actualValue = `${inquiryCount} (Last 30 days) | Total: ${extractedData.loanInquiryCount.count}`;
          // Parse "10" from "<10 inquiries in 30 days"
          const maxInquiries = this.extractNumberFromString(item.requiredValue);
          status =
            inquiryCount < maxInquiries
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Previous Loan Repayment":
          const hasDefault = extractedData.previousLoanRepayment.hasDefault;
          const overdueAccounts =
            extractedData.previousLoanRepayment.overdueAccounts;
          actualValue = hasDefault
            ? `Default found (${overdueAccounts} overdue accounts)`
            : `Good repayment (${overdueAccounts} overdue accounts)`;
          // For "No default in last 6 months" - check if no defaults
          status = !hasDefault
            ? EligibilityStatusEnum.ELIGIBLE
            : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Credit Bureau Score":
          const creditScore = extractedData.creditBureauScore.score;
          actualValue = `${creditScore} (${extractedData.creditBureauScore.scoreType})`;
          // Parse "500" from ">500"
          const minScore = this.extractNumberFromString(item.requiredValue);
          status =
            creditScore > minScore
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "NTC":
          const ntcScore = extractedData.ntc.score;
          actualValue = `${ntcScore} (${extractedData.ntc.consistency} consistency)`;
          // For "0 to 100" - any score in this range should be eligible
          status =
            ntcScore >= 0 && ntcScore <= 100
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Active Pay Day Loans":
          const activePayDayLoans = extractedData.activePayDayLoans.count;
          actualValue =
            activePayDayLoans > 0
              ? `${activePayDayLoans} loans (₹${extractedData.activePayDayLoans.totalAmount.toLocaleString("en-IN")})`
              : "No active payday loans";
          // Parse "4" from "< 4 in last 30 days"
          const maxPaydayLoans = this.extractNumberFromString(
            item.requiredValue,
          );
          status =
            activePayDayLoans < maxPaydayLoans
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Past Due Amount":
          const pastDueAmount = extractedData.pastDueAmount.amount;
          actualValue =
            pastDueAmount > 0
              ? `₹${pastDueAmount.toLocaleString("en-IN")} (${extractedData.pastDueAmount.accountsWithPastDue} accounts)`
              : "No past due amount";
          // For "Nil in last 6 months" - check if amount is 0
          status =
            pastDueAmount === 0
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Addresses Match":
          const addressesMatch = extractedData.addressesMatch.isMatch;
          actualValue = addressesMatch
            ? `Match (${extractedData.addressesMatch.matchScore}% score)`
            : `No Match (${extractedData.addressesMatch.matchScore}% score)`;
          // For "Address verification across sources" - check if addresses match
          status = addressesMatch
            ? EligibilityStatusEnum.ELIGIBLE
            : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        default:
          actualValue = "Parameter not supported";
          status = EligibilityStatusEnum.NOT_ELIGIBLE;
      }

      // Add data source to actual value
      actualValue;

      updates.push({
        where: { id: item.id },
        data: { actualValue, status },
      });
    }

    return updates;
  }

  // Helper method to extract numbers from string requirements
  private extractNumberFromString(requirement: string): number {
    const matches = requirement.match(/\d+/);
    return matches ? parseInt(matches[0]) : 0;
  }

  private async processStageFourItems(
    loanId: string,
    items: EvaluationItem[],
    user: UserForEvaluation,
    brand: BrandForEvaluation[],
    loan?: { amount: number }, // Add loan parameter
  ): Promise<EvaluationUpdate[]> {
    const updates: EvaluationUpdate[] = [];

    for (const item of items) {
      let actualValue = "";
      let status: EligibilityStatusEnum = EligibilityStatusEnum.NOT_ELIGIBLE;

      switch (item.parameter) {
        case "Loan Amount":
          const loanAmount = loan?.amount || 0;

          // Parse the required value range from "From 5,000 to 1,00,000"
          const rangeMatch = item.requiredValue.match(
            /(\d+(?:,\d+)*)\s*to\s*(\d+(?:,\d+)*)/i,
          );

          if (rangeMatch) {
            // Extract and clean the numbers (remove commas)
            const minAmount = parseInt(rangeMatch[1].replace(/,/g, ""));
            const maxAmount = parseInt(rangeMatch[2].replace(/,/g, ""));

            // Check if loan amount is within the range
            const isInRange =
              loanAmount >= minAmount && loanAmount <= maxAmount;

            status = isInRange
              ? EligibilityStatusEnum.ELIGIBLE
              : EligibilityStatusEnum.NOT_ELIGIBLE;

            actualValue = `₹${loanAmount.toLocaleString("en-IN")}`;
          } else {
            // Fallback: try to parse as single number if range parsing fails
            const singleValue = parseInt(item.requiredValue.replace(/,/g, ""));
            if (!isNaN(singleValue)) {
              status =
                loanAmount <= singleValue
                  ? EligibilityStatusEnum.ELIGIBLE
                  : EligibilityStatusEnum.NOT_ELIGIBLE;
              actualValue = `₹${loanAmount.toLocaleString("en-IN")}`;
            } else {
              // If parsing completely fails, mark as not eligible
              status = EligibilityStatusEnum.NOT_ELIGIBLE;
              actualValue = `₹${loanAmount.toLocaleString("en-IN")} | Invalid range format`;
              this.logger.warn(
                `Could not parse loan amount range: ${item.requiredValue}`,
              );
            }
          }
          break;

        case "Aadhar Photo and Selfie Photo match":
          // TODO: Implement actual photo matching
          const isPhotoMatch = true;
          actualValue = isPhotoMatch ? "Match" : "No Match";
          status = isPhotoMatch
            ? EligibilityStatusEnum.ELIGIBLE
            : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        case "Residence Type":
          const residenceType = user?.userDetails?.residenceType || "OWNED";
          actualValue = residenceType;

          // Split the required value by "/" to get allowed residence types
          const allowedResidenceTypes = item.requiredValue
            .split("/")
            .map((type) => type.trim().toUpperCase());

          // Check if user's residence type is in the allowed list (case-insensitive)
          const userResidenceUpper = residenceType.toUpperCase();
          const isResidenceEligible = allowedResidenceTypes.some(
            (allowedType) => userResidenceUpper === allowedType,
          );

          status = isResidenceEligible
            ? EligibilityStatusEnum.ELIGIBLE
            : EligibilityStatusEnum.NOT_ELIGIBLE;

          break;

        case "Loan Eligibility":
          // TODO: Implement overall loan eligibility calculation
          const isEligible = true;
          actualValue = isEligible ? "Eligible" : "Not Eligible";
          status = isEligible
            ? EligibilityStatusEnum.ELIGIBLE
            : EligibilityStatusEnum.NOT_ELIGIBLE;
          break;

        default:
          actualValue = "N/A";
          status = EligibilityStatusEnum.NOT_ELIGIBLE;
      }

      updates.push({
        where: { id: item.id },
        data: { actualValue, status },
      });
    }

    return updates;
  }

  async getEvaluationByLoanId(loanId: string, userId: string) {
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { loanId, userId },
      include: {
        evaluation_item: {
          include: { brand_evaluation_items: true },
          orderBy: { brand_evaluation_items: { priority: "asc" } },
        },
        user: {
          include: {
            employment: {
              select: {
                salary: true,
              },
            },
          },
        },
      },
    });

    if (!evaluation) {
      throw new NotFoundException("Evaluation not found");
    }

    return evaluation;
  }

  async updateEvaluationItem(
    evaluationId: string,
    itemId: string,
    data: {
      actualValue?: string;
      status?: EligibilityStatusEnum;
      override?: boolean;
      comments?: string;
    },
  ) {
    return this.prisma.evaluation_item.update({
      where: { id: itemId, evaluationId },
      data,
      include: { brand_evaluation_items: true },
    });
  }

private async checkDataAvailability(userId: string) {
  try {
    // Optimized single query with proper table names from schema
    const result = await this.prisma.$queryRaw`
      SELECT 
        CASE WHEN aa.id IS NOT NULL THEN true ELSE false END as "isAaAvailable",
        CASE WHEN cart.id IS NOT NULL THEN true ELSE false END as "isBsaReportAvailable",
        CASE WHEN (eq.id IS NOT NULL OR cirpro.id IS NOT NULL) THEN true ELSE false END as "isCreditReportAvailable",
        CASE WHEN cam.id IS NOT NULL THEN true ELSE false END as "isCamAvailable"
      FROM (SELECT 1) t
      LEFT JOIN (
        SELECT DISTINCT aa_consent_requests.id 
        FROM aa_consent_requests
        INNER JOIN aa_data_sessions ON aa_consent_requests.id = aa_data_sessions."consentRequestId"
        WHERE aa_consent_requests."userId" = ${userId}
        AND aa_consent_requests."consentStatus" = 'ACTIVE'
        AND aa_data_sessions."jsonData" IS NOT NULL
        LIMIT 1
      ) aa ON true
      LEFT JOIN (
        SELECT id FROM cart_some_table 
        WHERE "userId" = ${userId} 
        AND "bsaReportDownloadJson" IS NOT NULL 
        LIMIT 1
      ) cart ON true
      LEFT JOIN (
        SELECT id FROM equifax_some_table 
        WHERE "userId" = ${userId} 
        LIMIT 1
      ) eq ON true
      LEFT JOIN (
        SELECT id FROM cirprov2_some_table 
        WHERE "userId" = ${userId} 
        LIMIT 1
      ) cirpro ON true
      LEFT JOIN (
        SELECT id FROM cam_calculators 
        WHERE "userId" = ${userId} 
        LIMIT 1
      ) cam ON true
    `;

    const availability = result[0];

    return {
      isAaAvailable: availability?.isAaAvailable || false,
      isBsaReportAvailable: availability?.isBsaReportAvailable || false,
      isCreditReportAvailable: availability?.isCreditReportAvailable || false,
      isCamAvailable: availability?.isCamAvailable || false,
      aaConsentRequest: null,
      cartSomeData: null,
      equifax: null,
      cirProV2: null,
    };
  } catch (error) {
    this.logger.error("Error checking data availability", error);
    return {
      isAaAvailable: false,
      isBsaReportAvailable: false,
      isCreditReportAvailable: false,
      isCamAvailable: false,
      aaConsentRequest: null,
      cartSomeData: null,
      equifax: null,
      cirProV2: null,
    };
  }
}
  async getDataAvailabilitySummary(loanId: string, userId: string) {
    // Get evaluation with data availability flags in a single query
    const evaluation = await this.prisma.evaluation.findFirst({
      where: { loanId, userId },
      select: {
        isBsaReportAvailable: true,
        isCreditReportAvailable: true,
        isAaAvailable: true,
        is_cam_available: true,
        createdAt: true, // Use createdAt instead of updatedAt
      },
    });

    if (!evaluation) {
      throw new NotFoundException("Evaluation not found");
    }

    // Check if data availability was created recently (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const needsRefresh = evaluation.createdAt < oneHourAgo;

    let currentAvailability = {
      isBsaReportAvailable: evaluation?.isBsaReportAvailable,
      isCreditReportAvailable: evaluation.isCreditReportAvailable,
      isAaAvailable: evaluation.isAaAvailable,
      is_cam_available: evaluation.is_cam_available,
    };

    // Optionally refresh data if it's stale
    if (needsRefresh) {
      const freshAvailability = await this.checkDataAvailability(userId);
      currentAvailability = {
        isBsaReportAvailable: freshAvailability?.isBsaReportAvailable,
        isCreditReportAvailable: freshAvailability.isCreditReportAvailable,
        isAaAvailable: freshAvailability.isAaAvailable,
        is_cam_available: freshAvailability.isCamAvailable,
      };

      // Update the evaluation with fresh data
      await this.prisma.evaluation.updateMany({
        where: { loanId, userId },
        data: currentAvailability,
      });
    }

    const availabilityArray = [
      currentAvailability.isAaAvailable,
      currentAvailability?.isBsaReportAvailable,
      currentAvailability.isCreditReportAvailable,
      currentAvailability.is_cam_available,
    ];

    return {
      ...currentAvailability,
      summary: {
        totalSources: 3,
        availableSources: availabilityArray.filter(Boolean).length,
        missingSourcesCount: availabilityArray.filter((source) => !source)
          .length,
        completionPercentage: Math.round(
          (availabilityArray.filter(Boolean).length / 3) * 100,
        ),
        lastUpdated: evaluation.createdAt,
        isStale: needsRefresh,
      },
    };
  }

  private async getExtractedDataForStage(
    stage: "TWO" | "THREE",
    userId: string,
    dataAvailability?: any,
  ) {
    if (stage === "TWO") {
      // Stage 2: AA/BSA data extraction
      let extractedData = null;

      if (dataAvailability?.aaConsentRequest?.aa_data_sessions?.[0]?.jsonData) {
        try {
          const primaryJsonData =
            dataAvailability.aaConsentRequest.aa_data_sessions[0].jsonData;
          // For secondary data, we need to fetch with take: 2 if not already available
          const secondaryJsonData =
            dataAvailability.aaConsentRequest.aa_data_sessions[1]?.jsonData ||
            null;
          extractedData = await this.aaDataExtractor.extractFinancialData(
            primaryJsonData,
            secondaryJsonData,
          );
        } catch (error) {
          this.logger.error("Error extracting AA data for evaluation", error);
        }
      } else if (dataAvailability?.cartSomeData?.bsaReportDownloadJson) {
        try {
          extractedData =
            await this.cartDataExtractorService.extractFinancialData(
              dataAvailability.cartSomeData.bsaReportDownloadJson,
            );
        } catch (error) {
          this.logger.error(
            "Error extracting BSA data from cart for evaluation",
            error,
          );
        }
      }

      return extractedData;
    } else if (stage === "THREE") {
      // Stage 3: Credit report data extraction
      let extractedData = null;
      let dataSource = "";

      if (dataAvailability?.equifax?.braReportJson) {
        try {
          extractedData = await this.equifaxDataExtractor.extractFinancialData(
            dataAvailability.equifax.braReportJson,
          );
          dataSource = "Equifax";
        } catch (error) {
          this.logger.error(
            "Error extracting Equifax data for evaluation",
            error,
          );
        }
      } else if (dataAvailability?.cirProV2?.rawReportJson) {
        try {
          extractedData = await this.cirProV2DataExtractor.extractFinancialData(
            dataAvailability.cirProV2.rawReportJson,
          );
          dataSource = "CIR Pro V2";
        } catch (error) {
          this.logger.error(
            "Error extracting CIR Pro V2 data for evaluation",
            error,
          );
        }
      }
      return { extractedData, dataSource };
    }
    return null;
  }
}
