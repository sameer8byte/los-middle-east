import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

function safeParse(json: any): any {
  if (!json) return {};
  if (typeof json === "string") {
    try {
      return JSON.parse(json);
    } catch {
      return {};
    }
  }
  return json;
}

function calculateAge(dobStr: string | null): number | null {
  if (!dobStr) return null;
  try {
    let date: Date;

    if (dobStr.includes("-") || dobStr.includes("/")) {
      const sep = dobStr.includes("-") ? "-" : "/";
      const parts = dobStr.split(sep).map((p) => p.trim());

      if (parts.length === 3) {
        if (parts[2].length === 4) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          date = new Date(year, month, day);
        } else {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          date = new Date(year, month, day);
        }
      } else {
        date = new Date(dobStr);
      }
    } else {
      date = new Date(dobStr);
    }

    if (isNaN(date.getTime())) return null;
    const diff = Date.now() - date.getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  } catch {
    return null;
  }
}

function toNumberSafe(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[,₹\s]/g, "").replace(/[^\d.-]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function firstNonEmpty<T>(...vals: (T | null | undefined)[]): T | null {
  for (const v of vals) {
    if (
      v !== undefined &&
      v !== null &&
      !(typeof v === "string" && v.trim() === "")
    )
      return v as T;
  }
  return null;
}

function ensureArray(val: any): any[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

function findKey(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== "object") return null;
  const queue = [obj];
  const visited = new Set<any>();

  while (queue.length) {
    const cur = queue.shift();
    if (!cur || typeof cur !== "object" || visited.has(cur)) continue;
    visited.add(cur);

    for (const k of Object.keys(cur)) {
      if (keys.includes(k)) return cur[k];
      const v = cur[k];
      if (v && typeof v === "object") queue.push(v);
    }
  }
  return null;
}

interface FieldSource {
  value: any;
  source: {
    type: "BSE" | "BSA" | "CIBIL" | "USER_GEO";
    provider: string;
    table: string;
  } | null;
}

@Injectable()
export class ReportsAggregatorService {
  constructor(private prisma: PrismaService) {}

  async getUserReport(userId: string) {
    // OPTIMIZED: Use Raw SQL for all data source queries with null checks
    const [
      cartResults,
      equifaxResults,
      scoremeResults,
      cirproResults,
      userDetails,
      aaDataSessions,
      userGeoTag,
    ] = await Promise.all([
      // Raw SQL for tables with JSON data - much faster with null checks
      this.prisma.$queryRaw`
 SELECT "bsaReportDownloadJson", "createdAt" 
 FROM "cart_some_table" 
 WHERE "userId" = ${userId} 
 AND "bsaReportDownloadJson" IS NOT NULL 
 AND LENGTH(TRIM("bsaReportDownloadJson"::text)) > 0
 ORDER BY "createdAt" DESC 
 LIMIT 1
 `,
      this.prisma.$queryRaw`
 SELECT "braReportJson", "createdAt" 
 FROM "equifax_some_table" 
 WHERE "userId" = ${userId} 
 AND "braReportJson" IS NOT NULL 
 AND LENGTH(TRIM("braReportJson"::text)) > 0
 ORDER BY "createdAt" DESC 
 LIMIT 1
 `,
      this.prisma.$queryRaw`
 SELECT "submitOtp", "createdAt" 
 FROM "scoreme_some_table" 
 WHERE "userId" = ${userId} 
 AND "submitOtp" IS NOT NULL 
 AND LENGTH(TRIM("submitOtp"::text)) > 0
 ORDER BY "createdAt" DESC 
 LIMIT 1
 `,
      this.prisma.$queryRaw`
 SELECT "rawReportJson", "createdAt" 
 FROM "cirprov2_some_table" 
 WHERE "userId" = ${userId} 
 AND "rawReportJson" IS NOT NULL 
 AND LENGTH(TRIM("rawReportJson"::text)) > 0
 ORDER BY "createdAt" DESC 
 LIMIT 1
 `,
      // Prisma for simple user query
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          userDetails: {
            select: {
              firstName: true,
              dateOfBirth: true,
            },
          },
        },
      }),
      // Prisma for AA sessions (already fast)
      this.prisma.aa_data_sessions.findMany({
        where: { consentRequestId: userId },
        select: { rawData: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
      // Prisma for user geo tag (already fast)
      this.prisma.userGeoTag.findFirst({
        where: { userId },
        select: {
          city: true,
          state: true,
          latitude: true,
          longitude: true,
          address: true,
          country: true,
          district: true,
          postalCode: true,
          street: true,
          sublocality: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Extract the first record from raw SQL results
    const cartRecord = cartResults[0] || null;
    const equifaxRecord = equifaxResults[0] || null;
    const scoremeRecord = scoremeResults[0] || null;
    const cirproRecord = cirproResults[0] || null;

    // Safe parse from records
    const cartJson: any = cartRecord
      ? safeParse(cartRecord.bsaReportDownloadJson)
      : {};
    const equifaxJson: any = equifaxRecord
      ? safeParse(equifaxRecord.braReportJson)
      : {};
    const scoremeJson: any = scoremeRecord
      ? safeParse(scoremeRecord.submitOtp)
      : {};
    const cirproJson: any = cirproRecord
      ? safeParse(cirproRecord.rawReportJson)
      : {};

    // Parse AA sessions data (PRIORITY SOURCE)
    let aaData: any = {};
    for (const session of aaDataSessions) {
      const rawJson = safeParse(session.rawData);
      if (rawJson) {
        aaData.loanAmount = firstNonEmpty(
          aaData.loanAmount,
          findKey(rawJson, ["loanAmount", "loan-amount", "LoanAmount"])
        );
        aaData.city = firstNonEmpty(
          aaData.city,
          findKey(rawJson, ["city", "City"])
        );
        aaData.monthlySalary = firstNonEmpty(
          aaData.monthlySalary,
          findKey(rawJson, ["monthlySalary", "monthly-salary", "MonthlySalary"])
        );
        aaData.employmentType = firstNonEmpty(
          aaData.employmentType,
          findKey(rawJson, [
            "employmentType",
            "employment-type",
            "EmploymentType",
            "occupation",
            "Occupation",
          ])
        );
        aaData.age = firstNonEmpty(
          aaData.age,
          findKey(rawJson, ["age", "Age"])
        );
        aaData.pan = firstNonEmpty(
          aaData.pan,
          findKey(rawJson, ["pan", "PAN"])
        );
        aaData.aadhaar = firstNonEmpty(
          aaData.aadhaar,
          findKey(rawJson, ["aadhaar", "Aadhaar", "uid", "UID"])
        );
        aaData.bureauScore = firstNonEmpty(
          aaData.bureauScore,
          findKey(rawJson, ["bureauScore", "bureau-score", "BureauScore"])
        );
        aaData.activeLoans = firstNonEmpty(
          aaData.activeLoans,
          findKey(rawJson, ["activeLoans", "active-loans", "ActiveLoans"])
        );
        aaData.enquiryCount = firstNonEmpty(
          aaData.enquiryCount,
          findKey(rawJson, ["enquiryCount", "enquiry-count", "EnquiryCount"])
        );
        aaData.averageMonthlyBalance = firstNonEmpty(
          aaData.averageMonthlyBalance,
          findKey(rawJson, [
            "averageMonthlyBalance",
            "average-monthly-balance",
            "AverageMonthlyBalance",
          ])
        );
        aaData.previousLoanRepayment = firstNonEmpty(
          aaData.previousLoanRepayment,
          findKey(rawJson, [
            "previousLoanRepayment",
            "previous-loan-repayment",
            "PreviousLoanRepayment",
          ])
        );
        aaData.accountBounceHistory = firstNonEmpty(
          aaData.accountBounceHistory,
          findKey(rawJson, [
            "accountBounceHistory",
            "account-bounce-history",
            "AccountBounceHistory",
          ])
        );
        aaData.bankAccountNameMatch = firstNonEmpty(
          aaData.bankAccountNameMatch,
          findKey(rawJson, [
            "bankAccountNameMatch",
            "bank-account-name-match",
            "BankAccountNameMatch",
          ])
        );
        aaData.modeOfSalaryCredit = firstNonEmpty(
          aaData.modeOfSalaryCredit,
          findKey(rawJson, [
            "modeOfSalaryCredit",
            "mode-of-salary-credit",
            "ModeOfSalaryCredit",
          ])
        );
      }
    }

    // Check what data sources are available
    const hasCart = !!cartRecord?.bsaReportDownloadJson;
    const hasEquifax = !!equifaxRecord?.braReportJson;
    const hasScoreMe = !!scoremeRecord?.submitOtp;
    const hasCirpro = !!cirproRecord?.rawReportJson;
    const hasUserDetails = !!userDetails?.userDetails;
    const hasAAData = aaDataSessions.length > 0;
    const hasUserGeoTag = !!userGeoTag;

    // Parse CIRPRO data
    const cirproRoot = cirproJson?.["CIR-REPORT-FILE"] || cirproJson || {};
    const cirproReportData = cirproRoot?.["REPORT-DATA"] || {};
    const cirproStandard = cirproReportData?.["STANDARD-DATA"] || {};

    let cirproDemogsVariations = cirproStandard?.DEMOGS?.VARIATIONS || [];
    if (
      !cirproDemogsVariations.length &&
      cirproJson?.pan &&
      Array.isArray(cirproJson.pan)
    ) {
      cirproDemogsVariations = cirproJson.pan;
    }

    const variationsMap: Record<string, any[]> = {};
    for (const v of ensureArray(cirproDemogsVariations)) {
      const t = v?.TYPE || v?.type;
      if (!t) continue;
      const arr = v?.VARIATION || v?.variation || [];
      variationsMap[t] = (arr || []).map((x: any) => x?.VALUE ?? x);
    }

    const extractVariation = (type: string) => variationsMap[type] || [];

    const cirproRequestApplicant =
      cirproRoot?.["REQUEST-DATA"]?.["APPLICANT-SEGMENT"] || {};
    const cirproApplicantAddresses = ensureArray(
      cirproRequestApplicant?.ADDRESSES || []
    );
    const cirproCity = cirproApplicantAddresses?.[0]?.CITY || null;
    const cirproState = cirproApplicantAddresses?.[0]?.STATE || null;
    const cirproOccupation =
      cirproRequestApplicant?.Occupation ||
      cirproRequestApplicant?.OCCUPATION ||
      null;

    // Parse CART data
    const cartData =
      cartJson?.data && Array.isArray(cartJson.data)
        ? cartJson.data[0]
        : cartJson?.data || cartJson || {};
    const camAnalysisData = cartData?.camAnalysisData || cartData;
    const camAnalysisMonthly =
      cartData?.camAnalysisMonthly || camAnalysisData?.camAnalysisMonthly || [];

    const salaryArray = ensureArray(cartData?.salary || []);
    const monthlySalaryFromCart = salaryArray.length
      ? Math.round(
          (salaryArray.reduce(
            (s: number, it: any) => s + (toNumberSafe(it?.totalSalary) ?? 0),
            0
          ) /
            salaryArray.length) *
            100
        ) / 100
      : null;

    const accountBounceHistoryFromCart = firstNonEmpty(
      camAnalysisData?.inwardReturnCount,
      cartData?.inwardReturnCount,
      cartData?.chequeBounces?.length,
      cartData?.inwardReturn
    );

    const averageMonthlyBalanceFromCart = firstNonEmpty(
      camAnalysisData?.averageBalance,
      camAnalysisData?.customAverageBalance,
      camAnalysisData?.averageBalanceLastThreeMonth,
      camAnalysisData?.averageBalanceLastSixMonth
    );

    // Parse EQUIFAX data
    const equifaxCcrList =
      equifaxJson?.CCRResponse?.CIRReportDataLst ||
      equifaxJson?.CIRReportDataLst ||
      null;
    const equifaxCcrFirst =
      Array.isArray(equifaxCcrList) && equifaxCcrList.length
        ? equifaxCcrList[0]
        : equifaxJson?.CCRResponse || equifaxJson || {};

    const equifaxData = equifaxCcrFirst?.CIRReportData || equifaxCcrFirst;

    const bureauScoreEquifaxRaw = firstNonEmpty(
      equifaxData?.ScoreDetails?.[0]?.Value,
      equifaxCcrFirst?.Score?.[0]?.Value,
      equifaxJson?.Score?.[0]?.Value,
      equifaxJson?.CCRResponse?.CIRReportDataLst?.[0]?.CIRReportData
        ?.ScoreDetails?.[0]?.Value
    );
    const bureauScoreEquifax = toNumberSafe(bureauScoreEquifaxRaw);

    const ageFromEquifaxRaw =
      equifaxData?.OtherKeyInd?.AgeOfOldestTrade ??
      equifaxData?.OtherKeyInd?.AGE;
    const ageFromEquifax =
      typeof ageFromEquifaxRaw === "string"
        ? isNaN(Number(ageFromEquifaxRaw))
          ? null
          : Number(ageFromEquifaxRaw)
        : (ageFromEquifaxRaw ?? null);

    const equifaxIdentity =
      equifaxData?.IDAndContactInfo || equifaxData?.IdentityInfo || {};
    const equifaxAddressInfo = ensureArray(
      equifaxIdentity?.AddressInfo || equifaxData?.AddressInfo || []
    );
    const equifaxCity =
      equifaxAddressInfo?.[0]?.City ||
      equifaxAddressInfo?.[0]?.ADDRESS ||
      equifaxAddressInfo?.[0]?.Address ||
      null;
    const equifaxState =
      equifaxAddressInfo?.[0]?.State || equifaxAddressInfo?.[0]?.STATE || null;

    // Parse SCOREME data
    const scoremeData = scoremeJson?.data || scoremeJson || {};
    const monthlySalaryFromScoreme = firstNonEmpty(
      scoremeData?.monthlyIncome,
      scoremeData?.monthlySalary,
      scoremeData?.income
    );
    const employmentFromScoreme = firstNonEmpty(
      scoremeData?.employmentType,
      scoremeData?.employment,
      scoremeData?.occupation
    );
    const nameFromScoreme = scoremeData?.name || scoremeData?.fullName || null;

    const cirproScoreRaw =
      cirproStandard?.SCORE?.[0]?.VALUE ||
      cirproStandard?.SCORE?.[0]?.Value ||
      cirproStandard?.SCORE?.[0]?.value ||
      null;
    const cirproScore = toNumberSafe(cirproScoreRaw);

    const panFromVariations =
      extractVariation("PAN-VARIATIONS")?.[0] ||
      extractVariation("PAN-VARIATION")?.[0] ||
      null;
    const uidFromVariations =
      extractVariation("UID-VARIATIONS")?.[0] ||
      extractVariation("UID-VARIATION")?.[0] ||
      null;
    const nameVariations =
      extractVariation("NAME-VARIATIONS") ||
      extractVariation("NAME-VARIATION") ||
      [];
    const addressVariations =
      extractVariation("ADDRESS-VARIATIONS") ||
      extractVariation("ADDRESS-VARIATION") ||
      [];

    const equifaxAccounts =
      equifaxData?.Accounts ||
      equifaxData?.Account ||
      equifaxData?.TradeLine ||
      equifaxData?.CREDIT ||
      [];
    const accountsArray = ensureArray(equifaxAccounts);

    const findLoanAmount = () => {
      for (const acc of accountsArray) {
        const cand = firstNonEmpty(
          acc?.["DISBURSED-AMT"],
          acc?.["DISBURSED_AMT"],
          acc?.DISBURSED,
          acc?.DISBURSEDAMT,
          acc?.DISBURSED_AMT,
          acc?.SanctionAmount,
          acc?.SanctionedAmount,
          acc?.["DISBURSED AMT"],
          acc?.["DISBURSEDAMT"]
        );
        const n = toNumberSafe(cand);
        if (n !== null) return n;
      }

      const fromSummary =
        cirproReportData?.["ACCOUNTS-SUMMARY"]?.["PRIMARY-ACCOUNTS-SUMMARY"]?.[
          "TOTAL-DISBURSED-AMT"
        ];
      return toNumberSafe(fromSummary);
    };

    const dobFromVariations =
      extractVariation("DOB-VARIATIONS")?.[0] ||
      cirproRequestApplicant?.DOB?.["DOB-DT"] ||
      cirproRequestApplicant?.["DOB-DT"] ||
      scoremeData?.dateOfBirth ||
      equifaxIdentity?.DOB ||
      null;

    // Build fields with source tracking
    const fields: Record<string, FieldSource> = {};

    // 1. Bureau Score (AA -> CIRPRO -> EQUIFAX)
    fields.bureauScore = {
      value: aaData?.bureauScore
        ? toNumberSafe(aaData.bureauScore)
        : cirproScore !== null
          ? cirproScore
          : bureauScoreEquifax,
      source: aaData?.bureauScore
        ? { type: "BSE", provider: "aa_data", table: "aa_data_sessions" }
        : cirproScore !== null
          ? {
              type: "CIBIL",
              provider: "cirprov2",
              table: "cir_pro_v2_some_table",
            }
          : bureauScoreEquifax !== null
            ? {
                type: "CIBIL",
                provider: "equifax",
                table: "equifax_some_table",
              }
            : null,
    };

    // 2. PAN (AA -> CIRPRO -> EQUIFAX -> SCOREME)
    fields.pan = {
      value:
        aaData?.pan ||
        panFromVariations ||
        equifaxIdentity?.PANId?.[0]?.IdNumber ||
        equifaxIdentity?.PANId?.[0]?.VALUE ||
        equifaxIdentity?.PANId?.[0] ||
        equifaxData?.PANId ||
        scoremeData?.panNumber ||
        null,
      source: aaData?.pan
        ? { type: "BSE", provider: "aa_data", table: "aa_data_sessions" }
        : panFromVariations
          ? {
              type: "CIBIL",
              provider: "cirprov2",
              table: "cir_pro_v2_some_table",
            }
          : equifaxIdentity?.PANId || equifaxData?.PANId
            ? {
                type: "CIBIL",
                provider: "equifax",
                table: "equifax_some_table",
              }
            : scoremeData?.panNumber
              ? { type: "BSA", provider: "cart", table: "score_me_some_table" }
              : null,
    };

    // 3. Aadhaar (AA -> CIRPRO -> EQUIFAX -> SCOREME)
    const aadhaarRaw =
      aaData?.aadhaar ||
      uidFromVariations ||
      equifaxIdentity?.UID ||
      equifaxIdentity?.UIDId ||
      equifaxIdentity?.NationalIDCard?.[0]?.IdNumber ||
      scoremeData?.maskAadhaarNumber ||
      scoremeData?.aadhaarNumber ||
      null;
    fields.aadhaar = {
      value: aadhaarRaw,
      source: aaData?.aadhaar
        ? { type: "BSE", provider: "aa_data", table: "aa_data_sessions" }
        : uidFromVariations
          ? {
              type: "CIBIL",
              provider: "cirprov2",
              table: "cir_pro_v2_some_table",
            }
          : equifaxIdentity?.UID ||
              equifaxIdentity?.UIDId ||
              equifaxIdentity?.NationalIDCard
            ? {
                type: "CIBIL",
                provider: "equifax",
                table: "equifax_some_table",
              }
            : scoremeData?.maskAadhaarNumber || scoremeData?.aadhaarNumber
              ? { type: "BSA", provider: "cart", table: "score_me_some_table" }
              : null,
    };

    fields.aadhaarMasked = {
      value:
        scoremeData?.maskAadhaarNumber ||
        (aadhaarRaw ? `XXXXXXXX${String(aadhaarRaw).slice(-4)}` : null),
      source: fields.aadhaar.source,
    };

    // 4. Name Variations (CIRPRO -> SCOREME)
    const finalNameVariations = nameVariations.length
      ? nameVariations
      : nameFromScoreme
        ? [nameFromScoreme]
        : [];
    fields.nameVariations = {
      value: finalNameVariations.length ? finalNameVariations : null,
      source: nameVariations.length
        ? {
            type: "CIBIL",
            provider: "cirprov2",
            table: "cir_pro_v2_some_table",
          }
        : nameFromScoreme
          ? { type: "BSA", provider: "cart", table: "score_me_some_table" }
          : null,
    };

    // 5. Address Variations (CIRPRO -> EQUIFAX)
    const finalAddressVariations = addressVariations.length
      ? addressVariations
      : equifaxAddressInfo
          .map((a: any) => a?.Address || a?.AddressText || a?.FullAddress)
          .filter(Boolean) || [];
    fields.addressVariations = {
      value: finalAddressVariations.length ? finalAddressVariations : null,
      source: addressVariations.length
        ? {
            type: "CIBIL",
            provider: "cirprov2",
            table: "cir_pro_v2_some_table",
          }
        : finalAddressVariations.length
          ? { type: "CIBIL", provider: "equifax", table: "equifax_some_table" }
          : null,
    };

    // 6. Account Bounce History (AA -> CART)
    fields.accountBounceHistory = {
      value: aaData?.accountBounceHistory
        ? toNumberSafe(aaData.accountBounceHistory)
        : toNumberSafe(accountBounceHistoryFromCart),
      source: aaData?.accountBounceHistory
        ? { type: "BSE", provider: "aa_data", table: "aa_data_sessions" }
        : accountBounceHistoryFromCart
          ? { type: "BSA", provider: "cart", table: "cart_some_table" }
          : null,
    };

    // 7. Monthly Salary (AA -> CART -> SCOREME)
    fields.monthlySalary = {
      value: aaData?.monthlySalary
        ? toNumberSafe(aaData.monthlySalary)
        : monthlySalaryFromCart !== null
          ? monthlySalaryFromCart
          : toNumberSafe(monthlySalaryFromScoreme),
      source: aaData?.monthlySalary
        ? { type: "BSE", provider: "aa_data", table: "aa_data_sessions" }
        : monthlySalaryFromCart !== null
          ? { type: "BSA", provider: "cart", table: "cart_some_table" }
          : monthlySalaryFromScoreme
            ? { type: "BSA", provider: "cart", table: "score_me_some_table" }
            : null,
    };

    // 8. Mode of Salary Credit (AA -> CART -> SCOREME)
    fields.modeOfSalaryCredit = {
      value: aaData?.modeOfSalaryCredit
        ? toNumberSafe(aaData.modeOfSalaryCredit)
        : toNumberSafe(
            firstNonEmpty(
              camAnalysisData?.salaryCreditCountLastThreeMonth,
              camAnalysisData?.salaryCreditCountLastSixMonth,
              cartData?.modeOfSalaryCredit,
              scoremeData?.salaryMode
            )
          ),
      source: aaData?.modeOfSalaryCredit
        ? { type: "BSE", provider: "aa_data", table: "aa_data_sessions" }
        : camAnalysisData?.salaryCreditCountLastThreeMonth ||
            cartData?.modeOfSalaryCredit
          ? { type: "BSA", provider: "cart", table: "cart_some_table" }
          : scoremeData?.salaryMode
            ? { type: "BSA", provider: "cart", table: "score_me_some_table" }
            : null,
    };

    // 9. Average Monthly Balance (AA -> CART)
    fields.averageMonthlyBalance = {
      value: aaData?.averageMonthlyBalance
        ? toNumberSafe(aaData.averageMonthlyBalance)
        : toNumberSafe(averageMonthlyBalanceFromCart),
      source: aaData?.averageMonthlyBalance
        ? { type: "BSE", provider: "aa_data", table: "aa_data_sessions" }
        : averageMonthlyBalanceFromCart
          ? { type: "BSA", provider: "cart", table: "cart_some_table" }
          : null,
    };

    // 10. Loan Amount (AA -> EQUIFAX -> SCOREME)
    const loanAmountFromEquifax = findLoanAmount();
    fields.loanAmount = {
      value: aaData?.loanAmount
        ? toNumberSafe(aaData.loanAmount)
        : loanAmountFromEquifax !== null
          ? loanAmountFromEquifax
          : toNumberSafe(scoremeData?.loanAmount),
      source: aaData?.loanAmount
        ? { type: "BSE", provider: "aa_data", table: "aa_data_sessions" }
        : loanAmountFromEquifax !== null
          ? { type: "CIBIL", provider: "equifax", table: "equifax_some_table" }
          : scoremeData?.loanAmount
            ? { type: "BSA", provider: "cart", table: "score_me_some_table" }
            : null,
    };

    // 11. Previous Loan Repayment (AA -> EQUIFAX)
    let previousLoanRepaymentVal: string | null =
      aaData?.previousLoanRepayment || null;
    let previousLoanRepaymentSrc = null;
    if (previousLoanRepaymentVal) {
      previousLoanRepaymentSrc = {
        type: "BSE" as const,
        provider: "aa_data",
        table: "aa_data_sessions",
      };
    } else {
      for (const acc of accountsArray) {
        const cand = firstNonEmpty(
          acc?.["LAST-PAYMENT-DT"],
          acc?.["LAST-PAYMENT-DATE"],
          acc?.lastPaymentDt,
          acc?.LastPaymentDate,
          acc?.["LAST-PAYMENT"]
        );
        if (cand) {
          previousLoanRepaymentVal = String(cand);
          previousLoanRepaymentSrc = {
            type: "CIBIL" as const,
            provider: "equifax",
            table: "equifax_some_table",
          };
          break;
        }
      }
    }
    fields.previousLoanRepayment = {
      value: previousLoanRepaymentVal,
      source: previousLoanRepaymentSrc,
    };

    // 12. Active Loans (AA -> EQUIFAX -> SCOREME -> CIRPRO)
    const activeLoansFromEquifax =
      accountsArray.filter(
        (a: any) =>
          a?.["ACCOUNT-STATUS"]?.toLowerCase?.() === "active" ||
          a?.AccountStatus?.toLowerCase?.() === "active" ||
          a?.status?.toLowerCase?.() === "active"
      )?.length || null;
    fields.activeLoans = {
      value: aaData?.activeLoans
        ? toNumberSafe(aaData.activeLoans)
        : activeLoansFromEquifax !== null
          ? activeLoansFromEquifax
          : (toNumberSafe(scoremeData?.activeLoans) ??
            toNumberSafe(
              cirproReportData?.["ACCOUNTS-SUMMARY"]?.[
                "PRIMARY-ACCOUNTS-SUMMARY"
              ]?.["ACTIVE-ACCOUNTS"]
            )),
      source: aaData?.activeLoans
        ? { type: "BSE", provider: "aa_data", table: "aa_data_sessions" }
        : activeLoansFromEquifax !== null
          ? { type: "CIBIL", provider: "equifax", table: "equifax_some_table" }
          : scoremeData?.activeLoans
            ? { type: "BSA", provider: "cart", table: "score_me_some_table" }
            : cirproReportData?.["ACCOUNTS-SUMMARY"]?.[
                  "PRIMARY-ACCOUNTS-SUMMARY"
                ]?.["ACTIVE-ACCOUNTS"]
              ? {
                  type: "CIBIL",
                  provider: "cirprov2",
                  table: "cir_pro_v2_some_table",
                }
              : null,
    };

    // 13. Age (AA -> EQUIFAX -> SCOREME -> CIRPRO DOB calculation)
    const calculatedAge = calculateAge(String(dobFromVariations || ""));
    fields.age = {
      value: aaData?.age
        ? toNumberSafe(aaData.age)
        : ageFromEquifax !== null
          ? ageFromEquifax
          : (toNumberSafe(scoremeData?.age) ?? calculatedAge),
      source: aaData?.age
        ? { type: "BSE", provider: "aa_data", table: "aa_data_sessions" }
        : ageFromEquifax !== null
          ? { type: "CIBIL", provider: "equifax", table: "equifax_some_table" }
          : scoremeData?.age
            ? { type: "BSA", provider: "cart", table: "score_me_some_table" }
            : calculatedAge !== null
              ? {
                  type: "CIBIL",
                  provider: "cirprov2",
                  table: "cir_pro_v2_some_table",
                }
              : null,
    };

    // DOB field (for reference)
    fields.dob = {
      value: dobFromVariations || null,
      source: dobFromVariations
        ? {
            type: "CIBIL",
            provider: "cirprov2",
            table: "cir_pro_v2_some_table",
          }
        : null,
    };

    // 14. City (USER_GEO_TAG -> AA -> CIRPRO -> EQUIFAX -> SCOREME)
    fields.city = {
      value:
        userGeoTag?.city ||
        aaData?.city ||
        cirproCity ||
        equifaxCity ||
        scoremeData?.city ||
        null,
      source: userGeoTag?.city
        ? { type: "USER_GEO", provider: "user_geo", table: "user_geo_tags" }
        : aaData?.city
          ? { type: "BSE", provider: "aa_data", table: "aa_data_sessions" }
          : cirproCity
            ? {
                type: "CIBIL",
                provider: "cirprov2",
                table: "cir_pro_v2_some_table",
              }
            : equifaxCity
              ? {
                  type: "CIBIL",
                  provider: "equifax",
                  table: "equifax_some_table",
                }
              : scoremeData?.city
                ? {
                    type: "BSA",
                    provider: "cart",
                    table: "score_me_some_table",
                  }
                : null,
    };

    // State (USER_GEO_TAG -> CIRPRO -> EQUIFAX -> SCOREME)
    fields.state = {
      value:
        userGeoTag?.state ||
        cirproState ||
        equifaxState ||
        scoremeData?.state ||
        null,
      source: userGeoTag?.state
        ? { type: "USER_GEO", provider: "user_geo", table: "user_geo_tags" }
        : cirproState
          ? {
              type: "CIBIL",
              provider: "cirprov2",
              table: "cir_pro_v2_some_table",
            }
          : equifaxState
            ? {
                type: "CIBIL",
                provider: "equifax",
                table: "equifax_some_table",
              }
            : scoremeData?.state
              ? { type: "BSA", provider: "cart", table: "score_me_some_table" }
              : null,
    };

    // 15. Enquiry Count (AA -> EQUIFAX)
    fields.enquiryCount = {
      value: aaData?.enquiryCount
        ? toNumberSafe(aaData.enquiryCount)
        : toNumberSafe(
            firstNonEmpty(
              equifaxData?.EnquirySummary?.Total,
              equifaxData?.Enquiries?.length
            )
          ),
      source: aaData?.enquiryCount
        ? { type: "BSE", provider: "aa_data", table: "aa_data_sessions" }
        : equifaxData?.EnquirySummary?.Total || equifaxData?.Enquiries?.length
          ? { type: "CIBIL", provider: "equifax", table: "equifax_some_table" }
          : null,
    };

    // 16. Employment Type (AA -> CIRPRO -> EQUIFAX -> SCOREME)
    let employmentTypeVal: string | null = null;
    let employmentTypeSrc = null;

    if (aaData?.employmentType) {
      employmentTypeVal = String(aaData.employmentType);
      employmentTypeSrc = {
        type: "BSE" as const,
        provider: "aa_data",
        table: "aa_data_sessions",
      };
    } else {
      const cirproEmploymentDetails =
        cirproStandard?.["EMPLOYMENT-DETAILS"] || [];
      if (
        Array.isArray(cirproEmploymentDetails) &&
        cirproEmploymentDetails.length
      ) {
        for (const ed of cirproEmploymentDetails) {
          const employmentDetail = ed?.["EMPLOYMENT-DETAIL"];
          const occ = employmentDetail?.OCCUPATION;
          if (occ) {
            employmentTypeVal = String(occ);
            employmentTypeSrc = {
              type: "CIBIL" as const,
              provider: "cirprov2",
              table: "cir_pro_v2_some_table",
            };
            break;
          }
        }
      }

      if (!employmentTypeVal) {
        const occupationFromVariations = firstNonEmpty(
          extractVariation("OCCUPATION-VARIATIONS")?.[0],
          extractVariation("OCCUPATION")?.[0],
          extractVariation("EMPLOYMENT-VARIATIONS")?.[0],
          extractVariation("EMPLOYMENT")?.[0]
        );
        if (occupationFromVariations) {
          employmentTypeVal = String(occupationFromVariations);
          employmentTypeSrc = {
            type: "CIBIL" as const,
            provider: "cirprov2",
            table: "cir_pro_v2_some_table",
          };
        }
      }

      if (!employmentTypeVal) {
        const equifaxEmploymentDetails =
          equifaxData?.["EMPLOYMENT-DETAILS"] ||
          equifaxData?.EMPLOYMENT_DETAILS ||
          equifaxData?.EmploymentDetails;
        if (
          Array.isArray(equifaxEmploymentDetails) &&
          equifaxEmploymentDetails.length
        ) {
          for (const ed of equifaxEmploymentDetails) {
            const e = ed?.["EMPLOYMENT-DETAIL"] || ed?.EMPLOYMENT_DETAIL || ed;
            const occ = firstNonEmpty(
              e?.OCCUPATION,
              e?.occupation,
              e?.OCCUPATION_TYPE
            );
            if (occ) {
              employmentTypeVal = String(occ);
              employmentTypeSrc = {
                type: "CIBIL" as const,
                provider: "equifax",
                table: "equifax_some_table",
              };
              break;
            }
          }
        }
      }

      if (!employmentTypeVal) {
        const directEmployment = firstNonEmpty(
          equifaxData?.OCCUPATION,
          equifaxData?.Employment,
          equifaxData?.EmploymentType,
          equifaxData?.EMPLOYMENT_TYPE
        );
        if (directEmployment) {
          employmentTypeVal = String(directEmployment);
          employmentTypeSrc = {
            type: "CIBIL" as const,
            provider: "equifax",
            table: "equifax_some_table",
          };
        }
      }

      if (!employmentTypeVal) {
        const fallback = firstNonEmpty(cirproOccupation, employmentFromScoreme);
        if (fallback) {
          employmentTypeVal = String(fallback);
          employmentTypeSrc = cirproOccupation
            ? {
                type: "CIBIL" as const,
                provider: "cirprov2",
                table: "cir_pro_v2_some_table",
              }
            : {
                type: "BSA" as const,
                provider: "cart",
                table: "score_me_some_table",
              };
        }
      }
    }
    fields.employmentType = {
      value: employmentTypeVal,
      source: employmentTypeSrc,
    };

    // Bank Account Name Match (AA -> CART -> SCOREME)
    fields.bankAccountNameMatch = {
      value:
        aaData?.bankAccountNameMatch ||
        cartData?.accountName ||
        scoremeData?.accountName ||
        cartData?.accountNameMatch ||
        null,
      source: aaData?.bankAccountNameMatch
        ? { type: "BSE", provider: "aa_data", table: "aa_data_sessions" }
        : cartData?.accountName || cartData?.accountNameMatch
          ? { type: "BSA", provider: "cart", table: "cart_some_table" }
          : scoremeData?.accountName
            ? { type: "BSA", provider: "cart", table: "score_me_some_table" }
            : null,
    };

    // Calculate evaluation score (14 core fields)
    const coreFields = [
      "bureauScore",
      "pan",
      "aadhaar",
      "accountBounceHistory",
      "monthlySalary",
      "modeOfSalaryCredit",
      "averageMonthlyBalance",
      "loanAmount",
      "previousLoanRepayment",
      "activeLoans",
      "age",
      "city",
      "enquiryCount",
      "employmentType",
    ];

    const presentFields = coreFields.filter((field) => {
      const fieldData = fields[field];
      return fieldData?.value !== null && fieldData?.value !== undefined;
    });

    const evaluationScore = {
      total: coreFields.length,
      present: presentFields.length,
      percentage: Math.round((presentFields.length / coreFields.length) * 100),
      missingFields: coreFields.filter(
        (field) => !presentFields.includes(field)
      ),
      presentFields: presentFields,
    };

    // Build final response with proper structure
    const response: any = {
      data: {},
      metadata: {
        evaluationScore,
        availableProviders: {
          CIBIL: {
            equifax: hasEquifax,
            cirprov2: hasCirpro,
          },
          BSA: {
            cart: hasCart,
            scoreme: hasScoreMe,
          },
          BSE: {
            aa_data: hasAAData,
          },
          USER_GEO: {
            user_geo_tags: hasUserGeoTag,
          },
          userDetails: hasUserDetails,
        },
        dataSourcesSummary: {
          BSE: 0,
          BSA: 0,
          CIBIL: 0,
          USER_GEO: 0,
        },
      },
    };

    // Populate data with values and sources
    for (const [fieldName, fieldData] of Object.entries(fields)) {
      if (fieldData.value !== null && fieldData.value !== undefined) {
        response.data[fieldName] = {
          value: fieldData.value,
          source: fieldData.source,
        };

        // Count data sources
        if (fieldData.source) {
          response.metadata.dataSourcesSummary[fieldData.source.type]++;
        }
      }
    }

    // Add user geo data details if available
    if (hasUserGeoTag) {
      response.metadata.userGeoData = {
        latitude: userGeoTag.latitude,
        longitude: userGeoTag.longitude,
        address: userGeoTag.address,
        city: userGeoTag.city,
        state: userGeoTag.state,
        country: userGeoTag.country,
        district: userGeoTag.district,
        postalCode: userGeoTag.postalCode,
        street: userGeoTag.street,
        sublocality: userGeoTag.sublocality,
        createdAt: userGeoTag.createdAt,
      };
    }

    return response;
  }
}
