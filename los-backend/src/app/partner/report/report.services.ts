import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AlternateAddress,
  AlternatePhoneNumber,
  Document,
  document_status_enum,
  DocumentTypeEnum,
  Employment,
  Loan,
  loan_status_enum,
  LoanDetails,
  Payslip,
  TransactionStatusEnum,
  TransactionTypeEnum,
  User,
  UserBankAccount,
  UserDetails,
  PaymentRequest,
  Brand,
  BrandConfig,
  Repayment,
  Disbursement,
  FeeBreakdown,
  Deduction,
  TaxDeduction,
  ChargeMode,
  LoanStatusHistory,
  PartnerUser,
  PaymentPartialCollectionTransaction,
  PaymentCollectionTransaction,
  PaymentDisbursalTransaction,
  OpsApprovalStatusEnum,
  closingTypeEnum,
  UTMTracking,
  BankAccountStatement,
  OtherDocument,
  $Enums,
  Prisma,
  LeadMatchEntity,
  LeadMatchField,
  LeadMatchType,
  LoanNoDueCertificate,
} from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { EmailService } from "src/core/communication/services/email.service";
import { ReportLogService } from "./report-log.service";
import * as fs from "fs";
import * as path from "path";
import { createObjectCsvWriter } from "csv-writer";
import { formatDate } from "src/utils";
import { calculateTax } from "src/utils/tax";
import * as dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import * as ejs from "ejs";
import { UserStatusEnum } from "src/constant/enum";
const IST = "Asia/Kolkata";
const _dayjs = dayjs.default; // Alias to avoid naming conflicts
_dayjs.extend(utc);
_dayjs.extend(timezone);
export enum ReportType {
  MasterReport = "master-report",
  DisbursedLoanReport = "disbursed-loan-report",
  NonDisbursedLoanReport = "non-disbursed-loan-report",
  MasterCollectionReport = "master-collection-report",
  CollectionLoanReport = "collection-loan-report",
  CICReport = "cic-report",
  MarketingReport = "marketing-report",
  RejectReport = "reject-report",
  CompletedLoanWithNoRepetReport = "completed-loan-with-no-repet-report",
  ActiveLoansByDueDateReport = "active-loans-by-due-date-report",
  CollectionAllocationExecutiveReport = "collection-allocation-executive-report",
  DisburseNonDisburseReport = "disburse-non-disburse-report",
  CollectionDueReport = "collection-due-report",
  EquifaxCreditReport = "equifax-credit-report",
  FieldVisitReport = "field-visit-report",
  DailyMarketingMISReport = "daily-marketing-mis-report",
  TransUnionReport = "transunion-report",
  InternalMarketingReport = "internal-marketing-report",
  CollectionRemarksReport = "collection-remarks-report",
  OutstandingDataReport = "outstanding-data-report",
  LoanCloseReport = "loan-close-report",
  TotalRecoveryReport = "total-recovery-report",
  TotalApproveSanctionReport = "total-approve-sanction-report",
  LeadTotalReport = "lead-total-report",
  LoginSessionsReport = "login-sessions-report",
  CollectionLoanReportByApprovedDate = "collection-loan-report-by-approved-date",
}
const collectionStatus = (loan: LoanWithRelations): string => {
  const { paymentRequests, loanDetails, status, closingType } = loan;
  if (closingType === closingTypeEnum.WRITE_OFF) {
    return "Write-Off";
  }
  if (closingType === closingTypeEnum.SETTLEMENT) {
    return "Settled";
  }

  const latestPayment = paymentRequests.find(
    (payment) =>
      payment.type === TransactionTypeEnum.COLLECTION &&
      payment.collectionTransactions.length > 0,
  );
  const partialPayment = paymentRequests.find(
    (payment) =>
      payment.type === TransactionTypeEnum.PARTIAL_COLLECTION &&
      payment.partialCollectionTransactions.length > 0,
  );

  const successfulTransactions =
    latestPayment?.collectionTransactions.filter(
      (tx) =>
        tx.status === TransactionStatusEnum.SUCCESS &&
        tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
    ) || [];

  const successfulPartialTransactions =
    partialPayment?.partialCollectionTransactions.filter(
      (tx) =>
        tx.status === TransactionStatusEnum.SUCCESS &&
        tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
    ) || [];

  if (successfulTransactions.length) {
    const lastTransactionDate = successfulTransactions.at(-1)?.createdAt;
    const dueDate = loanDetails.dueDate;
    if (dueDate && lastTransactionDate) {
      const lastDateOnly = new Date(lastTransactionDate)
        .toISOString()
        .split("T")[0];
      const dueDateOnly = new Date(dueDate).toISOString().split("T")[0];

      if (lastDateOnly < dueDateOnly) return "Pre close";
      if (lastDateOnly > dueDateOnly) return "Post Close";
      return "Close"; // exactly same date
    }

    return "Close"; // fallback
  }

  // 5. Check for partial payments only
  if (successfulPartialTransactions.length) {
    const lastPartialTransactionDate =
      successfulPartialTransactions.at(-1)?.createdAt;
    const dueDate = loanDetails.dueDate;

    if (dueDate && lastPartialTransactionDate) {
      const lastDate = new Date(lastPartialTransactionDate)
        .toISOString()
        .split("T")[0];
      const dueDateOnly = new Date(dueDate).toISOString().split("T")[0];

      if (lastDate <= dueDateOnly) {
        if (partialPayment.status !== TransactionStatusEnum.SUCCESS) {
          return "Partial Payment In Process";
        }
        return "Partial Payment Pre Close";
      }

      if (lastDate > dueDateOnly) {
        if (partialPayment.status !== TransactionStatusEnum.SUCCESS) {
          return "Partial Payment In Process";
        }
        return "Partial Payment Post Close";
      }
      return "Partial Payment";
    }

    return "Partial Payment";
  }
  if (status === loan_status_enum.COMPLETED) {
    return "Close";
  }

  return "Active";
};
type DocumentWithLeadForm = Document & {
  leadMatches: {
    id: string;
    entityType: LeadMatchEntity;
    matchType: LeadMatchType;
    matchField: LeadMatchField;
    matchValue: string;
    confidence: number;
    createdAt: Date;
    userId: string | null;
    documentId: string | null;
    leadForm: {
      id: string;
      form_name: string | null;
      campaign_name: string | null;
      platform: string | null;
    };
  }[];
};
type MasterReportUser = User & {
  brand: Brand & { brandConfig: BrandConfig };
  utmTracking: UTMTracking[];
  userDetails: UserDetails | null;
  documents: DocumentWithLeadForm[];
  brandSubDomain: {
    subdomain: string | null;
    marketingSource: string | null;
  };
  status_id: number | null;
  loans: {
    is_repeat_loan: any;
    id: string;
    formattedLoanId: string;
    status: loan_status_enum;
    amount: number;
    loanType: string | null;
    createdAt: Date;
    disbursementDate: Date | null;
    disbursement: {
      netAmount: number;
    } | null;
    allottedPartners: {
      id: string;
      partnerUser: {
        id: string;
        name: string | null;
        email: string;
        reportsToId: string | null;
      };
    }[];
    loanStatusHistory: {
      id: string;
      status: loan_status_enum;
      message: string | null;
      createdAt: Date;
      partnerUser: {
        id: string;
        name: string | null;
        email: string;
      } | null;
      loan_status_brand_reasons: {
        id: string;
        brandStatusReason: {
          id: string;
          reason: string;
          status: string;
          createdAt: Date;
        };
      }[];
    }[];
    loan_collection_allocated_partner: {
      isActive: boolean;
      isDeallocated: boolean;
      partnerUserId: string;
      partnerUser: {
        id: string;
        name: string | null;
        email: string;
        reportsToId: string | null;
        reportsTo: {
          id: string;
          name: string | null;
          email: string;
        } | null;
        brandRoles: {
          role: {
            name: string;
          };
        }[];
      };
    }[];
  }[];
  employment: Employment | null;
  user_bank_account: Array<{
    id: string;
    userId: string;
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
    accountType: string;
    isVerified: boolean;
    verificationMethod: $Enums.user_bank_verification_method | null;
    verificationStatus: $Enums.user_bank_verification_status;
    verifiedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    userDataStatus: $Enums.user_data_status;
    bankAddress: string | null;
    isPrimary: boolean;
    pennyDropResponse: Prisma.JsonValue | null;
    pennyDropStatus: Prisma.JsonValue | null;
    pennyVerifiedName: string | null;
    BankAccountStatement: BankAccountStatement[];
  }>;
  alternatePhoneNumbers: AlternatePhoneNumber[];
  payslips: Payslip[];
  otherDocuments: OtherDocument[];
  alternateAddresses: AlternateAddress[];
  leadMatches: {
    id: string;
    entityType: LeadMatchEntity;
    matchType: LeadMatchType;
    matchField: LeadMatchField;
    matchValue: string;
    confidence: number;
    createdAt: Date;
    userId: string | null;
    documentId: string | null;
    leadForm: {
      id: string;
      form_name: string | null;
      campaign_name: string | null;
      platform: string | null;
    };
  }[];
  user_status_brand_reasons: {
    id: string;
    userId: string;
    brand_status_reasons: {
      id: string;
      reason: string;
      status: string;
    };
  }[];
  allocated_partner_user_id?: string | null;
  allocatedPartner?: {
    id: string;
    name: string | null;
    email: string;
    reportsToId: string | null;
  } | null;
};
const documents: DocumentWithLeadForm[] = [];
export interface LoanWithRelations extends Loan {
  user: User & {
    userDetails: UserDetails;
    employment: Employment;
    documents: DocumentWithLeadForm[];
    user_bank_account: UserBankAccount[];
    payslips: Payslip[];
    alternateAddresses: AlternateAddress[];
    alternatePhoneNumbers: AlternatePhoneNumber[];
    brand: Brand & {
      brandConfig: BrandConfig;
    };
    utmTracking: UTMTracking[]; // Include UTM tracking for marketing source
    leadMatches: {
      id: string;
      entityType: LeadMatchEntity;
      matchType: LeadMatchType;
      matchField: LeadMatchField;
      matchValue: string;
      confidence: number;
      createdAt: Date;
      userId: string | null;
      documentId: string | null;
      leadForm: {
        id: string;
        form_name: string | null;
        campaign_name: string | null;
        platform: string | null;
      };
    }[];
    brandSubDomain: { marketingSource: string; subdomain: string };
  };
  loanDetails: LoanDetails;
  allottedPartners: {
    id: string;
    partnerUser: PartnerUser;
  }[]; // Include allotted partners
  loan_collection_allocated_partner: {
    isActive: boolean;
    isDeallocated: boolean;
    partnerUserId: string;
    partnerUser: {
      id: string;
      name: string | null;
      email: string;
      reportsToId: string | null;
      reportsTo: {
        id: string;
        name: string | null;
        email: string;
      } | null;
      brandRoles: {
        role: {
          name: string;
        };
      }[];
    };
  }[];
  loanStatusHistory: (LoanStatusHistory & {
    partnerUser: PartnerUser; // Include partner users who changed the status
    loan_status_brand_reasons: {
      id: string;
      brandStatusReason: {
        id: string;
        reason: string;
        status: string;
        createdAt: Date;
      };
    }[];
  })[]; // Include loan status history
  repayment: Repayment & {
    feeBreakdowns: FeeBreakdown[];
  };
  disbursement: Disbursement & {
    deductions: (Deduction & {
      taxes: TaxDeduction[];
    })[];
  };
  noDueCertificate?: LoanNoDueCertificate | null;
  paymentRequests: (PaymentRequest & {
    partialCollectionTransactions: (PaymentPartialCollectionTransaction & {
      opsByPartner: PartnerUser | null;
      createdByPartner: PartnerUser | null;
    })[];
    collectionTransactions: (PaymentCollectionTransaction & {
      opsByPartner: PartnerUser | null;
      createdByPartner: PartnerUser | null;
    })[];
    disbursalTransactions: PaymentDisbursalTransaction[];
  })[];
}
@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly reportLogService: ReportLogService,
  ) {}

  /**
   * Process large Prisma queries in batches to avoid "too many bind variables" errors.
   * Splits queries into smaller chunks and concatenates results.
   */
  private async batchedFindMany<T>(
    findFn: (skip: number, take: number) => Promise<T[]>,
    batchSize: number = 1000,
  ): Promise<T[]> {
    const results: T[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await findFn(skip, batchSize);
      results.push(...batch);
      skip += batchSize;
      hasMore = batch.length === batchSize;
    }

    return results;
  }

  private formatedPhoneNo(phone?: string, forExcel: boolean = false): string {
    const formatted = phone?.replace(/^(\+)?91/, "") || "";
    if (forExcel && formatted) {
      return `="${formatted}"`;
    }
    return formatted;
  }

  // private readonly SPECIAL_BRAND_ID = "4b2f828d-e7d4-45d2-be7d-f2a0ee6a70ae";

  // Replace email list with user ID list
  private readonly SPECIAL_USER_IDS = [
    //sriharsha
    "34041562-319c-4bf7-8922-48efdf9dd7cd",
    //super admin
    "6e7e5904-0bf1-4fae-8588-7568c15c06d5",
    //nithin
    "2ec04d6c-8eb9-477d-bebd-9a8dac27508f",
    //vivek
    "a7810a11-878e-454c-a3aa-c812bbe8eacd",
    //raj
    "61e2fea6-74e8-49f8-aad6-65195ec894eb",
    //arvind
    "4520ae62-a82c-4b9f-aa65-c602cb1e9618",
    //priyanka
    "bf33ec36-f4a5-4ffb-9cc8-afa7f2b25e79",
    //pranit
    "61cdb207-edb2-4a9e-9551-7772857df388",
    //KUNAL
    "8e62e18f-7c08-427f-a300-0c4034ca4967",
    // Tarun
    "9a106b02-ada4-44b7-94d9-fd5e865574eb",
    //super admin
    "a043ec4b-f951-4658-9c4f-70c180018078",
    //Akash  - S4S
    "5fa63cf9-f364-489b-b00e-bee9653a8271",
    // Akash - Minutesloan
    "6fcfe30d-879f-45d4-a3b7-f2c0c2a3b34b",
    //udit qualoan
    "d9a1172d-1d92-44eb-9cf0-08aeb795ee63",
    // shubham qua loan
    "fca04fcb-f91d-457a-9ff9-9585815d29d2",
    // vprashar
    "1b7a6290-7a74-4039-bf40-079fd4179009",
  ];

  // Update conditionalFields to check user ID directly (no DB call needed!)
  private conditionalFields(
    partnerUserId: string | undefined,
    fields: Array<{ id: string; title: string }>,
  ): Array<{ id: string; title: string }> {
    // Check user ID if provided
    if (partnerUserId && this.SPECIAL_USER_IDS.includes(partnerUserId)) {
      return fields;
    }

    return [];
  }

  private getMemberConfig(brandId: string): {
    memberCode: string;
    memberShortName: string;
  } {
    const IDFSPL_BRAND_IDS = [
      "165a2d32-d1bd-4287-b2db-104a7feee308",
      "ea21e6e5-cbcd-4c74-855b-5d19d6566e0a",
    ];

    const isIDFSPLBrand = IDFSPL_BRAND_IDS.includes(brandId);

    return isIDFSPLBrand
      ? {
          memberCode: "NB75680001",
          memberShortName: "IDFFSPL",
        }
      : {
          memberCode: "NB42350001",
          memberShortName: "NAMFINPL",
        };
  }
  async getReport(
    reportType: string,
    fromDate: string,
    toDate: string,
    brandId: string,
    partnerUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<unknown[]> {
    const startTime = Date.now();
    let success = true;
    let errorMessage: string | undefined;
    let recordCount = 0;
    let reportData: unknown[] = [];

    // ✅ For Prisma queries (all DateTime columns, regardless of @db.Date)
    const fromDateIST = _dayjs
      .tz(fromDate, "Asia/Kolkata")
      .startOf("day")
      .toDate();
    const toDateIST = _dayjs.tz(toDate, "Asia/Kolkata").endOf("day").toDate();

    // ✅ For raw SQL queries with @db.Date columns: use "YYYY-MM-DD" format
    const fromDateIST_DateOnly = new Date(
      _dayjs.tz(fromDate, IST).format("YYYY-MM-DD"),
    );
    const toDateIST_DateOnly = new Date(
      _dayjs.tz(toDate, IST).format("YYYY-MM-DD"),
    );
    try {
      if (reportType === ReportType.CollectionLoanReportByApprovedDate) {
        const minAllowedDate = new Date("2026-01-13");
        const requestedFromDate = fromDateIST;

        if (requestedFromDate < minAllowedDate) {
          throw new BadRequestException(
            "Report is only available from January 14, 2026 onwards. Please select a date range starting from or after January 14, 2026.",
          );
        }
      }
      // Common filters
      switch (reportType) {
        case ReportType.MasterReport:
          // Fetch partner users for allocated partner details
          const partnerUsers = await this.prisma.partnerUser.findMany({
            select: {
              id: true,
              name: true,
              email: true,
              reportsToId: true,
            },
          });
          const partnerUsersMap = new Map(
            partnerUsers.map((pu) => [pu.id, pu]),
          );

          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.user.findMany({
                where: {
                  brandId,
                  isActive: true,
                  createdAt: {
                    gte: fromDateIST,
                    lte: toDateIST,
                  },
                },
                skip,
                take,
                include: {
                  userDetails: true,
                  documents: {
                    include: {
                      leadMatches: {
                        where: {
                          status: "ACTIVE",
                          documentId: { not: null }, // Document-based matches
                        },
                        select: {
                          id: true,
                          entityType: true,
                          matchType: true,
                          matchField: true,
                          matchValue: true,
                          confidence: true,
                          createdAt: true,
                          userId: true,
                          documentId: true,
                          leadForm: {
                            select: {
                              id: true,
                              form_name: true,
                              campaign_name: true,
                              platform: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  employment: true,
                  user_bank_account: {
                    where: {
                      isPrimary: true, // Assuming you want only primary bank accounts
                    },
                    include: {
                      BankAccountStatement: true,
                    },
                  },
                  user_status_brand_reasons: {
                    include: {
                      brand_status_reasons: true,
                    },
                  },
                  alternatePhoneNumbers: true,
                  alternateAddresses: true,
                  payslips: true,
                  otherDocuments: true,
                  brandSubDomain: {
                    select: { marketingSource: true, subdomain: true },
                  },
                  brand: {
                    include: {
                      brandConfig: true,
                    },
                  },
                  utmTracking: true, // Include UTM tracking for marketing source
                  leadMatches: {
                    where: {
                      status: "ACTIVE",
                      userId: { not: null }, // Direct user matches only
                    },
                    select: {
                      id: true,
                      entityType: true,
                      matchType: true,
                      matchField: true,
                      matchValue: true,
                      confidence: true,
                      createdAt: true,
                      userId: true,
                      documentId: true,
                      leadForm: {
                        select: {
                          id: true,
                          form_name: true,
                          campaign_name: true,
                          platform: true,
                        },
                      },
                    },
                  },
                  loans: {
                    select: {
                      id: true,
                      formattedLoanId: true,
                      status: true,
                      amount: true,
                      createdAt: true,
                      disbursementDate: true,
                      allottedPartners: {
                        select: {
                          id: true,
                          partnerUser: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                              reportsToId: true,
                            },
                          },
                        },
                      },
                      loan_collection_allocated_partner: {
                        select: {
                          isActive: true,
                          isDeallocated: true,
                          partnerUserId: true,
                          partnerUser: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                              reportsToId: true,
                              reportsTo: {
                                select: {
                                  id: true,
                                  name: true,
                                  email: true,
                                },
                              },
                              brandRoles: {
                                select: {
                                  role: {
                                    select: {
                                      name: true,
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                      loanStatusHistory: {
                        where: {
                          status: loan_status_enum.REJECTED,
                        },
                        select: {
                          id: true,
                          status: true,
                          message: true,
                          createdAt: true,

                          partnerUser: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                          loan_status_brand_reasons: {
                            select: {
                              id: true,
                              brandStatusReason: {
                                select: {
                                  id: true,
                                  reason: true,
                                  status: true,
                                  createdAt: true,
                                },
                              },
                            },
                          },
                        },
                        orderBy: {
                          createdAt: "desc",
                        },
                      },
                    },
                    orderBy: {
                      createdAt: "desc",
                    },
                  },
                },
                orderBy: { createdAt: "desc" },
              }),
            10000, // batch size
          );

          // Enhance users with allocated partner details
          reportData = reportData.map((user: any) => ({
            ...user,
            allocatedPartner: user.allocated_partner_user_id
              ? partnerUsersMap.get(user.allocated_partner_user_id) || null
              : null,
          }));
          break;

        case ReportType.DisbursedLoanReport:
          // Logic for disbursed loan report
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.loan.findMany({
                where: {
                  brandId: brandId,
                  isActive: true,
                  user: {
                    isActive: true,
                  },
                  AND: [
                    {
                      disbursementDate: {
                        gte: fromDateIST_DateOnly,
                      },
                    },
                    {
                      disbursementDate: {
                        lte: toDateIST_DateOnly,
                      },
                    },
                  ],
                  paymentRequests: {
                    some: {
                      type: TransactionTypeEnum.DISBURSEMENT,
                      status: TransactionStatusEnum.SUCCESS,
                    },
                  },
                },
                skip,
                take,
                include: {
                  user: {
                    include: {
                      userDetails: true,
                      employment: true,
                      brandSubDomain: {
                        select: { marketingSource: true, subdomain: true },
                      },
                      documents: {
                        include: {
                          leadMatches: {
                            where: {
                              status: "ACTIVE",
                              documentId: { not: null }, // Document-based matches
                            },
                            select: {
                              id: true,
                              entityType: true,
                              matchType: true,
                              matchField: true,
                              matchValue: true,
                              confidence: true,
                              createdAt: true,
                              userId: true,
                              documentId: true,
                              leadForm: {
                                select: {
                                  id: true,
                                  form_name: true,
                                  campaign_name: true,
                                  platform: true,
                                },
                              },
                            },
                          },
                        },
                      },
                      user_bank_account: {
                        where: {
                          isPrimary: true, // Assuming you want only primary bank accounts
                        },
                      },
                      payslips: true,
                      alternateAddresses: true,
                      alternatePhoneNumbers: true,
                      brand: {
                        include: {
                          brandConfig: true,
                        },
                      },
                      utmTracking: true, // Include UTM tracking for marketing source
                      leadMatches: {
                        where: {
                          status: "ACTIVE",
                          userId: { not: null }, // Direct user matches only
                        },
                        select: {
                          id: true,
                          entityType: true,
                          matchType: true,
                          matchField: true,
                          matchValue: true,
                          confidence: true,
                          createdAt: true,
                          userId: true,
                          documentId: true,
                          leadForm: {
                            select: {
                              id: true,
                              form_name: true,
                              campaign_name: true,
                              platform: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  loanStatusHistory: {
                    include: {
                      partnerUser: true, // Include partner users who changed the status
                    },
                  }, // Include loan status history
                  repayment: {
                    include: {
                      feeBreakdowns: true, // Include fee breakdowns for repayments
                    },
                  },
                  disbursement: {
                    include: {
                      deductions: {
                        include: {
                          taxes: true, // Include tax deductions
                        },
                      },
                    },
                  },
                  loanDetails: true,
                  allottedPartners: {
                    include: {
                      partnerUser: true, // Include partner user details
                    },
                  }, // Include allotted partners
                  paymentRequests: {
                    include: {
                      partialCollectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS, // Assuming 'SUCCESS' is the status for successful transactions
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED, // Assuming 'APPROVED' is the status for approved transactions
                        },
                      },
                      collectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS, // Assuming 'SUCCESS' is the status for successful transactions
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED, // Assuming 'APPROVED' is the status for approved transactions
                        },
                      },
                      disbursalTransactions: true,
                    },
                  },
                },
                orderBy: { disbursementDate: "desc" },
              }),
            10000, // batch size for loans (fewer expected results than users)
          );
          break;
        case ReportType.CICReport:
          // Logic for disbursed loan report
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.loan.findMany({
                where: {
                  brandId: brandId,
                  isActive: true,
                  user: {
                    isActive: true,
                  },
                  AND: [
                    {
                      disbursementDate: {
                        gte: fromDateIST_DateOnly,
                      },
                    },
                    {
                      disbursementDate: {
                        lte: toDateIST_DateOnly,
                      },
                    },
                  ],
                  paymentRequests: {
                    some: {
                      type: TransactionTypeEnum.DISBURSEMENT,
                      status: TransactionStatusEnum.SUCCESS,
                    },
                  },
                },
                skip,
                take,
                include: {
                  user: {
                    include: {
                      userDetails: true,
                      employment: true,
                      brandSubDomain: {
                        select: { marketingSource: true, subdomain: true },
                      },
                      documents: {
                        include: {
                          leadMatches: {
                            where: {
                              status: "ACTIVE",
                              documentId: { not: null }, // Document-based matches
                            },
                            select: {
                              id: true,
                              entityType: true,
                              matchType: true,
                              matchField: true,
                              matchValue: true,
                              confidence: true,
                              createdAt: true,
                              userId: true,
                              documentId: true,
                              leadForm: {
                                select: {
                                  id: true,
                                  form_name: true,
                                  campaign_name: true,
                                  platform: true,
                                },
                              },
                            },
                          },
                        },
                      },
                      user_bank_account: {
                        where: {
                          isPrimary: true, // Assuming you want only primary bank accounts
                        },
                      },
                      payslips: true,
                      alternateAddresses: true,
                      alternatePhoneNumbers: true,
                      brand: {
                        include: {
                          brandConfig: true,
                        },
                      },
                      utmTracking: true, // Include UTM tracking for marketing source
                      leadMatches: {
                        where: {
                          status: "ACTIVE",
                          userId: { not: null }, // Direct user matches only
                        },
                        select: {
                          id: true,
                          entityType: true,
                          matchType: true,
                          matchField: true,
                          matchValue: true,
                          confidence: true,
                          createdAt: true,
                          userId: true,
                          documentId: true,
                          leadForm: {
                            select: {
                              id: true,
                              form_name: true,
                              campaign_name: true,
                              platform: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  loanStatusHistory: {
                    include: {
                      partnerUser: true, // Include partner users who changed the status
                    },
                  }, // Include loan status history
                  repayment: {
                    include: {
                      feeBreakdowns: true, // Include fee breakdowns for repayments
                    },
                  },
                  disbursement: {
                    include: {
                      deductions: true, // Include deductions for disbursements
                    },
                  },
                  loanDetails: true,
                  allottedPartners: {
                    include: {
                      partnerUser: true, // Include partner user details
                    },
                  }, // Include allotted partners
                  paymentRequests: {
                    include: {
                      partialCollectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS, // Assuming 'SUCCESS' is the status for successful transactions
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED, // Assuming 'APPROVED' is the status for approved transactions
                        },
                      },
                      collectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS, // Assuming 'SUCCESS' is the status for successful transactions
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED, // Assuming 'APPROVED' is the status for approved transactions
                        },
                      },
                      disbursalTransactions: true,
                    },
                  },
                },
                orderBy: { disbursementDate: "desc" },
              }),
            10000, // batch size
          );
          break;

        case ReportType.NonDisbursedLoanReport:
          // Logic for non-disbursed loan report
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.loan.findMany({
                where: {
                  brandId: brandId,
                  isActive: true,
                  user: {
                    isActive: true,
                  },
                  AND: [
                    {
                      approvalDate: {
                        gte: fromDateIST_DateOnly,
                      },
                    },
                    {
                      approvalDate: {
                        lte: toDateIST_DateOnly,
                      },
                    },
                  ],
                  status: {
                    in: ["SANCTION_MANAGER_APPROVED", "APPROVED"],
                  },
                  agreement: {
                    status: "SIGNED",
                  },
                },
                skip,
                take,
                include: {
                  user: {
                    include: {
                      userDetails: true,
                      brandSubDomain: {
                        select: { marketingSource: true, subdomain: true },
                      },
                      employment: true,
                      documents: true,
                      user_bank_account: {
                        where: {
                          isPrimary: true, // Assuming you want only primary bank accounts
                        },
                      },
                      payslips: true,
                      alternateAddresses: true,
                      alternatePhoneNumbers: true,
                      brand: {
                        include: {
                          brandConfig: true,
                        },
                      },
                      utmTracking: true, // Include UTM tracking for marketing source
                      leadMatches: {
                        where: {
                          status: "ACTIVE",
                          userId: { not: null }, // Direct user matches only
                        },
                        select: {
                          id: true,
                          entityType: true,
                          matchType: true,
                          matchField: true,
                          matchValue: true,
                          confidence: true,
                          createdAt: true,
                          userId: true,
                          documentId: true,
                          leadForm: {
                            select: {
                              id: true,
                              form_name: true,
                              campaign_name: true,
                              platform: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  loanStatusHistory: {
                    include: {
                      partnerUser: true, // Include partner users who changed the status
                    },
                  }, // Include loan status history
                  repayment: {
                    include: {
                      feeBreakdowns: true, // Include fee breakdowns for repayments
                    },
                  },
                  disbursement: {
                    include: {
                      deductions: true, // Include deductions for disbursements
                    },
                  },
                  loanDetails: true,
                  allottedPartners: {
                    include: {
                      partnerUser: true, // Include partner user details
                    },
                  }, // Include allotted partners
                  paymentRequests: {
                    include: {
                      partialCollectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS, // Assuming 'SUCCESS' is the status for successful transactions
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED, // Assuming 'APPROVED' is the status for approved transactions
                        },
                      },
                      collectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS, // Assuming 'SUCCESS' is the status for successful transactions
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED, // Assuming 'APPROVED' is the status for approved transactions
                        },
                      },
                      disbursalTransactions: true,
                    },
                  },
                },
                orderBy: { createdAt: "desc" },
              }),
            10000, // batch size
          );
          break;
        case ReportType.MasterCollectionReport:
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.loan.findMany({
                where: {
                  brandId: brandId,
                  isActive: true,
                  user: {
                    isActive: true,
                  },
                  status: {
                    in: [
                      loan_status_enum.ACTIVE,
                      loan_status_enum.PARTIALLY_PAID,
                      loan_status_enum.PAID,
                      loan_status_enum.COMPLETED,
                      loan_status_enum.POST_ACTIVE,
                      loan_status_enum.SETTLED,
                      loan_status_enum.WRITE_OFF,
                    ],
                  },
                  OR: [
                    // Filter by loanDetails dueDate
                    {
                      AND: [
                        {
                          loanDetails: {
                            dueDate: {
                              gte: fromDateIST,
                            },
                          },
                        },
                        {
                          loanDetails: {
                            dueDate: {
                              lte: toDateIST,
                            },
                          },
                        },
                      ],
                    },
                    // Filter by paymentRequests with partialCollectionTransactions completedAt
                    {
                      paymentRequests: {
                        some: {
                          partialCollectionTransactions: {
                            some: {
                              status: TransactionStatusEnum.SUCCESS,
                              opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                              completedAt: {
                                gte: fromDateIST,
                                lte: toDateIST,
                              },
                            },
                          },
                        },
                      },
                    },
                    // Filter by paymentRequests with collectionTransactions completedAt
                    {
                      paymentRequests: {
                        some: {
                          collectionTransactions: {
                            some: {
                              status: TransactionStatusEnum.SUCCESS,
                              opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                              completedAt: {
                                gte: fromDateIST,
                                lte: toDateIST,
                              },
                            },
                          },
                        },
                      },
                    },
                  ],
                },
                skip,
                take,
                include: {
                  user: {
                    include: {
                      userDetails: true,
                      employment: true,
                      brandSubDomain: {
                        select: { marketingSource: true, subdomain: true },
                      },
                      documents: true,
                      user_bank_account: {
                        where: {
                          isPrimary: true, // Assuming you want only primary bank accounts
                        },
                      },
                      payslips: true,
                      alternateAddresses: true,
                      alternatePhoneNumbers: true,
                      brand: {
                        include: {
                          brandConfig: true,
                        },
                      },
                      utmTracking: true, // Include UTM tracking for marketing source
                      leadMatches: {
                        where: {
                          status: "ACTIVE",
                          userId: { not: null }, // Direct user matches only
                        },
                        select: {
                          id: true,
                          entityType: true,
                          matchType: true,
                          matchField: true,
                          matchValue: true,
                          confidence: true,
                          createdAt: true,
                          userId: true,
                          documentId: true,
                          leadForm: {
                            select: {
                              id: true,
                              form_name: true,
                              campaign_name: true,
                              platform: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  loanStatusHistory: {
                    include: {
                      partnerUser: true, // Include partner users who changed the status
                    },
                  }, // Include loan status history
                  repayment: {
                    include: {
                      feeBreakdowns: true, // Include fee breakdowns for repayments
                    },
                  },
                  disbursement: {
                    include: {
                      deductions: true, // Include deductions for disbursements
                    },
                  },
                  loanDetails: true,
                  allottedPartners: {
                    include: {
                      partnerUser: true, // Include partner user details
                    },
                  }, // Include allotted partners
                  loan_collection_allocated_partner: {
                    where: {
                      isActive: true,
                      isDeallocated: false,
                    },
                    include: {
                      partnerUser: {
                        include: {
                          reportsTo: true,
                          brandRoles: true,
                        },
                      },
                    },
                  },
                  paymentRequests: {
                    include: {
                      partialCollectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS, // Assuming 'SUCCESS' is the status for successful transactions
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED, // Assuming 'APPROVED' is the status for approved transactions
                          // completedAt: {
                          //   gte: fromDateIST,
                          //   lte: toDateIST,
                          // },
                        },
                      },
                      collectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS, // Assuming 'SUCCESS' is the status for successful transactions
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED, // Assuming 'APPROVED' is the status for approved transactions
                          // completedAt: {
                          //   gte: fromDateIST,
                          //   lte: toDateIST,
                          // },
                        },
                      },
                      disbursalTransactions: true,
                    },
                  },
                },
                orderBy: {
                  loanDetails: {
                    dueDate: "desc",
                  },
                },
              }),
            10000, // batch size
          );
          break;

        case ReportType.CollectionDueReport:
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.loan.findMany({
                where: {
                  brandId: brandId,
                  isActive: true,
                  user: {
                    isActive: true,
                  },
                  status: {
                    in: [
                      loan_status_enum.ACTIVE,
                      loan_status_enum.PARTIALLY_PAID,
                      loan_status_enum.PAID,
                      loan_status_enum.COMPLETED,
                      loan_status_enum.POST_ACTIVE,
                      loan_status_enum.SETTLED,
                      loan_status_enum.WRITE_OFF,
                    ],
                  },
                  OR: [
                    // Filter by loanDetails dueDate
                    {
                      AND: [
                        {
                          loanDetails: {
                            dueDate: {
                              gte: fromDateIST,
                            },
                          },
                        },
                        {
                          loanDetails: {
                            dueDate: {
                              lte: toDateIST,
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                skip,
                take,
                include: {
                  user: {
                    include: {
                      userDetails: true,
                      employment: true,
                      brandSubDomain: {
                        select: { marketingSource: true, subdomain: true },
                      },
                      documents: true,
                      user_bank_account: {
                        where: {
                          isPrimary: true, // Assuming you want only primary bank accounts
                        },
                      },
                      payslips: true,
                      alternateAddresses: true,
                      alternatePhoneNumbers: true,
                      brand: {
                        include: {
                          brandConfig: true,
                        },
                      },
                      utmTracking: true, // Include UTM tracking for marketing source
                      leadMatches: {
                        where: {
                          status: "ACTIVE",
                          userId: { not: null }, // Direct user matches only
                        },
                        select: {
                          id: true,
                          entityType: true,
                          matchType: true,
                          matchField: true,
                          matchValue: true,
                          confidence: true,
                          createdAt: true,
                          userId: true,
                          documentId: true,
                          leadForm: {
                            select: {
                              id: true,
                              form_name: true,
                              campaign_name: true,
                              platform: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  loanStatusHistory: {
                    include: {
                      partnerUser: true, // Include partner users who changed the status
                    },
                  }, // Include loan status history
                  repayment: {
                    include: {
                      feeBreakdowns: true, // Include fee breakdowns for repayments
                    },
                  },
                  disbursement: {
                    include: {
                      deductions: true, // Include deductions for disbursements
                    },
                  },
                  loanDetails: true,
                  allottedPartners: {
                    include: {
                      partnerUser: true, // Include partner user details
                    },
                  }, // Include allotted partners
                  loan_collection_allocated_partner: {
                    where: {
                      isActive: true,
                      isDeallocated: false,
                    },
                    include: {
                      partnerUser: {
                        include: {
                          reportsTo: true,
                          brandRoles: true,
                        },
                      },
                    },
                  },
                  paymentRequests: {
                    include: {
                      partialCollectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS, // Assuming 'SUCCESS' is the status for successful transactions
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED, // Assuming 'APPROVED' is the status for approved transactions
                        },
                      },
                      collectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS, // Assuming 'SUCCESS' is the status for successful transactions
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED, // Assuming 'APPROVED' is the status for approved transactions
                        },
                      },
                      disbursalTransactions: true,
                    },
                  },
                },
                orderBy: {
                  loanDetails: {
                    dueDate: "desc",
                  },
                },
              }),
            10000, // batch size
          );
          break;

        case ReportType.CollectionLoanReport:
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.loan.findMany({
                where: {
                  AND: [
                    {
                      brandId: brandId,
                      isActive: true,
                      user: {
                        isActive: true,
                      },
                      status: {
                        in: [
                          loan_status_enum.PARTIALLY_PAID,
                          loan_status_enum.PAID,
                          loan_status_enum.COMPLETED,
                          loan_status_enum.SETTLED,
                          loan_status_enum.WRITE_OFF,
                        ],
                      },
                    },
                    {
                      OR: [
                        // Filter by paymentRequests with partialCollectionTransactions completedAt
                        {
                          paymentRequests: {
                            some: {
                              partialCollectionTransactions: {
                                some: {
                                  status: TransactionStatusEnum.SUCCESS,
                                  opsApprovalStatus:
                                    OpsApprovalStatusEnum.APPROVED,
                                  completedAt: {
                                    gte: fromDateIST,
                                    lte: toDateIST,
                                  },
                                },
                              },
                            },
                          },
                        },
                        // Filter by paymentRequests with collectionTransactions completedAt
                        {
                          paymentRequests: {
                            some: {
                              collectionTransactions: {
                                some: {
                                  status: TransactionStatusEnum.SUCCESS,
                                  opsApprovalStatus:
                                    OpsApprovalStatusEnum.APPROVED,
                                  completedAt: {
                                    gte: fromDateIST,
                                    lte: toDateIST,
                                  },
                                },
                              },
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                skip,
                take,
                include: {
                  user: {
                    include: {
                      userDetails: true,
                      employment: true,
                      documents: true,
                      user_bank_account: {
                        where: {
                          isPrimary: true, // Assuming you want only primary bank accounts
                        },
                      },
                      brandSubDomain: {
                        select: { marketingSource: true, subdomain: true },
                      },
                      payslips: true,
                      alternateAddresses: true,
                      alternatePhoneNumbers: true,
                      brand: {
                        include: {
                          brandConfig: true,
                        },
                      },
                      utmTracking: true, // Include UTM tracking for marketing source
                      leadMatches: {
                        where: {
                          status: "ACTIVE",
                          userId: { not: null }, // Direct user matches only
                        },
                        select: {
                          id: true,
                          entityType: true,
                          matchType: true,
                          matchField: true,
                          matchValue: true,
                          confidence: true,
                          createdAt: true,
                          userId: true,
                          documentId: true,
                          leadForm: {
                            select: {
                              id: true,
                              form_name: true,
                              campaign_name: true,
                              platform: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  loanStatusHistory: {
                    include: {
                      partnerUser: true, // Include partner users who changed the status
                    },
                  }, // Include loan status history
                  repayment: {
                    include: {
                      feeBreakdowns: true, // Include fee breakdowns for repayments
                    },
                  },
                  disbursement: {
                    include: {
                      deductions: true, // Include deductions for disbursements
                    },
                  },
                  loanDetails: true,
                  allottedPartners: {
                    include: {
                      partnerUser: true, // Include partner user details
                    },
                  }, // Include allotted partners
                  paymentRequests: {
                    include: {
                      partialCollectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS,
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                          completedAt: {
                            gte: fromDateIST,
                            lte: toDateIST,
                          },
                        },
                        include: {
                          createdByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                          opsByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                        },
                        orderBy: {
                          completedAt: "desc",
                        },
                      },
                      collectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS,
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                          completedAt: {
                            gte: fromDateIST,
                            lte: toDateIST,
                          },
                        },
                        include: {
                          createdByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                          opsByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                        },
                        orderBy: {
                          completedAt: "desc",
                        },
                      },
                      disbursalTransactions: true,
                    },
                  },
                },
              }),
            10000, // batch size
          );
          break;
        case ReportType.MarketingReport:
          const batchSize = 3500;
          let offset = 0;
          reportData = [];
          let batch: any[] = [];

          do {
            batch = await this.prisma.user.findMany({
              where: {
                brandId,
                isActive: true,
                OR: [
                  {
                    createdAt: {
                      gte: fromDateIST,
                      lte: toDateIST,
                    },
                  },
                  {
                    loans: {
                      some: {
                        disbursementDate: {
                          gte: fromDateIST_DateOnly,
                          lte: toDateIST_DateOnly,
                        },
                        paymentRequests: {
                          some: {
                            type: TransactionTypeEnum.DISBURSEMENT,
                            status: TransactionStatusEnum.SUCCESS,
                          },
                        },
                      },
                    },
                  },
                ],
              },
              select: {
                id: true,
                formattedUserId: true,
                phoneNumber: true,
                createdAt: true,
                onboardingStep: true,

                brandSubDomain: {
                  select: {
                    marketingSource: true,
                    subdomain: true,
                  },
                },

                utmTracking: {
                  select: {
                    landingPageUrl: true,
                    utmCampaign: true,
                    utmSource: true,
                    utmMedium: true,
                    utmTerm: true,
                    utmContent: true,
                    clickid: true,
                  },
                },
                user_status_brand_reasons: {
                  select: {
                    brand_status_reasons: {
                      select: {
                        reason: true,
                      },
                    },
                  },
                },
                loans: {
                  select: {
                    id: true,
                    formattedLoanId: true,
                    status: true,
                    amount: true,
                    loanType: true,
                    is_repeat_loan: true,
                    createdAt: true,
                    disbursementDate: true,

                    disbursement: {
                      select: {
                        netAmount: true,
                      },
                    },

                    loanStatusHistory: {
                      where: {
                        status: loan_status_enum.REJECTED,
                      },
                      select: {
                        status: true,
                        message: true,
                        createdAt: true,

                        partnerUser: {
                          select: {
                            name: true,
                            email: true,
                          },
                        },

                        loan_status_brand_reasons: {
                          select: {
                            brandStatusReason: {
                              select: {
                                reason: true,
                              },
                            },
                          },
                        },
                      },
                      orderBy: { createdAt: "desc" },
                      take: 1, // Only need the latest rejection
                    },
                  },
                  orderBy: { createdAt: "desc" },
                },
              },
              orderBy: { createdAt: "desc" },
              skip: offset,
              take: batchSize,
            });

            reportData.push(...batch);
            offset += batchSize;
          } while (batch.length === batchSize);
          break;
        case ReportType.RejectReport:
          // Reject Report - Users and loans with rejection status
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.loan.findMany({
                where: {
                  brandId,
                  isActive: true,
                  user: {
                    isActive: true,
                  },
                  status: {
                    in: [
                      loan_status_enum.REJECTED,
                      loan_status_enum.APPROVED,
                      loan_status_enum.SANCTION_MANAGER_APPROVED,
                      loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
                      loan_status_enum.PENDING,
                      loan_status_enum.DISBURSED,
                      loan_status_enum.COMPLETED,
                    ],
                  },
                  createdAt: {
                    gte: fromDateIST,
                    lte: toDateIST,
                  },
                },
                skip,
                take,
                include: {
                  user: {
                    include: {
                      userDetails: true,
                      employment: true,
                      brandSubDomain: {
                        select: { marketingSource: true, subdomain: true },
                      },
                      documents: {
                        include: {
                          leadMatches: {
                            where: {
                              status: "ACTIVE",
                              documentId: { not: null },
                            },
                            select: {
                              id: true,
                              entityType: true,
                              matchType: true,
                              matchField: true,
                              matchValue: true,
                              confidence: true,
                              createdAt: true,
                              userId: true,
                              documentId: true,
                              leadForm: {
                                select: {
                                  id: true,
                                  form_name: true,
                                  campaign_name: true,
                                  platform: true,
                                },
                              },
                            },
                          },
                        },
                      },
                      user_bank_account: {
                        where: {
                          isPrimary: true,
                        },
                      },
                      payslips: true,
                      alternateAddresses: true,
                      alternatePhoneNumbers: true,
                      brand: {
                        include: {
                          brandConfig: true,
                        },
                      },
                      utmTracking: true,
                      leadMatches: {
                        where: {
                          status: "ACTIVE",
                          userId: { not: null },
                        },
                        select: {
                          id: true,
                          entityType: true,
                          matchType: true,
                          matchField: true,
                          matchValue: true,
                          confidence: true,
                          createdAt: true,
                          userId: true,
                          documentId: true,
                          leadForm: {
                            select: {
                              id: true,
                              form_name: true,
                              campaign_name: true,
                              platform: true,
                            },
                          },
                        },
                      },
                      user_status_brand_reasons: {
                        include: {
                          brand_status_reasons: true,
                        },
                      },
                    },
                  },
                  loanStatusHistory: {
                    include: {
                      partnerUser: true,
                      loan_status_brand_reasons: {
                        include: {
                          brandStatusReason: true,
                        },
                      },
                    },
                    orderBy: {
                      createdAt: "desc",
                    },
                  },
                  repayment: {
                    include: {
                      feeBreakdowns: true,
                    },
                  },
                  disbursement: {
                    include: {
                      deductions: {
                        include: {
                          taxes: true,
                        },
                      },
                    },
                  },
                  loanDetails: true,
                  allottedPartners: {
                    include: {
                      partnerUser: true,
                    },
                  },
                  paymentRequests: {
                    include: {
                      partialCollectionTransactions: true,
                      collectionTransactions: true,
                      disbursalTransactions: true,
                    },
                  },
                },
                orderBy: { createdAt: "desc" },
              }),
            10000, // batch size
          );
          break;

        case ReportType.CompletedLoanWithNoRepetReport: {
          // Get all users whose latest loan is COMPLETED based on closureDate within date range
          const rawQuery = `
          WITH LatestLoanPerUser AS (
    SELECT
        l."userId",
        l.id,
        l."formattedLoanId",
        l.status,
        l."disbursementDate",
        l."closureDate",
        l."createdAt",
        ld."dueDate",
        ROW_NUMBER() OVER (
            PARTITION BY l."userId"
            ORDER BY COALESCE(l."closureDate", l."createdAt") DESC
        ) AS loan_rank
    FROM loans l
    LEFT JOIN loan_details ld ON ld."loanId" = l.id
    WHERE l."brandId" = $1
      AND l."isActive" = true
)
SELECT
    u."formattedUserId",
    u."phoneNumber" AS "mobileNumber",
    u."email",
    TRIM(CONCAT(
        COALESCE(ud."firstName", ''), ' ',
        COALESCE(ud."middleName", ''), ' ',
        COALESCE(ud."lastName", '')
    )) AS "customerName",
    llpu."formattedLoanId" AS "loanId",
    l.amount AS "loanAmount",
    llpu.status,
    llpu."createdAt"        AS "applicationDate",
    l."approvalDate"        AS "approvalDate",
    llpu."disbursementDate" AS "disbursementDate",
    llpu."dueDate"          AS "dueDate",
    llpu."closureDate"      AS "closureDate",
    EXTRACT(DAY FROM (llpu."closureDate" - llpu."dueDate")) AS "dueDateClosureDateDiff"

FROM LatestLoanPerUser llpu
JOIN loans l ON l.id = llpu.id
JOIN users u ON u.id = llpu."userId"
LEFT JOIN user_details ud ON ud."userId" = u.id
WHERE u."isActive" = true
  AND llpu.loan_rank = 1
  AND llpu.status = 'COMPLETED'
  AND llpu."closureDate" BETWEEN $2 AND $3
ORDER BY llpu."closureDate" DESC;`;

          reportData = await this.prisma.$queryRawUnsafe(
            rawQuery,
            brandId,
            fromDateIST_DateOnly,
            toDateIST_DateOnly,
          );
          break;
        }
        case ReportType.ActiveLoansByDueDateReport: {
          // Active Loans by Due Date - Active and partially paid loans with disbursement and due dates
          const rawQuery = `
          SELECT 
            l."formattedLoanId",
            u."phoneNumber" as "mobileNumber",
            CONCAT(COALESCE(ud."firstName", ''), ' ', COALESCE(ud."middleName", ''), ' ', COALESCE(ud."lastName", '')) as "customerName",
            l.amount AS loan_amount,
            l."disbursementDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' AS "disbursementDate_IST",
            ld."dueDate",
            l.status,
            u."formattedUserId",
            r."totalObligation" AS repayment_amount
          FROM loans AS l
          LEFT JOIN loan_details AS ld ON ld."loanId" = l.id
          LEFT JOIN users AS u ON u.id = l."userId"
          LEFT JOIN user_details AS ud ON ud."userId" = u.id
          LEFT JOIN repayments AS r ON r."loanId" = l.id
          WHERE l.status IN ('ACTIVE', 'PARTIALLY_PAID')
            AND l."brandId" = $1
            AND l."isActive" = true
            AND ld."dueDate" >= $2
            AND ld."dueDate" <= $3
          ORDER BY ld."dueDate" DESC
        `;

          reportData = await this.prisma.$queryRawUnsafe(
            rawQuery,
            brandId,
            fromDateIST,
            toDateIST,
          );
          break;
        }
        case ReportType.CollectionAllocationExecutiveReport:
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.loan.findMany({
                where: {
                  brandId: brandId,
                  isActive: true,
                  user: {
                    isActive: true,
                  },
                  status: {
                    in: [
                      loan_status_enum.ACTIVE,
                      loan_status_enum.PARTIALLY_PAID,
                      loan_status_enum.PAID,
                      loan_status_enum.SETTLED,
                      loan_status_enum.WRITE_OFF,
                      loan_status_enum.COMPLETED,
                      loan_status_enum.POST_ACTIVE,
                    ],
                  },
                  AND: [
                    {
                      loanDetails: {
                        dueDate: {
                          gte: fromDateIST,
                        },
                      },
                    },
                    {
                      loanDetails: {
                        dueDate: {
                          lte: toDateIST,
                        },
                      },
                    },
                  ],
                },
                skip,
                take,
                select: {
                  id: true,
                  formattedLoanId: true,
                  amount: true,
                  status: true,
                  disbursementDate: true,
                  user: {
                    select: {
                      id: true,
                      formattedUserId: true,
                      userDetails: {
                        select: {
                          firstName: true,
                          middleName: true,
                          lastName: true,
                        },
                      },
                    },
                  },
                  loanDetails: {
                    select: {
                      dueDate: true,
                    },
                  },
                  loan_collection_allocated_partner: {
                    where: {
                      isActive: true,
                      isDeallocated: false,
                    },
                    select: {
                      isActive: true,
                      isDeallocated: true,
                      partnerUserId: true,
                      partnerUser: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                          brandRoles: {
                            select: {
                              role: {
                                select: {
                                  name: true,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                  repayment: {
                    select: {
                      totalObligation: true,
                      totalFees: true,
                    },
                  },
                  paymentRequests: {
                    select: {
                      type: true,
                      collectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS,
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                        },
                        select: {
                          amount: true,
                          principalAmount: true,
                          totalFees: true,
                        },
                      },
                      partialCollectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS,
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                        },
                        select: {
                          amount: true,
                          principalAmount: true,
                          totalFees: true,
                        },
                      },
                    },
                  },
                },
                orderBy: {
                  loanDetails: {
                    dueDate: "desc",
                  },
                },
              }),
            10000, // batch size
          );
          break;
        case ReportType.DisburseNonDisburseReport:
          reportData = await this.prisma.loan.findMany({
            where: {
              brandId: brandId,
              isActive: true,
              user: {
                isActive: true,
              },
              OR: [
                {
                  AND: [
                    {
                      disbursementDate: {
                        gte: fromDateIST_DateOnly,
                      },
                    },
                    {
                      disbursementDate: {
                        lte: toDateIST_DateOnly,
                      },
                    },
                  ],
                },
                // Non-disbursed loans
                {
                  AND: [
                    {
                      approvalDate: {
                        gte: fromDateIST_DateOnly,
                      },
                    },
                    {
                      approvalDate: {
                        lte: toDateIST_DateOnly,
                      },
                    },
                  ],
                  status: {
                    in: [
                      loan_status_enum.SANCTION_MANAGER_APPROVED,
                      loan_status_enum.APPROVED,
                    ],
                  },
                  agreement: {
                    status: "SIGNED",
                  },
                },
              ],
            },
            select: {
              id: true,
              formattedLoanId: true,
              amount: true,
              status: true,
              loanType: true,
              approvalDate: true,
              disbursementDate: true,
              is_repeat_loan: true,
              user: {
                select: {
                  id: true,
                  formattedUserId: true,
                  userDetails: {
                    select: {
                      firstName: true,
                      middleName: true,
                      lastName: true,
                      address: true,
                      city: true,
                      state: true,
                    },
                  },
                  documents: {
                    where: {
                      type: DocumentTypeEnum.PAN,
                    },
                    select: {
                      documentNumber: true,
                    },
                    take: 1,
                  },
                  user_bank_account: {
                    where: {
                      isPrimary: true,
                    },
                    select: {
                      accountHolderName: true,
                      bankName: true,
                      accountNumber: true,
                      ifscCode: true,
                    },
                    take: 1,
                  },
                },
              },
              loanDetails: {
                select: {
                  dueDate: true,
                  durationDays: true,
                },
              },
              repayment: {
                select: {
                  totalObligation: true,
                  totalFees: true,
                  feeBreakdowns: {
                    where: {
                      chargeMode: ChargeMode.EXCLUSIVE,
                    },
                    select: {
                      chargeMode: true,
                      chargeValue: true,
                      calculationValueType: true,
                    },
                  },
                },
              },
              disbursement: {
                select: {
                  netAmount: true,
                  totalDeductions: true,
                  deductions: {
                    where: {
                      chargeMode: ChargeMode.INCLUSIVE,
                    },
                    select: {
                      chargeMode: true,
                      chargeValue: true,
                      calculationValueType: true,
                    },
                  },
                },
              },
              loanStatusHistory: {
                where: {
                  status: loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
                },
                select: {
                  status: true,
                  partnerUser: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
              },
              paymentRequests: {
                where: {
                  status: TransactionStatusEnum.SUCCESS,
                  type: TransactionTypeEnum.DISBURSEMENT,
                },
                include: {
                  disbursalTransactions: {
                    where: {
                      status: TransactionStatusEnum.SUCCESS,
                    },
                    select: {
                      status: true,
                    },
                  },
                },
              },
            },
            orderBy: [{ disbursementDate: "desc" }, { approvalDate: "desc" }],
          });
          break;

        case ReportType.CollectionDueReport:
          // Collection Due Report - Loans due for collection based on due date
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.loan.findMany({
                where: {
                  brandId: brandId,
                  isActive: true,
                  user: {
                    isActive: true,
                  },
                  status: {
                    in: [
                      loan_status_enum.ACTIVE,
                      loan_status_enum.PARTIALLY_PAID,
                      loan_status_enum.PAID,
                      loan_status_enum.COMPLETED,
                      loan_status_enum.POST_ACTIVE,
                      loan_status_enum.SETTLED,
                      loan_status_enum.WRITE_OFF,
                    ],
                  },
                  AND: [
                    {
                      loanDetails: {
                        dueDate: {
                          gte: fromDateIST,
                        },
                      },
                    },
                    {
                      loanDetails: {
                        dueDate: {
                          lte: toDateIST,
                        },
                      },
                    },
                  ],
                },
                skip,
                take,
                include: {
                  user: {
                    include: {
                      userDetails: true,
                      employment: true,
                      documents: true,
                      user_bank_account: {
                        where: {
                          isPrimary: true,
                        },
                      },
                      brandSubDomain: {
                        select: { marketingSource: true, subdomain: true },
                      },
                      payslips: true,
                      alternateAddresses: true,
                      alternatePhoneNumbers: true,
                      brand: {
                        include: {
                          brandConfig: true,
                        },
                      },
                      utmTracking: true,
                      leadMatches: {
                        where: {
                          status: "ACTIVE",
                          userId: { not: null },
                        },
                        select: {
                          id: true,
                          entityType: true,
                          matchType: true,
                          matchField: true,
                          matchValue: true,
                          confidence: true,
                          createdAt: true,
                          userId: true,
                          documentId: true,
                          leadForm: {
                            select: {
                              id: true,
                              form_name: true,
                              campaign_name: true,
                              platform: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  loanStatusHistory: {
                    include: {
                      partnerUser: true,
                    },
                  },
                  repayment: {
                    include: {
                      feeBreakdowns: true,
                    },
                  },
                  disbursement: {
                    include: {
                      deductions: true,
                    },
                  },
                  loanDetails: true,
                  allottedPartners: {
                    include: {
                      partnerUser: true,
                    },
                  },
                  loan_collection_allocated_partner: {
                    where: {
                      isActive: true,
                      isDeallocated: false,
                    },
                    include: {
                      partnerUser: {
                        include: {
                          reportsTo: true,
                          brandRoles: true,
                        },
                      },
                    },
                  },
                  paymentRequests: {
                    include: {
                      partialCollectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS,
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                        },
                      },
                      collectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS,
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                        },
                      },
                      disbursalTransactions: true,
                    },
                  },
                },
                orderBy: {
                  loanDetails: {
                    dueDate: "asc",
                  },
                },
              }),
            10000,
          );
          break;

        case ReportType.EquifaxCreditReport:
          reportData = await this.prisma.loan.findMany({
            where: {
              brandId: brandId,
              isActive: true,
              user: {
                isActive: true,
              },
              AND: [
                {
                  disbursementDate: {
                    gte: fromDateIST_DateOnly,
                  },
                },
                {
                  disbursementDate: {
                    lte: toDateIST_DateOnly,
                  },
                },
              ],
              paymentRequests: {
                some: {
                  type: TransactionTypeEnum.DISBURSEMENT,
                  status: TransactionStatusEnum.SUCCESS,
                },
              },
            },
            select: {
              id: true,
              formattedLoanId: true,
              amount: true,
              status: true,
              disbursementDate: true,
              closureDate: true,
              closingType: true,
              user: {
                select: {
                  id: true,
                  phoneNumber: true,
                  email: true,
                  userDetails: {
                    select: {
                      firstName: true,
                      middleName: true,
                      lastName: true,
                      dateOfBirth: true,
                      gender: true,
                      address: true,
                      pincode: true,
                      state: true,
                      city: true,
                    },
                  },
                  documents: {
                    select: {
                      type: true,
                      documentNumber: true,
                      // issueDate: true,
                      // expiryDate: true,
                    },
                  },
                  alternatePhoneNumbers: {
                    select: {
                      phone: true,
                      relationship: true,
                    },
                    take: 2,
                  },
                  alternateAddresses: {
                    select: {
                      address: true,
                      pincode: true,
                      state: true,
                      city: true,
                      residenceType: true,
                    },
                    take: 1,
                  },
                  employment: {
                    select: {
                      officialEmail: true,
                      // companyPhone: true,
                      salary: true,
                      employmenttype: true,
                    },
                  },
                },
              },
              loanDetails: {
                select: {
                  dueDate: true,
                  durationDays: true,
                },
              },
              repayment: {
                select: {
                  totalObligation: true,
                  totalFees: true,
                  // emi: true,
                  feeBreakdowns: {
                    where: {
                      chargeMode: ChargeMode.EXCLUSIVE,
                    },
                    select: {
                      chargeValue: true,
                      calculationValueType: true,
                    },
                    take: 1,
                  },
                },
              },
              paymentRequests: {
                select: {
                  type: true,
                  status: true,
                  createdAt: true,
                  collectionTransactions: {
                    where: {
                      status: TransactionStatusEnum.SUCCESS,
                      opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                    },
                    select: {
                      amount: true,
                      completedAt: true,
                    },
                    orderBy: {
                      completedAt: "desc",
                    },
                    take: 1,
                  },
                },
              },
            },
            orderBy: { disbursementDate: "desc" },
          });
          break;
        case ReportType.FieldVisitReport:
          const fieldVisitQuery = `
    WITH ranked_references AS (
      SELECT 
        "userId",
        name,
        phone,
        relationship,
        ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt" ASC) as rn
      FROM alternate_phone_numbers
    ),
    ref1 AS (
      SELECT "userId", name as "referenceName1", phone as "referenceNumber1"
      FROM ranked_references
      WHERE rn = 1
    ),
    ref2 AS (
      SELECT "userId", name as "referenceName2", phone as "referenceNumber2"
      FROM ranked_references
      WHERE rn = 2
    ),
    latest_allocation AS (
      SELECT DISTINCT ON ("loanId")
        "loanId",
        "allottedAt"
      FROM loan_allotted_partner_user
      ORDER BY "loanId", "allottedAt" DESC
    )
    SELECT DISTINCT ON (l."formattedLoanId")
      l."formattedLoanId" AS "loanNumber",
      b.name AS "nbfcName",
      la."allottedAt" AS "allocationDate",
      ud.state AS "state",
      ud.city AS "city",
      TRIM(CONCAT(
        COALESCE(ud."firstName", ''), 
        ' ', 
        COALESCE(ud."middleName", ''), 
        ' ', 
        COALESCE(ud."lastName", '')
      )) AS "customerFullName",
      u."phoneNumber" AS "mobileNumber",
      (
        SELECT phone 
        FROM alternate_phone_numbers 
        WHERE "userId" = u.id 
        ORDER BY "createdAt" ASC 
        LIMIT 1
      ) AS "altMobileNumber",
      l.amount AS "loanAmount",
      l."disbursementDate" AS "disburseDate",
      COALESCE(r."totalObligation", 0) AS "repaymentAmount",
      ld."dueDate" AS "repaymentDate",
      u.email AS "personalMailId",
      emp."officialEmail" AS "officeMailId",
      ud.address AS "residentialAddress",
      ud.pincode AS "residentialPincode",
      emp."companyName" AS "companyName",
      emp."companyAddress" AS "companyAddress",
      emp."pinCode" AS "companyPincode",
      CASE 
        WHEN fv."require_field_visit" = true THEN 'Required'
        WHEN fv."require_field_visit" = false THEN 'Not Required'
        ELSE 'Not Required'
      END AS "callingTeamRemarks",
      COALESCE(ref1."referenceName1", '') AS "referenceName1",
      COALESCE(ref1."referenceNumber1", '') AS "referenceNumber1",
      COALESCE(ref2."referenceName2", '') AS "referenceName2",
      COALESCE(ref2."referenceNumber2", '') AS "referenceNumber2",
      l.status AS "loanStatus",
      d."documentNumber" AS "panNumber",
      l."createdAt" AS "loanCreatedAt"
    FROM field_visit fv
      INNER JOIN loans l ON fv."loan_id" = l.id
      INNER JOIN users u ON l."userId" = u.id
      INNER JOIN brands b ON l."brandId" = b.id
      LEFT JOIN user_details ud ON u.id = ud."userId"
      LEFT JOIN ref1 ON u.id = ref1."userId"
      LEFT JOIN ref2 ON u.id = ref2."userId"
      LEFT JOIN latest_allocation la ON l.id = la."loanId"
      LEFT JOIN loan_details ld ON l.id = ld."loanId"
      LEFT JOIN repayments r ON l.id = r."loanId"
      LEFT JOIN employment emp ON u.id = emp."userId"
      LEFT JOIN documents d ON u.id = d."userId" AND d.type = 'PAN'
    WHERE l."brandId" = $1
      AND fv."created_at" >= $2
      AND fv."created_at" <= $3
    ORDER BY l."formattedLoanId", l."disbursementDate" DESC
  `;

          reportData = await this.prisma.$queryRawUnsafe(
            fieldVisitQuery,
            brandId,
            _dayjs(fromDate).toDate(),
            _dayjs(toDate).toDate(),
          );
          break;
        case ReportType.DailyMarketingMISReport:
          reportData = await this.prisma.user.findMany({
            where: {
              brandId,
              isActive: true,
              createdAt: {
                gte: fromDateIST,
                lte: toDateIST,
              },
            },
            select: {
              id: true,
              formattedUserId: true,
              phoneNumber: true,
              createdAt: true,
              userDetails: {
                select: {
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  pincode: true,
                  state: true,
                },
              },
              employment: {
                select: {
                  employmenttype: true,
                },
              },
              brandSubDomain: {
                select: {
                  subdomain: true,
                },
              },
              user_status_brand_reasons: {
                select: {
                  id: true,
                  brand_status_reasons: {
                    select: {
                      id: true,
                      reason: true,
                      status: true,
                    },
                  },
                },
              },
              loans: {
                select: {
                  id: true,
                  formattedLoanId: true,
                  amount: true,
                  status: true,
                  disbursementDate: true,
                  is_repeat_loan: true,
                  loanStatusHistory: {
                    where: {
                      status: loan_status_enum.REJECTED,
                    },
                    select: {
                      status: true,
                      message: true,
                      createdAt: true,
                      loan_status_brand_reasons: {
                        select: {
                          brandStatusReason: {
                            select: {
                              reason: true,
                            },
                          },
                        },
                      },
                    },
                    orderBy: {
                      createdAt: "desc",
                    },
                    take: 1,
                  },
                  disbursement: {
                    select: {
                      netAmount: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
              },
            },
            orderBy: { createdAt: "desc" },
          });
          break;
        case ReportType.TransUnionReport:
          reportData = await this.prisma.loan.findMany({
            where: {
              brandId: brandId,
              isActive: true,
              user: {
                isActive: true,
              },
              AND: [
                {
                  disbursementDate: {
                    gte: fromDateIST_DateOnly,
                  },
                },
                {
                  disbursementDate: {
                    lte: toDateIST_DateOnly,
                  },
                },
              ],
              paymentRequests: {
                some: {
                  type: TransactionTypeEnum.DISBURSEMENT,
                  status: TransactionStatusEnum.SUCCESS,
                },
              },
            },
            select: {
              id: true,
              formattedLoanId: true,
              amount: true,
              status: true,
              disbursementDate: true,
              closureDate: true,
              closingType: true,
              user: {
                select: {
                  id: true,
                  phoneNumber: true,
                  email: true,
                  userDetails: {
                    select: {
                      firstName: true,
                      middleName: true,
                      lastName: true,
                      dateOfBirth: true,
                      gender: true,
                      address: true,
                      pincode: true,
                      state: true,
                      city: true,
                    },
                  },
                  documents: {
                    select: {
                      type: true,
                      documentNumber: true,
                    },
                  },
                  alternatePhoneNumbers: {
                    select: {
                      phone: true,
                      relationship: true,
                    },
                    take: 2,
                  },
                  alternateAddresses: {
                    select: {
                      address: true,
                      pincode: true,
                      state: true,
                      city: true,
                      residenceType: true,
                    },
                    take: 1,
                  },
                  employment: {
                    select: {
                      officialEmail: true,
                      salary: true,
                      employmenttype: true,
                    },
                  },
                },
              },
              loanDetails: {
                select: {
                  dueDate: true,
                  durationDays: true,
                },
              },
              repayment: {
                select: {
                  totalObligation: true,
                  totalFees: true,
                  feeBreakdowns: {
                    where: {
                      chargeMode: ChargeMode.EXCLUSIVE,
                    },
                    select: {
                      chargeValue: true,
                      calculationValueType: true,
                    },
                    take: 1,
                  },
                },
              },
              paymentRequests: {
                select: {
                  type: true,
                  status: true,
                  createdAt: true,
                  collectionTransactions: {
                    where: {
                      status: TransactionStatusEnum.SUCCESS,
                      opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                    },
                    select: {
                      amount: true,
                      completedAt: true,
                    },
                    orderBy: {
                      completedAt: "desc",
                    },
                    take: 1,
                  },
                },
              },
            },
            orderBy: { disbursementDate: "desc" },
          });
          break;

        case ReportType.InternalMarketingReport:
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.user.findMany({
                where: {
                  brandId,
                  isActive: true,
                  OR: [
                    {
                      createdAt: {
                        gte: fromDateIST,
                        lte: toDateIST,
                      },
                    },
                    {
                      loans: {
                        some: {
                          disbursementDate: {
                            gte: fromDateIST_DateOnly,
                            lte: toDateIST_DateOnly,
                          },
                          paymentRequests: {
                            some: {
                              type: TransactionTypeEnum.DISBURSEMENT,
                              status: TransactionStatusEnum.SUCCESS,
                            },
                          },
                        },
                      },
                    },
                  ],
                },

                skip,
                take,
                select: {
                  id: true,
                  formattedUserId: true,
                  phoneNumber: true,
                  email: true,
                  createdAt: true,
                  onboardingStep: true,
                  status_id: true,
                  occupation_type_id: true,
                  is_terms_accepted: true,
                  userDetails: {
                    select: {
                      firstName: true,
                      middleName: true,
                      lastName: true,
                    },
                  },
                  employment: {
                    select: {
                      salary: true,
                      salaryExceedsBase: true,
                    },
                  },
                  brand: {
                    select: {
                      brandConfig: {
                        select: {
                          salaryThresholdAmount: true,
                        },
                      },
                    },
                  },
                  brandSubDomain: {
                    select: {
                      subdomain: true,
                    },
                  },
                  utmTracking: {
                    select: {
                      utmCampaign: true,
                      utmTerm: true,
                      utmContent: true,
                      utmSource: true,
                      utmMedium: true,
                      clickid: true,
                    },
                  },
                  user_status_brand_reasons: {
                    select: {
                      brand_status_reasons: {
                        select: {
                          reason: true,
                        },
                      },
                    },
                  },
                  loans: {
                    where: {
                      disbursementDate: {
                        gte: fromDateIST_DateOnly,
                        lte: toDateIST_DateOnly,
                      },
                      is_repeat_loan: false,
                    },
                    select: {
                      id: true,
                      formattedLoanId: true,
                      amount: true,
                      status: true,
                      loanType: true,
                      is_repeat_loan: true,
                      disbursementDate: true,
                      disbursement: {
                        select: {
                          netAmount: true,
                        },
                      },
                      loanStatusHistory: {
                        where: {
                          status: loan_status_enum.REJECTED,
                        },
                        select: {
                          status: true,
                          message: true,
                          loan_status_brand_reasons: {
                            select: {
                              brandStatusReason: {
                                select: {
                                  reason: true,
                                },
                              },
                            },
                          },
                        },
                        orderBy: {
                          createdAt: "desc",
                        },
                        take: 1,
                      },
                    },
                    orderBy: {
                      createdAt: "desc",
                    },
                    take: 1,
                  },
                },
                orderBy: { createdAt: "desc" },
              }),
            10000,
          );
          break;

        case ReportType.CollectionRemarksReport:
          reportData = await this.prisma.loan.findMany({
            where: {
              brandId,
              isActive: true,
              loanStatusHistory: {
                some: {
                  message: {
                    startsWith: "COMMENT:",
                  },
                  createdAt: {
                    gte: fromDateIST,
                    lte: toDateIST,
                  },
                },
              },
            },
            select: {
              id: true,
              formattedLoanId: true,
              user: {
                select: {
                  phoneNumber: true,
                  userDetails: {
                    select: {
                      firstName: true,
                      middleName: true,
                      lastName: true,
                    },
                  },
                },
              },
              loanStatusHistory: {
                where: {
                  message: {
                    startsWith: "COMMENT:",
                  },
                  createdAt: {
                    gte: fromDateIST,
                    lte: toDateIST,
                  },
                },
                select: {
                  message: true,
                  createdAt: true,
                  partnerUser: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: "desc",
                },
              },
            },
            orderBy: { createdAt: "desc" },
          });
          break;

        case ReportType.OutstandingDataReport:
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.loan.findMany({
                where: {
                  brandId: brandId,
                  isActive: true,
                  user: {
                    isActive: true,
                  },
                  status: {
                    in: [
                      loan_status_enum.ACTIVE,
                      loan_status_enum.PARTIALLY_PAID,
                      loan_status_enum.POST_ACTIVE,
                    ],
                  },
                  disbursementDate: {
                    gte: fromDateIST_DateOnly,
                    lte: toDateIST_DateOnly,
                  },
                },
                skip,
                take,
                include: {
                  user: {
                    include: {
                      userDetails: true,
                      employment: true,
                      documents: {
                        where: {
                          type: {
                            in: [
                              DocumentTypeEnum.PAN,
                              DocumentTypeEnum.AADHAAR,
                            ],
                          },
                        },
                      },
                      user_bank_account: {
                        where: {
                          isPrimary: true,
                        },
                      },
                      alternatePhoneNumbers: {
                        orderBy: {
                          createdAt: "asc",
                        },
                        take: 2,
                      },
                      alternateAddresses: {
                        orderBy: {
                          createdAt: "asc",
                        },
                        take: 1,
                      },
                      brandSubDomain: {
                        select: { marketingSource: true, subdomain: true },
                      },
                      brand: {
                        include: {
                          brandConfig: true,
                        },
                      },
                      utmTracking: true,
                      leadMatches: {
                        where: {
                          status: "ACTIVE",
                          userId: { not: null },
                        },
                        select: {
                          id: true,
                          leadForm: {
                            select: {
                              campaign_name: true,
                              platform: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  loanDetails: true,
                  loanStatusHistory: {
                    where: {
                      OR: [
                        { status: loan_status_enum.APPROVED },
                        { status: loan_status_enum.SANCTION_MANAGER_APPROVED },
                        { status: loan_status_enum.CREDIT_EXECUTIVE_APPROVED },
                      ],
                    },
                    include: {
                      partnerUser: true,
                    },
                    orderBy: {
                      createdAt: "desc",
                    },
                    take: 1,
                  },
                  repayment: {
                    include: {
                      feeBreakdowns: true,
                    },
                  },
                  disbursement: {
                    include: {
                      deductions: {
                        include: {
                          taxes: true,
                        },
                      },
                    },
                  },
                  allottedPartners: {
                    include: {
                      partnerUser: true,
                    },
                  },
                  paymentRequests: {
                    include: {
                      partialCollectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS,
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                        },
                      },
                      collectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS,
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                        },
                      },
                      disbursalTransactions: true,
                    },
                  },
                },
                orderBy: { disbursementDate: "desc" },
              }),
            10000, // batch size
          );
          break;

        case ReportType.LoanCloseReport:
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.loan.findMany({
                where: {
                  brandId: brandId,
                  isActive: true,
                  user: {
                    isActive: true,
                  },
                  status: {
                    in: [
                      loan_status_enum.COMPLETED,
                      loan_status_enum.PAID,
                      loan_status_enum.SETTLED,
                      loan_status_enum.WRITE_OFF,
                    ],
                  },
                  closureDate: {
                    gte: fromDateIST_DateOnly,
                    lte: toDateIST_DateOnly,
                  },
                },
                skip,
                take,
                include: {
                  user: {
                    include: {
                      userDetails: true,
                      documents: {
                        where: {
                          type: DocumentTypeEnum.PAN,
                        },
                      },
                      brand: {
                        include: {
                          brandConfig: true,
                        },
                      },
                    },
                  },
                  loanDetails: true,
                  repayment: {
                    include: {
                      feeBreakdowns: true,
                    },
                  },
                  disbursement: true,
                  noDueCertificate: true, // ✅ This includes the LoanNoDueCertificate relation
                  paymentRequests: {
                    include: {
                      partialCollectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS,
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                        },
                        include: {
                          createdByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                          opsByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                        },
                      },
                      collectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS,
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                        },
                        include: {
                          createdByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                          opsByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
                orderBy: { closureDate: "desc" },
              }),
            10000, // batch size
          );
          break;
        case ReportType.TotalRecoveryReport:
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.loan.findMany({
                where: {
                  brandId: brandId,
                  isActive: true,
                  user: {
                    isActive: true,
                  },
                  status: {
                    in: [
                      loan_status_enum.ACTIVE,
                      loan_status_enum.PARTIALLY_PAID,
                      loan_status_enum.PAID,
                      loan_status_enum.COMPLETED,
                      loan_status_enum.POST_ACTIVE,
                      loan_status_enum.SETTLED,
                      loan_status_enum.WRITE_OFF,
                    ],
                  },
                  paymentRequests: {
                    some: {
                      OR: [
                        {
                          collectionTransactions: {
                            some: {
                              status: TransactionStatusEnum.SUCCESS,
                              opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                              completedAt: {
                                gte: fromDateIST,
                                lte: toDateIST,
                              },
                            },
                          },
                        },
                        {
                          partialCollectionTransactions: {
                            some: {
                              status: TransactionStatusEnum.SUCCESS,
                              opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                              completedAt: {
                                gte: fromDateIST,
                                lte: toDateIST,
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                skip,
                take,
                include: {
                  user: {
                    include: {
                      userDetails: true,
                      documents: {
                        where: {
                          type: DocumentTypeEnum.PAN,
                        },
                      },
                      brandSubDomain: {
                        select: { marketingSource: true, subdomain: true },
                      },
                      utmTracking: true,
                      leadMatches: {
                        where: {
                          status: "ACTIVE",
                          userId: { not: null },
                        },
                        select: {
                          id: true,
                          leadForm: {
                            select: {
                              campaign_name: true,
                              platform: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  loanDetails: true,
                  repayment: {
                    include: {
                      feeBreakdowns: true,
                    },
                  },
                  disbursement: true,
                  noDueCertificate: true,
                  paymentRequests: {
                    include: {
                      partialCollectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS,
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                          completedAt: {
                            gte: fromDateIST,
                            lte: toDateIST,
                          },
                        },
                        include: {
                          createdByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                          opsByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                        },
                      },
                      collectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS,
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                          completedAt: {
                            gte: fromDateIST,
                            lte: toDateIST,
                          },
                        },
                        include: {
                          createdByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                          opsByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
                orderBy: { disbursementDate: "desc" },
              }),
            10000, // batch size
          );
          break;
        case ReportType.TotalApproveSanctionReport:
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.loan.findMany({
                where: {
                  brandId: brandId,
                  isActive: true,
                  user: {
                    isActive: true,
                  },
                  status: {
                    in: [
                      loan_status_enum.APPROVED,
                      loan_status_enum.SANCTION_MANAGER_APPROVED,
                      loan_status_enum.DISBURSED,
                      loan_status_enum.ACTIVE,
                      loan_status_enum.PARTIALLY_PAID,
                      loan_status_enum.PAID,
                      loan_status_enum.COMPLETED,
                      loan_status_enum.POST_ACTIVE,
                    ],
                  },
                  approvalDate: {
                    gte: fromDateIST_DateOnly,
                    lte: toDateIST_DateOnly,
                  },
                },
                skip,
                take,
                include: {
                  user: {
                    include: {
                      userDetails: true,
                      employment: true,
                      documents: {
                        where: {
                          type: DocumentTypeEnum.PAN,
                        },
                      },
                      user_bank_account: {
                        where: {
                          isPrimary: true,
                        },
                        take: 1,
                      },
                      alternatePhoneNumbers: {
                        orderBy: {
                          createdAt: "asc",
                        },
                        take: 1,
                      },
                      brandSubDomain: {
                        select: { marketingSource: true, subdomain: true },
                      },
                      utmTracking: true,
                      leadMatches: {
                        where: {
                          status: "ACTIVE",
                          userId: { not: null },
                        },
                        select: {
                          id: true,
                          leadForm: {
                            select: {
                              campaign_name: true,
                              platform: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  loanDetails: true,
                  repayment: {
                    include: {
                      feeBreakdowns: true,
                    },
                  },
                  disbursement: {
                    include: {
                      deductions: true,
                    },
                  },
                  loanStatusHistory: {
                    where: {
                      OR: [
                        { status: loan_status_enum.PENDING },
                        { status: loan_status_enum.CREDIT_EXECUTIVE_APPROVED },
                        { status: loan_status_enum.SANCTION_MANAGER_APPROVED },
                        { status: loan_status_enum.APPROVED },
                      ],
                    },
                    include: {
                      partnerUser: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        },
                      },
                    },
                    orderBy: {
                      createdAt: "asc",
                    },
                  },
                  allottedPartners: {
                    include: {
                      partnerUser: {
                        select: {
                          id: true,
                          name: true,
                          email: true,
                        },
                      },
                    },
                  },
                },
                orderBy: { approvalDate: "desc" },
              }),
            10000, // batch size
          );
          break;
        case ReportType.LeadTotalReport:
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.user.findMany({
                where: {
                  brandId,
                  isActive: true,
                  createdAt: {
                    gte: fromDateIST,
                    lte: toDateIST,
                  },
                },
                skip,
                take,
                include: {
                  userDetails: true,
                  employment: true,
                  documents: {
                    where: {
                      type: {
                        in: [DocumentTypeEnum.PAN, DocumentTypeEnum.AADHAAR],
                      },
                    },
                  },
                  user_bank_account: {
                    where: {
                      isPrimary: true,
                    },
                    take: 1,
                  },
                  alternatePhoneNumbers: {
                    orderBy: {
                      createdAt: "asc",
                    },
                    take: 1,
                  },
                  brandSubDomain: {
                    select: { marketingSource: true, subdomain: true },
                  },
                  utmTracking: true,
                  leadMatches: {
                    where: {
                      status: "ACTIVE",
                      userId: { not: null },
                    },
                    select: {
                      id: true,
                      leadForm: {
                        select: {
                          campaign_name: true,
                          platform: true,
                        },
                      },
                    },
                  },
                  loans: {
                    include: {
                      loanDetails: true,
                      repayment: {
                        include: {
                          feeBreakdowns: true,
                        },
                      },
                      disbursement: {
                        include: {
                          deductions: true,
                        },
                      },
                      agreement: true,
                      allottedPartners: {
                        include: {
                          partnerUser: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                        },
                      },
                      loanStatusHistory: {
                        include: {
                          partnerUser: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                          loan_status_brand_reasons: {
                            include: {
                              brandStatusReason: {
                                select: {
                                  id: true,
                                  reason: true,
                                  status: true,
                                },
                              },
                            },
                          },
                        },
                        orderBy: {
                          createdAt: "asc",
                        },
                      },
                    },
                    orderBy: {
                      createdAt: "desc",
                    },
                    take: 1,
                  },
                },
                orderBy: { createdAt: "desc" },
              }),
            10000, // batch size
          );
          break;
        case ReportType.LoginSessionsReport: {
          const loginSessionsQuery = `
    SELECT 
      pu.email AS "userEmail",
      pu.name AS "userName",
      TO_CHAR((plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS "loginDate",
      CAST(COUNT(*) AS INTEGER) AS "totalSessions",
      TO_CHAR(MIN(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'), 'HH12:MI:SS AM') AS "firstLogin",
      TO_CHAR(MAX(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'), 'HH12:MI:SS AM') AS "lastLogin",
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'loginTime', TO_CHAR(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'HH12:MI:SS AM'),
          'logoutTime', TO_CHAR(plt."isLogoutAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'HH12:MI:SS AM'),
          'deviceType', d."deviceType",
          'os', d."os",
          'appVersion', d."appVersion",
          'ipAddress', d."ipAddress",
          'isLoggedOut', plt."isLoggedOut"
        )
        ORDER BY plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'
      ) AS "sessions"
    FROM 
      partner_login_tokens plt
    JOIN 
      partner_users pu ON pu.id = plt."partnerUserId"
    LEFT JOIN 
      devices d ON d."fpId" = plt."deviceId"
    WHERE 
      DATE(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') >= $1
      AND DATE(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') <= $2
    GROUP BY 
      pu.email,
      pu.name,
      TO_CHAR(plt."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')
    ORDER BY 
      pu.email,
      "loginDate" DESC
  `;

          reportData = await this.prisma.$queryRawUnsafe(
            loginSessionsQuery,
            fromDateIST,
            toDateIST,
          );
          break;
        }

        case ReportType.CollectionLoanReportByApprovedDate:
          reportData = await this.batchedFindMany(
            (skip, take) =>
              this.prisma.loan.findMany({
                where: {
                  AND: [
                    {
                      brandId: brandId,
                      isActive: true,
                      user: {
                        isActive: true,
                      },
                      status: {
                        in: [
                          loan_status_enum.PARTIALLY_PAID,
                          loan_status_enum.PAID,
                          loan_status_enum.COMPLETED,
                          loan_status_enum.SETTLED,
                          loan_status_enum.WRITE_OFF,
                        ],
                      },
                    },
                    {
                      OR: [
                        // Filter by paymentRequests with partialCollectionTransactions ppct__approved_at
                        {
                          paymentRequests: {
                            some: {
                              partialCollectionTransactions: {
                                some: {
                                  status: TransactionStatusEnum.SUCCESS,
                                  opsApprovalStatus:
                                    OpsApprovalStatusEnum.APPROVED,
                                  ppct__approved_at: {
                                    gte: fromDateIST,
                                    lte: toDateIST,
                                  },
                                },
                              },
                            },
                          },
                        },
                        // Filter by paymentRequests with collectionTransactions pct__approved_at
                        {
                          paymentRequests: {
                            some: {
                              collectionTransactions: {
                                some: {
                                  status: TransactionStatusEnum.SUCCESS,
                                  opsApprovalStatus:
                                    OpsApprovalStatusEnum.APPROVED,
                                  pct__approved_at: {
                                    gte: fromDateIST,
                                    lte: toDateIST,
                                  },
                                },
                              },
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
                skip,
                take,
                include: {
                  user: {
                    include: {
                      userDetails: true,
                      employment: true,
                      documents: true,
                      user_bank_account: {
                        where: {
                          isPrimary: true,
                        },
                      },
                      brandSubDomain: {
                        select: { marketingSource: true, subdomain: true },
                      },
                      payslips: true,
                      alternateAddresses: true,
                      alternatePhoneNumbers: true,
                      brand: {
                        include: {
                          brandConfig: true,
                        },
                      },
                      utmTracking: true,
                      leadMatches: {
                        where: {
                          status: "ACTIVE",
                          userId: { not: null },
                        },
                        select: {
                          id: true,
                          entityType: true,
                          matchType: true,
                          matchField: true,
                          matchValue: true,
                          confidence: true,
                          createdAt: true,
                          userId: true,
                          documentId: true,
                          leadForm: {
                            select: {
                              id: true,
                              form_name: true,
                              campaign_name: true,
                              platform: true,
                            },
                          },
                        },
                      },
                    },
                  },
                  loanStatusHistory: {
                    include: {
                      partnerUser: true,
                    },
                  },
                  repayment: {
                    include: {
                      feeBreakdowns: true,
                    },
                  },
                  disbursement: {
                    include: {
                      deductions: true,
                    },
                  },
                  loanDetails: true,
                  allottedPartners: {
                    include: {
                      partnerUser: true,
                    },
                  },
                  paymentRequests: {
                    include: {
                      partialCollectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS,
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                          ppct__approved_at: {
                            gte: fromDateIST,
                            lte: toDateIST,
                          },
                        },
                        include: {
                          createdByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                          opsByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                        },
                      },
                      collectionTransactions: {
                        where: {
                          status: TransactionStatusEnum.SUCCESS,
                          opsApprovalStatus: OpsApprovalStatusEnum.APPROVED,
                          pct__approved_at: {
                            gte: fromDateIST,
                            lte: toDateIST,
                          },
                        },
                        include: {
                          createdByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                          opsByPartner: {
                            select: {
                              id: true,
                              name: true,
                              email: true,
                            },
                          },
                        },
                      },
                      disbursalTransactions: true,
                    },
                  },
                },
              }),
            10000, // batch size
          );
          break;
        default:
          throw new BadRequestException("Invalid report type");
      }
      recordCount = reportData.length;
      return reportData;
    } catch (error) {
      success = false;
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;

      // Log the activity
      if (partnerUserId) {
        await this.reportLogService.logReportActivity({
          partnerUserId,
          brandId,
          reportType,
          action: "VIEW",
          reportFormat: "JSON",
          dateRange: { fromDate, toDate },
          duration,
          ipAddress,
          userAgent,
          success,
          errorMessage,
          recordCount,
          metadata: {
            endpoint: "getReport",
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }

  async exportReportToCSV(
    reportType: string,
    fromDate: string,
    toDate: string,
    brandId: string,
    partnerUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const startTime = Date.now();
    let success = true;
    let errorMessage: string | undefined;
    let recordCount = 0;
    let fileSize = 0;
    let filePath = "";
    // ✅ For Prisma queries (all DateTime columns, regardless of @db.Date)
    const fromDateIST = _dayjs
      .tz(fromDate, "Asia/Kolkata")
      .startOf("day")
      .toDate();
    const toDateIST = _dayjs.tz(toDate, "Asia/Kolkata").endOf("day").toDate();

    // ✅ For raw SQL queries with @db.Date columns: use "YYYY-MM-DD" format
    const fromDateIST_DateOnly = _dayjs
      .tz(fromDate, "Asia/Kolkata")
      .format("YYYY-MM-DD");
    const toDateIST_DateOnly = _dayjs
      .tz(toDate, "Asia/Kolkata")
      .format("YYYY-MM-DD");

    try {
      // Add date validation for CollectionLoanReportByApprovedDate
      if (reportType === ReportType.CollectionLoanReportByApprovedDate) {
        const minAllowedDate = new Date("2026-01-13");
        const requestedFromDate = fromDateIST;

        if (requestedFromDate < minAllowedDate) {
          throw new BadRequestException(
            "Report is only available from January 14, 2026 onwards. Please select a date range starting from or after January 14, 2026.",
          );
        }
      }

      const data = await this.getReport(reportType, fromDate, toDate, brandId);
      recordCount = data.length;
      switch (reportType) {
        case ReportType.MasterReport:
          filePath = await this.exportMasterReportCSV(
            data as MasterReportUser[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.DisbursedLoanReport:
          filePath = await this.exportDisbursedReportCSV(
            data as LoanWithRelations[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.MasterCollectionReport:
          filePath = await this.exportMasterCollectionReportCSV(
            data as LoanWithRelations[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.CollectionDueReport:
          filePath = await this.exportMasterCollectionReportCSV(
            data as LoanWithRelations[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.CollectionLoanReport:
          filePath = await this.exportCollectionReportCSV(
            data as LoanWithRelations[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.NonDisbursedLoanReport:
          filePath = await this.exportNonDisbursedReportCSV(
            data as LoanWithRelations[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.CICReport:
          filePath = await this.exportCICReportCSV(
            data as LoanWithRelations[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.MarketingReport:
          filePath = await this.exportMarketingReportCSV(
            data as MasterReportUser[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.RejectReport:
          filePath = await this.exportRejectReportCSV(
            data as LoanWithRelations[],
            brandId,
          );
          break;
        case ReportType.CompletedLoanWithNoRepetReport:
          filePath = await this.exportCompletedLoanWithNoRepetReportCSV(
            data as any[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.ActiveLoansByDueDateReport:
          filePath = await this.exportActiveLoansByDueDateReportCSV(
            data as any[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.CollectionAllocationExecutiveReport:
          filePath = await this.exportCollectionAllocationExecutiveReportCSV(
            data as LoanWithRelations[],
            brandId,
          );
          break;
        case ReportType.DisburseNonDisburseReport:
          filePath = await this.exportDisburseNonDisburseReportCSV(
            data as LoanWithRelations[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.EquifaxCreditReport:
          filePath = await this.exportEquifaxCreditReportCSV(
            data as LoanWithRelations[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.FieldVisitReport:
          filePath = await this.exportFieldVisitReportCSV(
            data as any[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.DailyMarketingMISReport:
          filePath = await this.exportDailyMarketingMISReportCSV(
            data as any[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.TransUnionReport:
          filePath = await this.exportTransUnionReportCSV(
            data as LoanWithRelations[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.InternalMarketingReport:
          filePath = await this.exportInternalMarketingReportCSV(
            data as any[],
            brandId,
            partnerUserId,
          );
          break;

        case ReportType.CollectionRemarksReport:
          filePath = await this.exportCollectionRemarksReportCSV(
            data as any[],
            brandId,
            partnerUserId,
          );
          break;

        case ReportType.LoanCloseReport:
          filePath = await this.exportLoanCloseReportCSV(
            data as LoanWithRelations[],
            brandId,
          );
          break;

        case ReportType.OutstandingDataReport:
          filePath = await this.exportOutstandingDataReportCSV(
            data as LoanWithRelations[],
            brandId,
            partnerUserId,
          );
          break;
        case ReportType.TotalRecoveryReport:
          filePath = await this.exportTotalRecoveryReportCSV(
            data as LoanWithRelations[],
            brandId,
          );
          break;

        case ReportType.TotalApproveSanctionReport:
          filePath = await this.exportTotalApproveSanctionReportCSV(
            data as LoanWithRelations[],
            brandId,
            partnerUserId,
          );
          break;

        case ReportType.LeadTotalReport:
          filePath = await this.exportLeadTotalReportCSV(
            data as any[],
            brandId,
            partnerUserId,
          );
          break;

        case ReportType.LoginSessionsReport:
          filePath = await this.exportLoginSessionsReportCSV(
            data as any[],
            brandId,
            partnerUserId,
          );
          break;

        case ReportType.CollectionLoanReportByApprovedDate:
          filePath = await this.exportCollectionLoanReportByApprovedDateCSV(
            data as LoanWithRelations[],
            brandId,
            partnerUserId,
          );
          break;

        default:
          throw new BadRequestException("Invalid report type for CSV export");
      }

      // Get file size
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        fileSize = stats.size;
      }

      // Send email notification if partnerUserId is provided
      if (partnerUserId) {
        try {
          await this.sendReportEmail(
            brandId,
            partnerUserId,
            reportType,
            fromDate,
            toDate,
            filePath,
          );
        } catch (emailError) {
          console.error(
            "Failed to send report email notification:",
            emailError,
          );
          // Don't throw - email failure shouldn't block report generation
        }
      }

      return filePath;
    } catch (error) {
      success = false;
      errorMessage = error.message;
      throw error;
    } finally {
      const duration = Date.now() - startTime;

      // Log the activity
      if (partnerUserId) {
        await this.reportLogService.logReportActivity({
          partnerUserId,
          brandId,
          reportType,
          action: "GENERATE",
          reportFormat: "CSV",
          dateRange: { fromDate, toDate },
          duration,
          ipAddress,
          userAgent,
          success,
          errorMessage,
          recordCount,
          fileSize,
          metadata: {
            endpoint: "exportReportToCSV",
            fileName: path.basename(filePath),
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }

  async sendReportViaEmail(
    reportType: string,
    fromDate: string,
    toDate: string,
    brandId: string,
    recipientEmail: string,
    recipientName?: string,
    partnerUserId?: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    let success = true;
    let errorMessage: string | undefined;
    let recordCount = 0;
    let fileSize = 0;

    try {
      // Generate the CSV file
      const filePath = await this.exportReportToCSV(
        reportType,
        fromDate,
        toDate,
        brandId,
      );

      // Read the file content and get file size
      const fileContent = fs.readFileSync(filePath);
      fileSize = fileContent.length;
      const fileName = path.basename(filePath);

      // Get record count from the data
      const data = await this.getReport(reportType, fromDate, toDate, brandId);
      recordCount = data.length;

      // Prepare email subject based on report type
      const reportTitles = {
        [ReportType.MasterReport]: "Master Report",
        [ReportType.DisbursedLoanReport]: "Disbursed Loan Report",
        [ReportType.NonDisbursedLoanReport]: "Non-Disbursed Loan Report",
        [ReportType.MasterCollectionReport]: "Master Collection Report",
        [ReportType.CollectionLoanReport]: "Collection Loan Report",
        [ReportType.CICReport]: "CIC Report",
        [ReportType.MarketingReport]: "Marketing Report",
        [ReportType.RejectReport]: "Reject Report",
        [ReportType.CompletedLoanWithNoRepetReport]:
          "Completed with no Repayment Report",
        [ReportType.ActiveLoansByDueDateReport]:
          "Active Loans by Due Date Report",
        [ReportType.CollectionAllocationExecutiveReport]:
          "Collection Allocation Executive Report",
        [ReportType.DisburseNonDisburseReport]:
          "Disburse & Non-Disburse Report",
        [ReportType.EquifaxCreditReport]: "Equifax Credit Report",
        [ReportType.FieldVisitReport]: "Field Visit Report",
        [ReportType.DailyMarketingMISReport]: "Daily Marketing MIS Report",
        [ReportType.TransUnionReport]: "TransUnion Report",
        [ReportType.InternalMarketingReport]: "Internal Marketing Report",
        [ReportType.CollectionRemarksReport]: "Collection Remarks Report",
      };

      const reportTitle = reportTitles[reportType] || "Report";
      const subject = `${reportTitle} - ${fromDate} to ${toDate}`;

      // Prepare email content
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Report Generated Successfully</h2>
          <p>Dear ${recipientName || "User"},</p>
          <p>Your requested <strong>${reportTitle}</strong> has been generated successfully.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #495057;">Report Details:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li><strong>Report Type:</strong> ${reportTitle}</li>
              <li><strong>Date Range:</strong> ${fromDate} to ${toDate}</li>
              <li><strong>Brand ID:</strong> ${brandId}</li>
              <li><strong>Record Count:</strong> ${recordCount}</li>
              <li><strong>Generated On:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <p>Please find the report attached as a CSV file. You can open it with Excel or any spreadsheet application.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px;">
            <p>This is an automated email. Please do not reply to this message.</p>
          </div>
        </div>
      `;

      // Send email with attachment
      const emailSent = await this.emailService.sendEmail({
        to: recipientEmail,
        name: recipientName || "User",
        subject: subject,
        html: htmlContent,
        attachments: [
          {
            filename: fileName,
            content: fileContent,
            contentType: "text/csv",
          },
        ],
      });

      // Clean up the temporary file
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.warn(
          `Failed to cleanup temporary file: ${filePath}`,
          cleanupError,
        );
      }

      if (emailSent) {
        return {
          success: true,
          message: `Report sent successfully to ${recipientEmail}`,
        };
      } else {
        success = false;
        errorMessage = "Failed to send email";
        return {
          success: false,
          message: "Failed to send email. Please try again later.",
        };
      }
    } catch (error) {
      console.error("Error sending report via email:", error);
      success = false;
      errorMessage = error.message;
      return {
        success: false,
        message: `Failed to generate or send report: ${error.message}`,
      };
    } finally {
      const duration = Date.now() - startTime;

      // Log the activity
      if (partnerUserId) {
        await this.reportLogService.logReportActivity({
          partnerUserId,
          brandId,
          reportType,
          action: "EMAIL_SENT",
          reportFormat: "CSV",
          dateRange: { fromDate, toDate },
          recipientEmail,
          duration,
          ipAddress,
          userAgent,
          success,
          errorMessage,
          recordCount,
          fileSize,
          metadata: {
            endpoint: "sendReportViaEmail",
            recipientName,
            timestamp: new Date().toISOString(),
          },
        });
      }
    }
  }

  private async exportMasterReportCSV(
    data: MasterReportUser[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `master-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    // Ensure reports directory exists
    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "CustomerId", title: "Customer ID" },
        { id: "CreatedAt", title: "Created At" },
        {
          id: "LoanApplicationCreatedAt",
          title: "Loan Application Creation Date",
        },
        { id: "MarketingSource", title: "Marketing Source" },
        { id: "Domain", title: "Domain" },
        { id: "CreditExecutiveEmail", title: "Credit Executive Email" },
        { id: "CreditExecutiveName", title: "Credit Executive Name" },
        { id: "RejectionReason", title: "Rejection Reason" },
        { id: "LeadRejectionRemarks", title: "Lead Rejection Remarks" },
        { id: "onboardingStep", title: "Onboarding Step" },
        { id: "Name", title: "Name" },
        { id: "aAdharName", title: "Aadhaar Name" },
        ...this.conditionalFields(partnerUserId, [
          { id: "Mobile", title: "Mobile" },
          { id: "PhoneNumber", title: "Phone Number" },
          { id: "PersonalEmail", title: "PersonalEmail" },
        ]),
        { id: "PAN", title: "PAN" },
        { id: "Aadhaar", title: "Aadhaar Number" },
        { id: "aAdharDOB", title: "Aadhaar DOB" },
        { id: "DOB", title: "DOB" },
        { id: "CreditScore", title: "Credit Score" },
        { id: "FatherName", title: "Father's Name" },
        { id: "MotherName", title: "Mother's Name" },
        { id: "Gender", title: "Gender" },
        { id: "PinCode", title: "Pin Code" },
        { id: "State", title: "State" },
        { id: "City", title: "City" },
        { id: "AadhaarVerified", title: "Aadhaar Verified" },
        { id: "PANVerified", title: "PAN Verified" },
        { id: "MaritalStatus", title: "Mariatal Status" },
        { id: "SpouseName", title: "Spouse Name" },
        { id: "ResidenceType", title: "Residence Type" },
        { id: "EmploymentType", title: "Employment Type" },
        { id: "MonthlyIncome", title: "Monthly Income" },
        { id: "WorkingSince", title: "Working Since" },
        { id: "IncomeMode", title: "Income Mode" },
        { id: "CompanyName", title: "Company Name" },
        { id: "Designation", title: "Designation" },
        ...this.conditionalFields(partnerUserId, [
          { id: "OfficeEmail", title: "Office Email" },
        ]),
        { id: "OfficeAddress", title: "Office Address" },
        { id: "OfficePincode", title: "Office Pincode" },
        { id: "OfficeCity", title: "Office City" },
        { id: "AadhaarAddress", title: "Aadhaar Address" },
        { id: "AadhaarNumber", title: "Aadhaar Number" },
        { id: "ResidenceAddress", title: "Residence Address" },
        { id: "ResidingSince", title: "Residing Since" },
        { id: "ReferenceName1", title: "Reference Name 1" },
        { id: "ReferenceNumber1", title: "Reference Number 1" },
        { id: "ReferenceRelation1", title: "Reference Relation 1" },
        { id: "ReferenceName2", title: "Reference Name 2" },
        { id: "ReferenceNumber2", title: "Reference Number 2" },
        { id: "ReferenceRelation2", title: "Reference Relation 2" },
        { id: "BeneficiaryName", title: "Beneficiary Name" },
        { id: "AccountNumber", title: "Account Number" },
        { id: "IFSCCode", title: "IFSC Code" },
        { id: "BranchName", title: "Branch Name" },
        { id: "BankName", title: "Bank Name" },
        { id: "AccountType", title: "Account Type" },
        { id: "PennyDropped", title: "Penny Dropped" },
        { id: "LoanIDs", title: "Loan IDs" },
        { id: "LoanStatuses", title: "Loan Statuses" },
        { id: "LoanAmounts", title: "Loan Amounts" },
        { id: "LoanStatusHistory", title: "Loan Status History" },
        { id: "BrandStatusReasons", title: "Brand Status Reasons" },
        { id: "SalaryDate1", title: "Salary Date 1" },
        { id: "SalaryDate2", title: "Salary Date 2" },
        { id: "SalaryDate3", title: "Salary Date 3" },
        { id: "SalaryAmount1", title: "Salary Amount 1" },
        { id: "SalaryAmount2", title: "Salary Amount 2" },
        { id: "SalaryAmount3", title: "Salary Amount 3" },
        { id: "AverageSalary", title: "Average Salary" },
        { id: "ActualNetSalary", title: "Actual Net Salary" },
        { id: "CustomerType", title: "Customer Type" },
        { id: "DedupeCheck", title: "Dedupe Check" },
        { id: "CustomerCategory", title: "Customer Category" },
        { id: "Obligations", title: "Obligations" },
        { id: "SalaryToIncomeRatio", title: "Salary to Income Ratio" },
        {
          id: "SanctionedAmountToIncomeRatio",
          title: "Sanctioned Amount to Income Ratio",
        },
        { id: "LoanRecommended", title: "Loan Recommended" },
        { id: "EligibleLoan", title: "Eligible Loan" },
        { id: "EligibleTenure", title: "Eligible Tenure" },
        { id: "CAMRemarks", title: "CAM Remarks" },
        { id: "CreditManagerRemarks", title: "Credit Manager's Remarks" },
        { id: "SanctionHeadRemarks", title: "Sanction Head's Remarks" },
        { id: "SanctionEmailSentOn", title: "Sanction Email Sent On" },
        { id: "AcceptanceEmail", title: "Acceptance Email" },
        { id: "DisbursalHeadRemarks", title: "Disbursal Head's Remarks" },
        { id: "DisbursedBy", title: "Disbursed By" },
        { id: "BureauCheck", title: "Bureau Check" },
        { id: "AadhaarUploaded", title: "Aadhaar Uploaded" },
        { id: "PANUploaded", title: "PAN Uploaded" },
        { id: "BankStatement", title: "Bank Statement" },
        { id: "Others", title: "Others" },
        { id: "BSA", title: "BSA" },
        { id: "salarySlip1", title: "salarySlip1" },
        { id: "salarySlip2", title: "salarySlip2" },
        { id: "salarySlip3", title: "salarySlip3" },
        { id: "UserAllottedPartnerUser", title: "User Allotted Partner User" },
        { id: "LoanAllottedPartnerUser", title: "Loan Allotted Partner User" },
        {
          id: "LoanCollectionAllocatedPartner",
          title: "Loan Collection Allocated Partner",
        },
      ],
    });

    const formattedData = data.map((user) => this.formatMasterReportData(user));
    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportDisbursedReportCSV(
    data: LoanWithRelations[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `disbursed-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "CustomerId", title: "Customer ID" },
        { id: "MarketingSource", title: "Marketing Source" },
        { id: "Domain", title: "Domain" },
        { id: "LoanNo", title: "Loan No" },

        { id: "priority", title: "Priority" },
        { id: "product", title: "Product" },
        { id: "purpose", title: "Purpose" },
        { id: "LeadCreated", title: "Lead Created" },
        { id: "ApprovedDate", title: "Approved date" },
        { id: "DisbursedDate", title: "Disbursed Date" },
        { id: "RepaymentDate", title: "Repayment Date" },
        { id: "Name", title: "Name" },
        { id: "Gender", title: "Gender" },
        { id: "DOB", title: "DOB" },
        { id: "Salary", title: "Salary" },
        { id: "AccountType", title: "Account Type" },
        { id: "PAN", title: "PAN" },
        { id: "Aadhaar", title: "Aadhaar" },
        ...this.conditionalFields(partnerUserId, [
          { id: "Mobile", title: "Mobile" },
          { id: "AlternateMobile", title: "Alternate Mobile" },
          { id: "Email", title: "Email" },
          { id: "OfficeEmail", title: "Office Email" },
        ]),

        { id: "SanctionedAmount", title: "Sanctioned Amount" },
        { id: "ROI", title: "ROI" },
        { id: "Tenure", title: "Tenure" },
        { id: "Status", title: "Status" },
        { id: "FreshRepeat", title: "Fresh/Repeat" },
        { id: "InterestAmount", title: "Interest Amount" },
        { id: "DisbursedAmount", title: "Disbursed Amount" },
        { id: "RepaymentAmount", title: "Repayment Amount" },
        { id: "PF", title: "PF Amount" },
        { id: "PFPercentage", title: "PF" },
        { id: "GST", title: "GST" },
        { id: "TaxPercentage", title: "Tax%" },
        { id: "TaxType", title: "Tax Type" },
        { id: "BeneficiaryBankName", title: "Beneficiary Bank Name" },
        { id: "BeneficiaryName", title: "Beneficiary Name" },
        { id: "IFSC", title: "IFSC" },
        { id: "DisbursedBank", title: "Disbursed Bank" },
        { id: "UTR", title: "UTR" },
        { id: "allocatedTo", title: "Sanctioned Processed By" },
        { id: "allocatedToName", title: "Name" },
        { id: "CreditManager", title: "Credit Manager" },
        { id: "CreditManagerName", title: "Name" },
        { id: "SanctionedBy", title: "Sanctioned By" },
        { id: "SanctionedByName", title: "Name" },
        { id: "ResidenceAddress", title: "Residence Address" },
        { id: "ResidenceCity", title: "Residence City" },
        { id: "ResidenceState", title: "Residence State" },
        { id: "ResidencePincode", title: "Residence Pincode" },
        { id: "CompanyName", title: "Company Name" },
        { id: "CompanyAddress", title: "Company Address" },
        { id: "CompanyState", title: "Company State" },
        { id: "CompanyCity", title: "Company City" },
        { id: "CompanyPincode", title: "Company Pincode" },
        { id: "BeneficiaryAccountNo", title: "Beneficiary Account No." },
      ],
    });

    const formattedData = data.map((loan: LoanWithRelations) =>
      this.formatDisbursedReportData(loan),
    );
    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportNonDisbursedReportCSV(
    data: LoanWithRelations[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `non-disbursed-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "CustomerId", title: "Customer ID" },
        { id: "LoanNo", title: "Loan No" },

        { id: "LeadCreated", title: "Lead Created" },
        { id: "ApprovedDate", title: "Approved date" },
        { id: "priority", title: "Priority" },
        { id: "product", title: "Product" },
        { id: "purpose", title: "Purpose" },
        { id: "RepaymentDate", title: "Repayment Date" },
        { id: "Name", title: "Name" },
        { id: "Gender", title: "Gender" },
        { id: "DOB", title: "DOB" },
        { id: "Salary", title: "Salary" },
        { id: "AccountType", title: "Account Type" },
        { id: "PAN", title: "PAN" },
        { id: "Aadhaar", title: "Aadhaar" },
        ...this.conditionalFields(partnerUserId, [
          { id: "Mobile", title: "Mobile" },
          { id: "AlternateMobile", title: "Alternate Mobile" },
          { id: "Email", title: "Email" },
          { id: "OfficeEmail", title: "Office Email" },
        ]),
        { id: "SanctionedAmount", title: "Sanctioned Amount" },
        { id: "ROI", title: "ROI" },
        { id: "Tenure", title: "Tenure" },
        { id: "Status", title: "Status" },
        { id: "InterestAmount", title: "Interest Amount" },
        { id: "DisbursedAmount", title: "Disbursed Amount" },
        { id: "RepaymentAmount", title: "Repayment Amount" },
        { id: "PF", title: "PF Amount" },
        { id: "PFPercentage", title: "PF" },
        { id: "BeneficiaryBankName", title: "Beneficiary Bank Name" },
        { id: "BeneficiaryName", title: "Beneficiary Name" },
        { id: "IFSC", title: "IFSC" },
        { id: "allocatedTo", title: "Sanctioned processed By" },
        { id: "allocatedToName", title: "Name" },
        { id: "Screener", title: "Screener" },
        { id: "CreditManager", title: "Credit Manager" },
        { id: "SanctionedBy", title: "Sanctioned By" },
        { id: "ResidenceAddress", title: "Residence Address" },
        { id: "ResidenceCity", title: "Residence City" },
        { id: "ResidenceState", title: "Residence State" },
        { id: "ResidencePincode", title: "Residence Pincode" },
        { id: "CompanyName", title: "Company Name" },
        { id: "CompanyAddress", title: "Company Address" },
        { id: "CompanyState", title: "Company State" },
        { id: "CompanyCity", title: "Company City" },
        { id: "CompanyPincode", title: "Company Pincode" },
        { id: "BeneficiaryAccountNo", title: "Beneficiary Account No." },
      ],
    });

    const formattedData = data.map((loan: LoanWithRelations) =>
      this.formatDisbursedReportData(loan),
    );
    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportMasterCollectionReportCSV(
    data: LoanWithRelations[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `master-collection-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "CustomerId", title: "Customer ID" },
        { id: "LoanNo", title: "Loan No" },
        // OldLoanId
        { id: "OldLoanId", title: "Old Loan ID" },
        { id: "DPD_Status", title: "DPD Status" },
        { id: "DPD_Days", title: "DPD Days" },

        { id: "Status", title: "Sanction Status" },
        { id: "FreshRepeat", title: "Fresh/Repeat" },
        { id: "SanctionedAmount", title: "Sanctioned Amount" },
        { id: "PF", title: "PF" },
        { id: "Tenure", title: "Tenure" },
        { id: "ROI", title: "ROI" },
        { id: "RepaymentAmount", title: "Repayment Amount" },
        { id: "DOD", title: "DOD" },
        { id: "DOR", title: "DOR" },
        { id: "Name", title: "Name" },
        { id: "PAN", title: "PAN" },
        ...this.conditionalFields(partnerUserId, [
          { id: "Mobile", title: "Mobile" },
          { id: "AlternateMobile1", title: "Alternate Mobile 1" },
          { id: "AlternateName1", title: "Alternate Name 1" },
          { id: "AlternateMobile2", title: "Alternate Mobile 2" },
          { id: "AlternateName2", title: "Alternate Name 2" },
          { id: "AlternateMobile3", title: "Alternate Mobile 3" },
          { id: "AlternateName3", title: "Alternate Name 3" },
        ]),
        { id: "State", title: "State" },
        { id: "City", title: "City" },
        ...this.conditionalFields(partnerUserId, [
          { id: "PersonalEmail", title: "Personal Email" },
          { id: "OfficeEmail", title: "Office Email" },
        ]),

        { id: "BankName", title: "Bank Name" },
        { id: "IFSC", title: "IFSC" },
        { id: "BeneficiaryAccount", title: "Beneficiary Account" },
        { id: "BeneficiaryName", title: "Beneficiary Name" },
        { id: "CreditedBank", title: "Credited Bank" },

        { id: "allocatedTo", title: "Allocated To" },
        { id: "Screener", title: "Credit Executive" },
        { id: "CreditManager", title: "Credit Manager" },
        { id: "SanctionedBy", title: "Sanctioned By" },
        { id: "disburseBy", title: "Disbursed By" },
        { id: "CollectionAllocatedTo", title: "Collection Executive" },
        {
          id: "CollectionAllocatedToEmail",
          title: "Collection Executive Email",
        },
        { id: "CollectionStatus", title: "Collection Status" },
        { id: "PaymentDate", title: "Payment Date" },
        { id: "PaidAmount", title: "Paid Amount" },
        { id: "DisbursedAmount", title: "Disbursed Amount" },
        { id: "PFAmount", title: "PF Amount" },
        { id: "Tax", title: "Tax" },

        { id: "INT", title: "INT" },
        { id: "PINT", title: "P-INT" },

        { id: "PenaltyDiscount", title: "Penalty Discount" },
        { id: "RoundOffDiscount", title: "Round Off Discount" },
        {
          id: "ExcessAmount",
          title: "Excess Amount",
        },
        { id: "UploadedBy", title: "Uploaded By" },
        { id: "VerifiedBy", title: "Verified By" },
        { id: "AccountRemarks", title: "Account Remarks" },
        { id: "CollectionRemarks", title: "Collection Remarks" },
      ],
    });

    const formattedData = data.map((loan) =>
      this.formatMasterCollectionReportData(loan),
    );
    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportCollectionReportCSV(
    data: LoanWithRelations[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `collection-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "CustomerId", title: "Customer ID" },
        { id: "source", title: "Source" },
        { id: "LoanNo", title: "Loan No" },
        { id: "OldLoanId", title: "Old Loan ID" },
        { id: "Status", title: "Status" },
        { id: "SanctionedAmount", title: "Sanctioned Amount" },
        { id: "ROI", title: "ROI" },
        { id: "PFPercentage", title: "PF" },
        { id: "InterestAmount", title: "Interest Amount" },
        { id: "RepaymentAmount", title: "Repayment Amount" },
        { id: "DisbursedDate", title: "Disbursed Date" },
        { id: "RepaymentDate", title: "Repayment Date" },
        { id: "Name", title: "Name" },
        { id: "PAN", title: "PAN" },
        ...this.conditionalFields(partnerUserId, [
          { id: "Mobile", title: "Mobile" },
          { id: "AlternateMobile", title: "AlternateMobile" },
        ]),
        { id: "State", title: "State" },
        { id: "City", title: "City" },
        { id: "CollectionStatus", title: "Collection Status" },
        { id: "PaymentDate", title: "Payment Date" },
        { id: "PaidAmount", title: "Paid Amount" },
        { id: "PFAmount", title: "PF Amount" },
        { id: "Tax", title: "Tax" },

        { id: "PrincipalReceived", title: "Prinicipal Received" },
        { id: "InterestReceived", title: "Interest Received" },
        { id: "PenaltyReceived", title: "Penalty Received" },
        {
          id: "PenaltyDiscount",
          title: "Penalty Discount",
        },
        {
          id: "RoundOffDiscount",
          title: "Round Off Discount",
        },
        {
          id: "ExcessAmount",
          title: "Excess Amount",
        },
        { id: "CreditedBank", title: "Credited Bank" },
        { id: "PaymentReference", title: "Payment Reference" },
        { id: "PaymentMode", title: "Payment Mode" },
        { id: "CreatedBy", title: "Created By" },
        { id: "ApprovedBy", title: "Approved By" },
        { id: "AccountRemarks", title: "Account Remarks" },
        // { id: "CollectionRemarks", title: "Collection Remarks" },
      ],
    });

    const formattedData = [];
    for (const loan of data) {
      const loanRows = this.formatCollectionReportData(loan);
      formattedData.push(...loanRows);
    }
    formattedData.sort((a, b) => {
      const dateA = new Date(a.PaymentDate);
      const dateB = new Date(b.PaymentDate);
      return dateB.getTime() - dateA.getTime();
    });
    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportCICReportCSV(
    data: LoanWithRelations[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `cic-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "CustomerId", title: "Customer ID" },
        { id: "ConsumerName", title: "Consumer Name" },
        { id: "DateOfBirth", title: "Date of Birth" },
        { id: "Gender", title: "Gender" },
        { id: "IncomeTaxIDNumber", title: "Income Tax ID Number" },
        { id: "UniversalIDNumber", title: "Universal ID Number" },
        ...this.conditionalFields(partnerUserId, [
          { id: "TelephoneNoMobile", title: "Telephone No.Mobile" },
          { id: "TelephoneNoResidence", title: "Telephone No.Residence" },
          { id: "EmailID1", title: "Email ID 1" },
          { id: "EmailID2", title: "Email ID 2" },
        ]),
        { id: "AddressLine1", title: "Address Line 1" },
        { id: "StateCode1", title: "State Code 1" },
        { id: "PINCode1", title: "PIN Code 1" },
        { id: "StateCode", title: "State Code" },
        { id: "PIN", title: "PIN" },
        { id: "AddressCategory1", title: "Address Category 1" },
        { id: "ResidenceCode1", title: "Residence Code 1" },
        { id: "CurrentNewMemberCode", title: "Current/New Member Code" },
        {
          id: "CurrentNewMemberShortName",
          title: "Current/New Member Short Name",
        },
        { id: "CurrNewAccountNo", title: "Curr/New Account No" },
        { id: "AccountType", title: "Account Type" },
        { id: "OwnershipIndicator", title: "Ownership Indicator" },
        { id: "DateOpenedDisbursed", title: "Date Opened/Disbursed" },
        { id: "DateOfLastPayment", title: "Date of Last Payment" },
        { id: "DateClosed", title: "Date Closed" },
        { id: "DateOfRepayment", title: "Date of Repayment" },
        { id: "DateReported", title: "Date Reported" },
        { id: "HighCreditSanctionedAmt", title: "High Credit/Sanctioned Amt" },
        { id: "CurrentBalance", title: "Current  Balance" },
        { id: "AmtOverdue", title: "Amt Overdue" },
        { id: "NoOfDaysPastDue", title: "No of Days Past Due" },
        { id: "AssetClassification", title: "Asset Classification" },
        { id: "OccupationCode", title: "Occupation Code" },
      ],
    });

    const formattedData = data.map((loan) => this.formatCICReportData(loan));
    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private formatMasterReportData(user: MasterReportUser) {
    // Format loan information with status history and brand reasons
    // Note: Partner details are fetched from loan allocations if available
    const creditExecutiveName = "";
    const creditExecutiveEmail = "";
    const loanInfo =
      user.loans
        ?.map((loan) => {
          const statusHistory = loan.loanStatusHistory
            .map((status) => {
              const brandReasons = status.loan_status_brand_reasons
                .map((reason) => reason.brandStatusReason.reason)
                .join(", ");
              const reasonText = status.message || status.status;
              const brandReasonText = brandReasons ? ` (${brandReasons})` : "";
              const partnerInfo = status.partnerUser
                ? ` by ${status.partnerUser.name || status.partnerUser.email}`
                : "";
              return `${reasonText}${brandReasonText}${partnerInfo}`;
            })
            .join(" → ");

          return `${loan.formattedLoanId}: ${statusHistory}`;
        })
        .join(" | ") || "";

    const rejectionReason = loanInfo;
    const allLeadMatches = [
      ...(user.leadMatches || []), // Direct user matches
      ...(user.documents?.flatMap((doc) => doc.leadMatches || []) || []), // Document-based matches
    ];
    const leadMatchesDetails = allLeadMatches.map((match) => ({
      id: match.id,
      entityType: match.entityType,
      matchType: match.matchType,
      matchField: match.matchField,
      confidence: match.confidence,
      hasUserId: !!match.userId,
      hasDocumentId: !!match.documentId,
      leadFormName: match.leadForm?.form_name,
      campaignName: match.leadForm?.campaign_name,
      platform: match.leadForm?.platform,
      createdAt: match.createdAt,
    }));

    const utmString =
      user.utmTracking && user.utmTracking.length > 0
        ? user.utmTracking
            .map((utm) =>
              `${utm.utmSource || ""} ${utm.utmMedium || ""} ${utm.utmCampaign || ""} ${utm.utmContent || ""} ${utm.utmTerm || ""}`.trim(),
            )
            .join(", ")
        : leadMatchesDetails.length
          ? ""
          : "";

    // Format each lead match detail into a short string (you can customize)
    const leadMatchesSummary = leadMatchesDetails
      .map(
        (match, index) =>
          `Match ${index + 1} [${match.matchType} - ${match.matchField} - Campaign: ${match.campaignName || "N/A"} ]`,
      )
      .join(" | ");

    const domain = user.brandSubDomain?.subdomain;
    const MarketingSource = `
  ${user.brandSubDomain?.marketingSource || ""}
  ${utmString}
  ${leadMatchesDetails.length > 0 ? " | " + leadMatchesSummary : ""}
`.trim();

    // Check if user is rejected based on status_id
    const isRejected =
      Number(user?.status_id) === UserStatusEnum.BLOCKED ||
      Number(user?.status_id) === UserStatusEnum.SUSPENDED;

    let loanStatuses: string;

    if (isRejected) {
      loanStatuses = "REJECTED";
    } else if (user?.loans && user.loans.length > 0) {
      loanStatuses = user.loans.map((loan) => loan.status).join(", ");
    } else {
      loanStatuses = "ONBOARDING";
    }
    return {
      // 🧾 Basic User Info
      CustomerId: user.formattedUserId || "",
      CreatedAt: formatDate(user.createdAt, "DD MMM YYYY"),
      LoanApplicationCreatedAt: user.loans?.[0]?.createdAt
        ? formatDate(user.loans[0].createdAt, "DD MMM YYYY")
        : "",
      Domain: domain || "",
      MarketingSource: MarketingSource,
      CreditExecutiveName: creditExecutiveName,
      CreditExecutiveEmail: creditExecutiveEmail,
      RejectionReason: rejectionReason,
      LeadRejectionRemarks:
        user?.user_status_brand_reasons
          ?.map((reason) => reason.brand_status_reasons.reason)
          .join(", ") || "",
      onboardingStep: user.onboardingStep || "0",
      Name: this.getFullName(user) || "",
      Mobile: user?.phoneNumber || "",
      PhoneNumber: user?.phoneNumber || "",
      PersonalEmail: user?.email || "",
      DOB: formatDate(user?.userDetails?.dateOfBirth, "DD MMM YYYY") || "",
      Gender: user?.userDetails?.gender || "",
      FatherName: user?.userDetails?.fathersName || "",
      MotherName: user?.userDetails?.mothersName || "",

      // 🆔 Identity Verification
      aAdharName: user.userDetails?.aAdharName
        ? user.userDetails?.aAdharName
        : "",
      aAdharDOB: user.userDetails?.aAdharDOB
        ? formatDate(user.userDetails?.aAdharDOB, "DD MMM YYYY")
        : "",
      Aadhaar:
        user?.documents?.find((d) => d.type === DocumentTypeEnum.AADHAAR)
          ?.documentNumber || "",
      AadhaarNumber:
        user?.documents?.find((d) => d.type === DocumentTypeEnum.AADHAAR)
          ?.documentNumber || "",
      PAN:
        user?.documents?.find((d) => d.type === DocumentTypeEnum.PAN)
          ?.documentNumber || "",
      AadhaarVerified:
        user?.documents?.find((d) => d.type === DocumentTypeEnum.AADHAAR)
          ?.status === document_status_enum.APPROVED || false,
      PANVerified:
        user?.documents?.find((d) => d.type === DocumentTypeEnum.PAN)
          ?.status === document_status_enum.APPROVED || false,
      BureauCheck: "",

      // 💑 Marital Info
      MaritalStatus: user?.userDetails?.maritalStatus || "",
      SpouseName: user?.userDetails?.spouseName || "",

      // 🏡 Address Details
      PinCode: user?.userDetails?.pincode || "",
      State: user?.userDetails?.state || "",
      City: user?.userDetails?.city || "",
      ResidenceType: user?.userDetails?.residenceType || "",
      ResidenceAddress: user?.userDetails?.address || "",
      ResidingSince: "",
      AadhaarAddress: user?.userDetails?.address || "",

      // 👔 Employment Details
      EmploymentType: user?.employment?.employmenttype || "",
      MonthlyIncome: user?.employment?.salaryExceedsBase
        ? `${user.brand?.brandConfig?.salaryThresholdAmount || 0}+`
        : user?.employment?.salary || 0,
      IncomeMode: user?.employment?.modeOfSalary || "",
      WorkingSince: user?.employment?.joiningDate
        ? formatDate(user?.employment?.joiningDate, "DD MMM YYYY")
        : "",
      CompanyName: user?.employment?.companyName || "",
      Designation: user?.employment?.designation || "",
      OfficeEmail: user?.employment?.officialEmail || "",
      OfficeAddress: user?.employment?.companyAddress || "",
      OfficeCity: user?.employment?.companyAddress || "",

      // 🧾 Bank Details
      BeneficiaryName: user?.user_bank_account?.[0]?.accountHolderName || "",
      AccountNumber: user?.user_bank_account?.[0]?.accountNumber || "",
      IFSCCode: user?.user_bank_account?.[0]?.ifscCode || "",
      BranchName: user?.user_bank_account?.[0]?.bankName || "",
      BankName: user?.user_bank_account?.[0]?.bankName || "",
      AccountType: user?.user_bank_account?.[0]?.accountType || "",
      PennyDropped: user?.user_bank_account?.[0]?.isVerified || "",

      // � Loan Information
      LoanIDs:
        user?.loans?.map((loan) => loan.formattedLoanId).join(", ") || "",
      LoanStatuses: loanStatuses,
      LoanAmounts:
        user?.loans
          ?.map((loan) => `₹${loan.amount.toLocaleString()}`)
          .join(", ") || "",
      LoanStatusHistory:
        user?.loans
          ?.map((loan) => {
            const history = loan.loanStatusHistory
              .map(
                (status) =>
                  `${status.status}${status.message ? `: ${status.message}` : ""}`,
              )
              .join(" → ");
            return `${loan.formattedLoanId}: ${history}`;
          })
          .join(" | ") || "",
      BrandStatusReasons:
        user?.loans
          ?.map((loan) => {
            const reasons = loan.loanStatusHistory.flatMap((status) =>
              status.loan_status_brand_reasons.map(
                (reason) =>
                  `${loan.formattedLoanId}-${status.status}: ${reason.brandStatusReason.reason}`,
              ),
            );
            return reasons.join(", ");
          })
          .join(" | ") || "",

      // �💸 Salary Info
      SalaryDate1: user?.employment?.expectedDateOfSalary || "",
      SalaryDate2: user?.employment?.expectedDateOfSalary || "",
      SalaryDate3: user?.employment?.expectedDateOfSalary || "",
      SalaryAmount1: user?.employment?.salaryExceedsBase
        ? `${user.brand?.brandConfig?.salaryThresholdAmount || 0}+`
        : user?.employment?.salary || "",
      SalaryAmount2: user?.employment?.salaryExceedsBase
        ? `${user.brand?.brandConfig?.salaryThresholdAmount || 0}+`
        : user?.employment?.salary || "",
      SalaryAmount3: user?.employment?.salaryExceedsBase
        ? `${user.brand?.brandConfig?.salaryThresholdAmount || 0}+`
        : user?.employment?.salary || "",
      AverageSalary: user?.employment?.salaryExceedsBase
        ? `${user.brand?.brandConfig?.salaryThresholdAmount || 0}+`
        : user?.employment?.salary || "",
      ActualNetSalary: user?.employment?.salaryExceedsBase
        ? `${user.brand?.brandConfig?.salaryThresholdAmount || 0}+`
        : user?.employment?.salary || "",

      // 🧑‍🤝‍🧑 Reference Info
      ReferenceName1: user.alternatePhoneNumbers?.[0]?.name || "",
      ReferenceNumber1: user.alternatePhoneNumbers?.[0]?.phone || "",
      ReferenceRelation1: user.alternatePhoneNumbers?.[0]?.relationship || "",
      ReferenceName2: user?.alternatePhoneNumbers?.[1]?.name || "",
      ReferenceNumber2: user?.alternatePhoneNumbers?.[1]?.phone || "",
      ReferenceRelation2: user?.alternatePhoneNumbers?.[1]?.relationship || "",

      // 🧮 Financial Assessment
      CreditScore: user.userDetails?.creditScore || "",
      CustomerType: "",
      DedupeCheck: "",
      CustomerCategory: "",
      Obligations: "",
      SalaryToIncomeRatio: "",
      SanctionedAmountToIncomeRatio: "",

      // ✅ Loan Recommendation
      LoanRecommended: "",
      EligibleLoan: "",
      EligibleTenure: "",

      // 📝 Remarks & Approvals
      CAMRemarks: "",
      CreditManagerRemarks: "",
      SanctionHeadRemarks: "",
      DisbursalHeadRemarks: "",
      DisbursedBy: "",

      // 📧 Communication
      SanctionEmailSentOn: "",
      AcceptanceEmail: "",

      // 📂 Document Uploads
      AadhaarUploaded:
        user?.documents?.some((d) => d.type === DocumentTypeEnum.AADHAAR) ||
        false,
      PANUploaded:
        user?.documents?.some((d) => d.type === DocumentTypeEnum.PAN) || false,
      BankStatement:
        user?.user_bank_account.some(
          (account) => account.BankAccountStatement.length > 0,
        ) || false,
      Others:
        user.otherDocuments
          .map((doc) => ` ${doc.documentNumber} (${doc.type})`)
          .join(", ") || "",

      // 🧑‍💼 Staff
      BSA: false,

      // Payslips
      salarySlip1: user?.payslips?.[0] ? true : false,
      salarySlip2: user?.payslips?.[1] ? true : false,
      salarySlip3: user?.payslips?.[2] ? true : false,
      UserAllottedPartnerUser: user.allocatedPartner
        ? `${user.allocatedPartner.email}${
            user.allocatedPartner.name ? ` (${user.allocatedPartner.name})` : ""
          } [${
            user.allocatedPartner.reportsToId ? "Executive" : "Manager/Head"
          }]`
        : "",
      LoanAllottedPartnerUser:
        user?.loans
          ?.flatMap(
            (loan) =>
              loan.allottedPartners?.map((allotted) => {
                const role = allotted.partnerUser.reportsToId
                  ? "Executive"
                  : "Manager/Head";
                return `${loan.formattedLoanId}: ${allotted.partnerUser.email}${
                  allotted.partnerUser.name
                    ? ` (${allotted.partnerUser.name})`
                    : ""
                } [${role}]`;
              }) || [],
          )
          .join(", ") || "",
      LoanCollectionAllocatedPartner:
        user?.loans
          ?.flatMap(
            (loan) =>
              loan.loan_collection_allocated_partner?.map(
                (collectionPartner) => {
                  const role = collectionPartner.partnerUser.reportsToId
                    ? "Executive"
                    : "Manager/Head";
                  return `${loan.formattedLoanId}: ${collectionPartner.partnerUser.email}${
                    collectionPartner.partnerUser.name
                      ? ` (${collectionPartner.partnerUser.name})`
                      : ""
                  } [${role}]${collectionPartner.isDeallocated ? " (Deallocated)" : ""}`;
                },
              ) || [],
          )
          .join(", ") || "",
    };
  }
  private formatDisbursedReportData(loan: LoanWithRelations) {
    const roi =
      loan.repayment.feeBreakdowns.filter(
        (fee) => fee.chargeMode === ChargeMode.EXCLUSIVE,
      ) || [];

    const formattedRoi = roi
      .map((fee) => {
        return `${fee.chargeValue} ${
          fee.calculationValueType === "percentage"
            ? "%"
            : fee.calculationValueType
        }`;
      })
      .join(", ");

    const pf =
      loan.disbursement.deductions.filter(
        (deduction) => deduction.chargeMode === ChargeMode.INCLUSIVE,
      ) || [];
    const formattedPf = pf
      .map((deduction) => {
        return `${deduction.chargeValue} ${
          deduction.calculationValueType === "percentage"
            ? "%"
            : deduction.calculationValueType
        }`;
      })
      .join(", ");

    const paymentRequests = loan.paymentRequests.find(
      (payment) =>
        payment.type === TransactionTypeEnum.DISBURSEMENT &&
        payment.status === TransactionStatusEnum.SUCCESS,
    );
    const disbursalTransactions =
      paymentRequests?.disbursalTransactions.filter(
        (transaction) => transaction.status === TransactionStatusEnum.SUCCESS,
      ) || [];
    const creditExecutive = loan.loanStatusHistory.find(
      (history) =>
        history.status === loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
    );
    const senctionManagerApproved = loan.loanStatusHistory.find(
      (history) =>
        history.status === loan_status_enum.SANCTION_MANAGER_APPROVED,
    );

    const approvedBy = loan.loanStatusHistory.filter(
      (history) => history.status === loan_status_enum.APPROVED,
    );
    const allocatedToEmails = creditExecutive?.partnerUser?.email || "";
    const allocatedToNames = creditExecutive?.partnerUser?.name || "";
    // Combine lead matches from user and documents
    const allLeadMatches = [
      ...(loan.user.leadMatches || []), // Direct user matches
      ...(loan.user.documents?.flatMap((doc) => doc.leadMatches || []) || []), // Document-based matches
    ];
    const leadMatchesDetails = allLeadMatches.map((match) => ({
      id: match.id,
      entityType: match.entityType,
      matchType: match.matchType,
      matchField: match.matchField,
      confidence: match.confidence,
      hasUserId: !!match.userId,
      hasDocumentId: !!match.documentId,
      leadFormName: match.leadForm?.form_name,
      campaignName: match.leadForm?.campaign_name,
      platform: match.leadForm?.platform,
      createdAt: match.createdAt,
    }));

    const utmString =
      loan.user.utmTracking && loan.user.utmTracking.length > 0
        ? loan.user.utmTracking
            .map((utm) =>
              `${utm.utmSource || ""} ${utm.utmMedium || ""} ${utm.utmCampaign || ""} ${utm.utmContent || ""} ${utm.utmTerm || ""}`.trim(),
            )
            .join(", ")
        : leadMatchesDetails.length
          ? ""
          : "";

    // Format each lead match detail into a short string (you can customize)
    const leadMatchesSummary = leadMatchesDetails
      .map(
        (match, index) =>
          `Match ${index + 1} [${match.matchType} - ${match.matchField} - Campaign: ${match.campaignName || "N/A"} ]`,
      )
      .join(" | ");

    // Final MarketingSource string
    const domain = loan.user.brandSubDomain?.subdomain;
    const MarketingSource = `
  ${loan.user.brandSubDomain?.marketingSource || ""}
  ${utmString}
  ${leadMatchesDetails.length > 0 ? " | " + leadMatchesSummary : ""}
`.trim();

    return {
      CustomerId: loan.user?.formattedUserId || "",
      MarketingSource: MarketingSource,
      Domain: domain || "",
      priority: "Non Priority",
      product: "Payday Loan",
      purpose: loan?.purpose || "",
      LoanNo: loan.formattedLoanId || "",
      LeadCreated: formatDate(loan.createdAt, "DD MMM YYYY"),
      ApprovedDate: formatDate(loan.approvalDate, "DD MMM YYYY"),
      DisbursedDate: formatDate(loan.disbursementDate, "DD MMM YYYY"),
      RepaymentDate: formatDate(loan.loanDetails?.dueDate, "DD MMM YYYY"),
      Name: this.getFullName(loan.user),
      Gender: loan.user?.userDetails?.gender || "",
      DOB: formatDate(loan.user?.userDetails?.dateOfBirth, "DD MMM YYYY"),
      Salary: loan.user?.employment?.salaryExceedsBase
        ? `${loan.user.brand?.brandConfig?.salaryThresholdAmount || 0}+`
        : loan.user?.employment?.salary || "",
      AccountType: loan.user?.user_bank_account?.[0]?.accountType || "",
      PAN:
        loan.user?.documents?.find((d) => d.type === DocumentTypeEnum.PAN)
          ?.documentNumber || "",
      Aadhaar:
        loan.user?.documents?.find((d) => d.type === DocumentTypeEnum.AADHAAR)
          ?.documentNumber || "",
      Mobile: this.formatedPhoneNo(loan.user?.phoneNumber),
      AlternateMobile: this.formatedPhoneNo(
        loan.user?.alternatePhoneNumbers?.[0]?.phone,
      ),
      Email: loan.user?.email || "",
      OfficeEmail: loan.user?.employment?.officialEmail || "",
      SanctionedAmount: loan.amount || 0,
      ROI: formattedRoi || "",
      Tenure: loan.loanDetails?.durationDays || 0,
      Status: loan.loanType,
      FreshRepeat: loan.is_repeat_loan ? "REPEAT" : "FRESH",
      InterestAmount: loan.repayment?.totalFees || 0,
      DisbursedAmount: loan.disbursement.netAmount || 0,
      RepaymentAmount: loan.repayment.totalObligation || 0,
      PF: (() => {
        const totalDeductions = loan.disbursement.totalDeductions || 0;
        const allTaxes =
          loan.disbursement.deductions?.flatMap(
            (deduction) => deduction.taxes || [],
          ) || [];

        // Calculate GST amount only for exclusive taxes
        const exclusiveGstAmount = allTaxes
          .filter((tax) => !tax.isInclusive) // Only exclusive taxes
          .reduce((total, tax) => total + tax.amount, 0);

        // Subtract GST only if there are exclusive taxes
        return exclusiveGstAmount > 0
          ? totalDeductions - exclusiveGstAmount
          : totalDeductions;
      })(),
      PFPercentage: formattedPf || "",
      GST:
        loan.disbursement.deductions?.reduce(
          (total, deduction) =>
            total +
            (deduction.taxes?.reduce(
              (taxTotal, tax) => taxTotal + tax.amount,
              0,
            ) || 0),
          0,
        ) || 0,
      TaxPercentage:
        loan.disbursement.deductions
          ?.flatMap((deduction) => deduction.taxes || [])
          .map(
            (tax) =>
              `${tax.chargeValue}${tax.valueType === "percentage" ? "%" : ""}`,
          )
          .join(", ") || "",
      TaxType:
        loan.disbursement.deductions
          ?.flatMap((deduction) => deduction.taxes || [])
          .map((tax) => (tax.isInclusive ? "Inclusive" : "Exclusive"))
          .join(", ") || "",
      BeneficiaryBankName: loan.user?.user_bank_account?.[0]?.bankName || "",
      BeneficiaryName:
        loan.user?.user_bank_account?.[0]?.accountHolderName || "",
      IFSC: loan.user?.user_bank_account?.[0]?.ifscCode || "",
      DisbursedBank:
        disbursalTransactions.length > 0
          ? disbursalTransactions[0].bankName || ""
          : "",
      UTR:
        disbursalTransactions.length > 0
          ? disbursalTransactions[0].externalRef
          : "",

      Screener: creditExecutive?.partnerUser?.email || "",
      ScreenerName: creditExecutive?.partnerUser?.name || "",

      CreditManager: senctionManagerApproved?.partnerUser?.email || "",
      CreditManagerName: senctionManagerApproved?.partnerUser?.name || "",

      SanctionedBy: approvedBy?.[0]?.partnerUser?.email || "",
      SanctionedByName: approvedBy?.[0]?.partnerUser?.name || "",
      allocatedTo: allocatedToEmails,
      allocatedToName: allocatedToNames,

      ResidenceAddress: loan.user?.userDetails?.address || "",
      ResidenceCity: loan.user?.userDetails?.city || "",
      ResidenceState: loan.user?.userDetails?.state || "",
      ResidencePincode: loan.user?.userDetails?.pincode || "",
      CompanyName: loan.user?.employment?.companyName || "",
      CompanyAddress: loan.user?.employment?.companyAddress || "",
      CompanyState: loan.user?.employment?.companyAddress || "",
      CompanyCity: loan.user?.employment?.companyAddress || "",
      CompanyPincode: loan.user?.employment?.pinCode || "",
      BeneficiaryAccountNo: (() => {
        const accNum = loan.user?.user_bank_account?.[0]?.accountNumber;
        return `="${String(accNum)}"`;
      })(),
    };
  }
  private formatMasterCollectionReportData(loan: LoanWithRelations) {
    const roi =
      loan.repayment.feeBreakdowns.filter(
        (fee) => fee.chargeMode === ChargeMode.EXCLUSIVE,
      ) || [];

    const formattedRoi = roi
      .map((fee) => {
        return `${fee.chargeValue} ${
          fee.calculationValueType === "percentage"
            ? "%"
            : fee.calculationValueType
        }`;
      })
      .join(", ");

    const pf =
      loan.disbursement.deductions.filter(
        (deduction) => deduction.chargeMode === ChargeMode.INCLUSIVE,
      ) || [];
    const formattedPf = pf
      .map((deduction) => {
        return `${deduction.chargeValue} ${
          deduction.calculationValueType === "percentage"
            ? "%"
            : deduction.calculationValueType
        }`;
      })
      .join(", ");

    const paymentRequests = loan.paymentRequests.find(
      (payment) =>
        payment.type === TransactionTypeEnum.COLLECTION &&
        payment.collectionTransactions.length > 0,
    );

    const partialPayment = loan.paymentRequests.find(
      (payment) =>
        payment.type === TransactionTypeEnum.PARTIAL_COLLECTION &&
        payment.partialCollectionTransactions.length > 0,
    );

    const successfulTransactions =
      paymentRequests?.collectionTransactions.filter(
        (tx) =>
          tx.status === TransactionStatusEnum.SUCCESS &&
          tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
      ) || [];

    const successfulPartialTransactions =
      partialPayment?.partialCollectionTransactions.filter(
        (tx) =>
          tx.status === TransactionStatusEnum.SUCCESS &&
          tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
      ) || [];

    const getUploadedAndVerifiedBy = () => {
      // Combine all successful transactions (both full and partial)
      const allTransactions = [
        ...successfulTransactions.map((tx) => ({
          ...tx,
          type: "full",
          completedAt: tx.completedAt,
        })),
        ...successfulPartialTransactions.map((tx) => ({
          ...tx,
          type: "partial",
          completedAt: tx.completedAt,
        })),
      ].sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateB - dateA; // Sort descending (latest first)
      });

      if (allTransactions.length === 0) {
        return {
          uploadedBy: "",
          verifiedBy: "",
        };
      }

      // Get the latest transaction
      const latestTransaction = allTransactions[0];

      // Get uploaded by (created by partner)
      let uploadedBy = "";
      if (latestTransaction.createdByPartner) {
        const partner = latestTransaction.createdByPartner;
        uploadedBy = `${partner.email}${partner.name ? ` (${partner.name})` : ""}`;
      }

      // Get verified by (ops partner who approved)
      let verifiedBy = "";
      if (latestTransaction.opsByPartner) {
        const partner = latestTransaction.opsByPartner;
        verifiedBy = `${partner.email}${partner.name ? ` (${partner.name})` : ""}`;
      }

      return {
        uploadedBy,
        verifiedBy,
      };
    };

    const { uploadedBy, verifiedBy } = getUploadedAndVerifiedBy();

    const remarks = successfulTransactions.map((tx) => tx.note).join(", ");
    const partialRemarks = successfulPartialTransactions
      .map((tx) => tx.note)
      .join(", ");
    // combine both remarks
    const allRemarks = [remarks, partialRemarks]
      .filter((r) => r && r.trim() !== "")
      .join(", ");

    // credit exexutive
    const creditExecutive = loan.loanStatusHistory.find(
      (history) =>
        history.status === loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
    );
    const disburseBy = loan.loanStatusHistory.find(
      (history) => history.status === loan_status_enum.DISBURSED,
    );
    // SANCTION_MANAGER_APPROVED
    const senctionManagerApproved = loan.loanStatusHistory.find(
      (history) =>
        history.status === loan_status_enum.SANCTION_MANAGER_APPROVED,
    );

    const approvedBy = loan.loanStatusHistory.filter(
      (history) => history.status === loan_status_enum.APPROVED,
    );

    const allocatedTo =
      loan.allottedPartners
        ?.map((partner) => {
          return `${partner.partnerUser.email}${
            partner.partnerUser.name ? ` (${partner.partnerUser.name})` : ""
          }`;
        })
        .join(", ") || "";
    //
    const tax = calculateTax(
      loan.disbursement.totalDeductions,
      18,
      "inclusive",
    );
    const dueDate = loan.loanDetails?.dueDate
      ? new Date(loan.loanDetails.dueDate)
      : null;
    const disbursementDate = loan.disbursementDate
      ? new Date(loan.disbursementDate)
      : null;

    function getLoanDPDStatus(dueDateStr: string, disbursementDateStr: string) {
      if (loan_status_enum.COMPLETED === loan.status) {
        return { dpd: 0, status: "COMPLETED" };
      }
      const IST_OFFSET = 5.5 * 60 * 60 * 1000;
      const toISTDate = (dateStr: string) => {
        const d = new Date(new Date(dateStr).getTime() + IST_OFFSET);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()); // strip time
      };

      const dueDate = toISTDate(dueDateStr);
      const disbursementDate = toISTDate(disbursementDateStr);
      const today = toISTDate(new Date().toISOString());

      const diffTime = today.getTime() - dueDate.getTime();
      const dpd = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24))); // use floor, not ceil

      let status = "UNKNOWN";
      if (today < dueDate) status = "CURRENT";
      else if (today.getTime() === dueDate.getTime()) status = "DUE_TODAY";
      else if (dpd > 0 && dpd <= 30) status = "OVERDUE_1_30";
      else if (dpd > 30 && dpd <= 60) status = "OVERDUE_31_60";
      else if (dpd > 60 && dpd <= 90) status = "OVERDUE_61_90";
      else if (dpd > 90) status = "NPA";

      return { dpd, status };
    }

    // Example usage
    const { dpd, status } = getLoanDPDStatus(
      dueDate ? dueDate.toISOString() : "",
      disbursementDate ? disbursementDate.toISOString() : "",
    );
    return {
      CustomerId: loan.user?.formattedUserId || "",
      LoanNo: loan.formattedLoanId || "",
      OldLoanId: loan.oldLoanId || "",
      Name: this.getFullName(loan.user),
      DPD_Status: status,
      DPD_Days: dpd,
      Status: loan.loanType || "",
      FreshRepeat: loan.is_repeat_loan ? "REPEAT" : "FRESH",
      PAN:
        loan.user?.documents?.find((d) => d.type === DocumentTypeEnum.PAN)
          ?.documentNumber || "",
      Mobile: loan.user?.phoneNumber || "",
      AlternateMobile1: loan.user?.alternatePhoneNumbers?.[0]?.phone || "",
      AlternateName1: loan.user?.alternatePhoneNumbers?.[0]?.name || "",
      AlternateMobile2: loan.user?.alternatePhoneNumbers?.[1]?.phone || "",
      AlternateName2: loan.user?.alternatePhoneNumbers?.[1]?.name || "",
      AlternateMobile3: loan.user?.alternatePhoneNumbers?.[2]?.phone || "",
      AlternateName3: loan.user?.alternatePhoneNumbers?.[2]?.name || "",
      State: loan.user?.userDetails?.state || "",
      City: loan.user?.userDetails?.city || "",
      PersonalEmail: loan.user?.email || "",
      OfficeEmail: loan.user?.employment?.officialEmail || "",
      SanctionedAmount: loan.amount || 0,
      PF: formattedPf || "",
      PFAmount: loan.disbursement.totalDeductions || 0,
      Tax: tax.taxAmount || 0,
      DisbursedAmount: loan.disbursement.netAmount || 0,
      Tenure: loan.loanDetails?.durationDays || 0,
      ROI: formattedRoi || "",
      RepaymentAmount: loan.repayment.totalObligation || 0,
      BankName: loan.user?.user_bank_account?.[0]?.bankName || "",
      IFSC: loan.user?.user_bank_account?.[0]?.ifscCode || "",
      BeneficiaryAccount:
        loan.user?.user_bank_account?.[0]?.accountNumber || "",
      BeneficiaryName:
        loan.user?.user_bank_account?.[0]?.accountHolderName || "",
      Screener: creditExecutive?.id
        ? `${creditExecutive.partnerUser.email}${creditExecutive.partnerUser.name ? ` (${creditExecutive.partnerUser.name})` : ""}`
        : "",
      CreditManager: senctionManagerApproved?.id
        ? `${senctionManagerApproved.partnerUser.email}${senctionManagerApproved.partnerUser.name ? ` (${senctionManagerApproved.partnerUser.name})` : ""}`
        : "",
      SanctionedBy: approvedBy?.[0]?.partnerUser?.email
        ? `${approvedBy[0].partnerUser.email}${approvedBy[0].partnerUser.name ? ` (${approvedBy[0].partnerUser.name})` : ""}`
        : "",
      allocatedTo: allocatedTo || "",
      disburseBy: disburseBy?.partnerUser?.email
        ? `${disburseBy.partnerUser.email}${disburseBy.partnerUser.name ? ` (${disburseBy.partnerUser.name})` : ""}`
        : "",
      CollectionAllocatedTo:
        loan.loan_collection_allocated_partner
          ?.map((partner) => partner.partnerUser.name || "N/A")
          .join(", ") || "",
      CollectionAllocatedToEmail:
        loan.loan_collection_allocated_partner
          ?.map((partner) => partner.partnerUser.email)
          .join(", ") || "",
      DOD: formatDate(loan.disbursementDate, "DD MMM YYYY"),
      DOR: formatDate(loan.loanDetails?.dueDate, "DD MMM YYYY"),
      CollectionStatus: collectionStatus(loan) || "",
      INT:
        (successfulTransactions || []).reduce(
          (sum, tx) => sum + (tx.totalFees || 0),
          0,
        ) +
        (successfulPartialTransactions || []).reduce(
          (sum, tx) => sum + (tx.totalFees || 0),
          0,
        ),
      PINT:
        (successfulTransactions || []).reduce(
          (sum, tx) => sum + (tx.totalPenalties || 0),
          0,
        ) +
        (successfulPartialTransactions || []).reduce(
          (sum, tx) => sum + (tx.totalPenalties || 0),
          0,
        ),
      PaymentDate:
        successfulPartialTransactions.length > 0
          ? formatDate(
              successfulPartialTransactions.at(-1)?.completedAt || "",
              "DD MMM YYYY",
            )
          : successfulTransactions.length > 0
            ? formatDate(
                successfulTransactions.at(-1)?.completedAt || "",
                "DD MMM YYYY",
              )
            : "",
      PaidAmount:
        (successfulTransactions || []).reduce(
          (sum, tx) => sum + (tx.amount?.toNumber?.() || 0),
          0,
        ) +
        (successfulPartialTransactions || []).reduce(
          (sum, tx) => sum + (tx.amount?.toNumber?.() || 0),
          0,
        ),

      CreditedBank: "",

      UploadedBy: uploadedBy,
      VerifiedBy: verifiedBy,

      AccountRemarks:
        paymentRequests?.status === TransactionStatusEnum.SUCCESS
          ? paymentRequests.description || ""
          : partialPayment?.status === TransactionStatusEnum.SUCCESS
            ? partialPayment.description || ""
            : "",
      CollectionRemarks: allRemarks || "",
      // PenaltyDiscount,RoundOffDiscount
      PenaltyDiscount:
        (successfulTransactions || []).reduce(
          (sum, tx) => sum + (tx.penaltyDiscount || 0),
          0,
        ) +
        (successfulPartialTransactions || []).reduce(
          (sum, tx) => sum + (tx.penaltyDiscount || 0),
          0,
        ),
      ExcessAmount:
        (successfulTransactions || []).reduce(
          (sum, tx) => sum + (tx.excessAmount || 0),
          0,
        ) +
        (successfulPartialTransactions || []).reduce(
          (sum, tx) => sum + (tx.excessAmount || 0),
          0,
        ),
      RoundOffDiscount:
        (successfulTransactions || []).reduce(
          (sum, tx) => sum + (tx.roundOffDiscount || 0),
          0,
        ) +
        (successfulPartialTransactions || []).reduce(
          (sum, tx) => sum + (tx.roundOffDiscount || 0),
          0,
        ),
    };
  }
  private formatCollectionReportData(loan: LoanWithRelations) {
    // Helper function to format charge values
    const formatCharge = (charge: {
      chargeValue: any;
      calculationValueType: string;
    }) =>
      `${charge.chargeValue}${charge.calculationValueType === "percentage" ? "%" : ""}`;

    // Get and format ROI
    const roi =
      loan.repayment.feeBreakdowns?.filter(
        (fee) => fee.chargeMode === ChargeMode.EXCLUSIVE,
      ) || [];
    const formattedRoi = roi.map(formatCharge).join(", ") || "";

    // Get and format PF
    const pf =
      loan.disbursement.deductions?.filter(
        (deduction) => deduction.chargeMode === ChargeMode.INCLUSIVE,
      ) || [];
    const formattedPf = pf.map(formatCharge).join(", ") || "";

    // Find payment requests
    const paymentRequests = loan.paymentRequests || [];
    const paymentRequest = paymentRequests.find(
      (p) =>
        p.type === TransactionTypeEnum.COLLECTION &&
        p.collectionTransactions?.length > 0,
    );
    const partialPayment = paymentRequests.find(
      (p) =>
        p.type === TransactionTypeEnum.PARTIAL_COLLECTION &&
        p.partialCollectionTransactions?.length > 0,
    );

    // Helper function to filter successful transactions
    const filterSuccessful = (transactions: any[]) =>
      transactions?.filter(
        (tx) =>
          tx.status === TransactionStatusEnum.SUCCESS &&
          tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
      ) || [];

    const successfulTransactions = filterSuccessful(
      paymentRequest?.collectionTransactions,
    );
    const successfulPartialTransactions = filterSuccessful(
      partialPayment?.partialCollectionTransactions,
    );

    // Calculate tax once (memoized since it's the same for all rows)
    const tax = calculateTax(
      loan.disbursement.totalDeductions,
      18,
      "inclusive",
    );
    const taxAmount = tax.taxAmount || 0;

    // Common base data (extracted to avoid repeating)
    const baseData = {
      CustomerId: loan.user?.formattedUserId || "",
      LoanNo: loan.formattedLoanId || "",
      OldLoanId: loan.oldLoanId || "",
      RepaymentDate: formatDate(loan.loanDetails?.dueDate || "", "DD MMM YYYY"),
      Status: loan.loanType || "",
      DisbursedDate: formatDate(loan.disbursementDate, "DD MMM YYYY"),
      Name: this.getFullName(loan.user),
      PAN:
        loan.user?.documents?.find((d) => d.type === "PAN")?.documentNumber ||
        "",
      Mobile: loan.user?.phoneNumber || "",
      AlternateMobile: loan.user?.alternatePhoneNumbers?.[0]?.phone || "",
      State: loan.user?.userDetails?.state || "",
      City: loan.user?.userDetails?.city || "",
      SanctionedAmount: loan.amount || 0,
      ROI: formattedRoi,
      InterestAmount: loan.repayment?.totalFees || 0,
      PFPercentage: formattedPf,
      PF: loan.disbursement.totalDeductions || 0,
      PFAmount: loan.disbursement.totalDeductions || 0,
      Tax: taxAmount,
      RepaymentAmount: loan.repayment.totalObligation || 0,
      CollectionStatus: collectionStatus(loan) || "",
    };

    // Helper function to format transaction rows
    const formatTransactionRow = (tx: any, isPartial: boolean = false) => {
      let status = "";
      const { closingType } = tx;

      if (closingType === closingTypeEnum.NORMAL) {
        status = isPartial
          ? tx.isPaymentComplete
            ? "CLOSED"
            : "PARTIALLY PAID"
          : "CLOSED";
        if (status === "CLOSED") {
          const dueDate = loan.loanDetails?.dueDate
            ? new Date(loan.loanDetails.dueDate)
            : null;
          const paymentDate = tx.completedAt ? new Date(tx.completedAt) : null;
          // pre closure on or before due date
          if (dueDate && paymentDate) {
            if (paymentDate < dueDate) {
              status = "PRE-CLOSED";
            } else if (
              paymentDate.getFullYear() === dueDate.getFullYear() &&
              paymentDate.getMonth() === dueDate.getMonth() &&
              paymentDate.getDate() === dueDate.getDate()
            ) {
              status = "CLOSED"; // same day
            } else if (paymentDate > dueDate) {
              status = "POST-CLOSED";
            }
          }
        }
      } else if (closingType === closingTypeEnum.SETTLEMENT) {
        status = "SETTLED";
      } else if (closingType === closingTypeEnum.WRITE_OFF) {
        status = "WRITTEN OFF";
      }
      const createdBy = tx.createdByPartner
        ? `${tx.createdByPartner.email}${tx.createdByPartner.name ? ` (${tx.createdByPartner.name})` : ""}`
        : "created by cutomer";
      const approvedBy = tx.opsByPartner
        ? `${tx.opsByPartner.email}${tx.opsByPartner.name ? ` (${tx.opsByPartner.name})` : ""}`
        : "";

      return {
        ...baseData,
        PaymentDate: tx.completedAt
          ? formatDate(tx.completedAt, "DD-MM-YYYY")
          : "",
        PaidAmount: tx.amount?.toNumber?.() || 0,
        PaymentReference: tx.externalRef || "",
        PaymentMode: tx.method || "",
        AccountRemarks: tx.note || "",
        PrincipalReceived: tx.principalAmount || 0,
        InterestReceived: tx.totalFees || 0,
        PenaltyReceived: tx.totalPenalties || 0,
        PenaltyDiscount: tx.penaltyDiscount || 0,
        RoundOffDiscount: tx.roundOffDiscount || 0,
        ExcessAmount: tx.excessAmount || 0,
        CollectionStatus: status,
        CreatedBy: createdBy,
        ApprovedBy: approvedBy,
      };
    };

    // Combine and sort all transactions by payment date
    const allTransactions = [
      ...successfulTransactions.map((tx) => ({ tx, isPartial: false })),
      ...successfulPartialTransactions.map((tx) => ({ tx, isPartial: true })),
    ].sort((a, b) => {
      const dateA = a.tx.completedAt ? new Date(a.tx.completedAt).getTime() : 0;
      const dateB = b.tx.completedAt ? new Date(b.tx.completedAt).getTime() : 0;
      return dateA - dateB;
    });

    // Format all sorted transactions
    return allTransactions.map(({ tx, isPartial }) =>
      formatTransactionRow(tx, isPartial),
    );
  }
  private formatCICReportData(loan: LoanWithRelations) {
    // Calculate overdue amount and days
    const currentDate = new Date();
    const dueDate = loan.loanDetails?.dueDate
      ? new Date(loan.loanDetails.dueDate)
      : null;
    const daysPastDue =
      dueDate && currentDate > dueDate
        ? Math.floor(
            (currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          )
        : 0;

    // Calculate current balance (remaining amount to be paid)
    const successfulCollections = loan.paymentRequests
      .filter((pr) => pr.type === TransactionTypeEnum.COLLECTION)
      .flatMap((pr) => pr.collectionTransactions)
      .filter(
        (tx) =>
          tx.status === TransactionStatusEnum.SUCCESS &&
          tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
      );

    const successfulPartialCollections = loan.paymentRequests
      .filter((pr) => pr.type === TransactionTypeEnum.PARTIAL_COLLECTION)
      .flatMap((pr) => pr.partialCollectionTransactions)
      .filter(
        (tx) =>
          tx.status === TransactionStatusEnum.SUCCESS &&
          tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
      );

    const totalPaid =
      successfulCollections.reduce(
        (sum, tx) => sum + (tx.amount?.toNumber?.() || 0),
        0,
      ) +
      successfulPartialCollections.reduce(
        (sum, tx) => sum + (tx.amount?.toNumber?.() || 0),
        0,
      );

    const currentBalance = (loan.repayment?.totalObligation || 0) - totalPaid;
    const overdueAmount = daysPastDue > 0 ? currentBalance : 0;

    // Get the latest payment date
    const allPayments = [
      ...successfulCollections,
      ...successfulPartialCollections,
    ];
    const sortedPayments = [...allPayments].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const latestPayment = sortedPayments[0];

    // Determine asset classification based on days past due
    let assetClassification = "Standard";
    if (daysPastDue > 90) {
      assetClassification = "Sub-standard";
    } else if (daysPastDue > 180) {
      assetClassification = "Doubtful";
    } else if (daysPastDue > 365) {
      assetClassification = "Loss";
    }
    const memberConfig = this.getMemberConfig(loan.brandId);

    return {
      CustomerId: loan.user?.formattedUserId || "",
      ConsumerName: this.getFullName(loan.user) || "",
      DateOfBirth:
        formatDate(loan.user?.userDetails?.dateOfBirth, "DDMMYYYY") || "",
      Gender: loan.user?.userDetails?.gender || "",
      IncomeTaxIDNumber:
        loan.user?.documents?.find((d) => d.type === DocumentTypeEnum.PAN)
          ?.documentNumber || "",
      UniversalIDNumber: (() => {
        const aadhaar =
          loan.user?.documents?.find((d) => d.type === DocumentTypeEnum.AADHAAR)
            ?.documentNumber || "";
        return aadhaar ? `="${aadhaar}"` : "";
      })(),
      TelephoneNoMobile: (() => {
        const phone = loan.user?.phoneNumber || "";
        return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
      })(),
      TelephoneNoResidence: (() => {
        const phone = loan.user?.alternatePhoneNumbers?.[0]?.phone || "";
        return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
      })(),
      EmailID1: loan.user?.email || "",
      EmailID2: loan.user?.employment?.officialEmail || "",
      AddressLine1: loan.user?.userDetails?.address || "",
      StateCode1:
        this.getStateCode(loan.user?.userDetails?.pincode)?.state || "",
      PINCode1: loan.user?.userDetails?.pincode || "",
      StateCode: this.getStateCode(loan.user?.userDetails?.pincode)?.code || "",
      PIN: loan.user?.userDetails?.pincode || "",
      AddressCategory1: "1", // Permanent address
      ResidenceCode1: loan.user?.userDetails?.residenceType || "",
      CurrentNewMemberCode: memberConfig.memberCode,
      CurrentNewMemberShortName: memberConfig.memberShortName,
      CurrNewAccountNo: loan.formattedLoanId || "",
      AccountType: "69", // Personal Loan
      OwnershipIndicator: "1", // Individual
      DateOpenedDisbursed: formatDate(loan.disbursementDate, "DDMMYYYY") || "",
      DateOfLastPayment: latestPayment
        ? formatDate(latestPayment.createdAt, "DDMMYYYY")
        : "",
      DateClosed:
        loan.status === loan_status_enum.COMPLETED ||
        loan.status === loan_status_enum.PAID
          ? formatDate(latestPayment?.createdAt, "DDMMYYYY")
          : "",
      DateOfRepayment: formatDate(loan.loanDetails?.dueDate, "DDMMYYYY") || "",
      DateReported: formatDate(new Date(), "DDMMYYYY"),
      HighCreditSanctionedAmt: loan.amount || 0,
      CurrentBalance: Math.max(currentBalance, 0),
      AmtOverdue: Math.max(overdueAmount, 0),
      NoOfDaysPastDue: Math.max(daysPastDue, 0),
      AssetClassification: assetClassification,
      OccupationCode: (() => {
        const employmentType = loan.user?.employment?.employmenttype;
        if (!employmentType) return "";
        // Salaried - Regular employees with employment contracts
        const salariedTypes = [
          "FULL_TIME",
          "PART_TIME",
          "CONTRACT",
          "TEMPORARY",
          "INTERN",
          "CASUAL",
          "APPRENTICE",
        ];
        // Self-Employed Professional - Independent professionals
        const selfEmployedProfessional = ["FREELANCE"];
        // Self-Employed - Business/commission-based work
        const selfEmployed = ["COMMISSION_BASED", "GIG"];

        if (salariedTypes.includes(employmentType)) return "1";
        if (selfEmployedProfessional.includes(employmentType)) return "2";
        if (selfEmployed.includes(employmentType)) return "3";
        return "4";
      })(),
    };
  }

  private async exportMarketingReportCSV(
    data: MasterReportUser[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `marketing-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    // Ensure reports directory exists
    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "CustomerId", title: "Customer ID" },
        { id: "userId", title: "User ID" },
        // ...this.conditionalFields(partnerUserId, [
        //   { id: "PhoneNumber", title: "Phone Number" },
        // ]),
        { id: "LoanId", title: "Loan ID" },
        { id: "LoanType", title: "Loan Type" },
        // { id: "FreshRepeat", title: "Fresh/Repeat" },
        { id: "Domain", title: "Domain" },
        { id: "LandingPageUrl", title: "Website URL" },
        { id: "UTMCampaign", title: "Campaign Name" },
        { id: "UTMTerm", title: "Campaign Term" },
        { id: "UTMContent", title: "Campaign Content" },
        { id: "UTMSource", title: "Campaign Source" },
        { id: "UTMMedium", title: "Campaign Medium" },
        { id: "UTMClickid", title: "UTM Click ID" },
        { id: "LeadStage", title: "Lead Stage" },
        { id: "RejectionRemarks", title: "Rejection Remarks" },
        { id: "RejectionDate", title: "Rejection Date" },
        { id: "IsReloanCase", title: "Is Reloan Case" },
        { id: "Domain", title: "Domain" },
        { id: "AppliedOn", title: "Applied On (MM/DD/YYYY)" },
        { id: "AmountDisbursed", title: "Amount Disbursed" },
        { id: "DisburalDate", title: "Disbursal Date" },
        { id: "SanctionDate", title: "Sanction Date" },
        { id: "UTMSourceFirstClick", title: "UTM Source (1st Click)" },
        {
          id: "UTMSourceFirstClickTimestamp",
          title: "UTM Source (1st Click) - Timestamp (MM/DD/YYYY)",
        },
        { id: "UTMSourceLastClick", title: "UTM Source (Last Click)" },
        {
          id: "UTMSourceLastClickTimestamp",
          title: "UTM Source (Last Click) - Timestamp (MM/DD/YYYY)",
        },
        { id: "UTMCampaign", title: "UTM Campaign" },
        { id: "UTMMedium", title: "UTM Medium" },
        { id: "UTMTerm", title: "UTM Term" },
        { id: "UTMContent", title: "UTM Content" },
        { id: "ClickID", title: "Click ID" },
      ],
    });

    const formattedData = data.flatMap((user) => {
      if (!user.loans || user.loans.length === 0) {
        return [this.formatMarketingReportData(user, null)];
      }
      return user.loans.map((loan) =>
        this.formatMarketingReportData(user, loan),
      );
    });
    await csvWriter.writeRecords(formattedData);
    return filePath;
  }

  private formatMarketingReportData(user: MasterReportUser, loan: any) {
    const latestLoan = loan;
    const sanctionedAmount = latestLoan?.amount || 0;
    const disbursedAmount = latestLoan?.disbursement?.netAmount || 0;

    // Determine lead stage based on onboarding step or loan status
    let leadStage = "New";
    if (user.onboardingStep) {
      const step = parseInt(String(user.onboardingStep));
      if (step === 0) leadStage = "New";
      else if (step >= 1 && step <= 3) leadStage = "Personal Info";
      else if (step >= 4 && step <= 6) leadStage = "Employment Info";
      else if (step >= 7 && step <= 9) leadStage = "Bank Details";
      else if (step >= 10) leadStage = "Onboarding Completed";
    }

    // If user has loans, use loan status as lead stage
    if (latestLoan) {
      const status = latestLoan.status;
      switch (status) {
        case loan_status_enum.PENDING:
          leadStage = "Loan Application Pending";
          break;

        case loan_status_enum.CREDIT_EXECUTIVE_APPROVED:
          leadStage = "Credit Executive Approved";
          break;

        case loan_status_enum.SANCTION_MANAGER_APPROVED:
          leadStage = "Sanction Manager Approved";
          break;

        case loan_status_enum.APPROVED:
          leadStage = "Sanction Head Approved";
          break;

        // Grouped "Disbursed" statuses
        case loan_status_enum.DISBURSED:
        case loan_status_enum.ACTIVE:
        case loan_status_enum.POST_ACTIVE:
        case loan_status_enum.PAID:
        case loan_status_enum.PARTIALLY_PAID:
        case loan_status_enum.COMPLETED:
        case loan_status_enum.SETTLED:
        case loan_status_enum.DEFAULTED:
        case loan_status_enum.OVERDUE:
        case loan_status_enum.WRITE_OFF:
          leadStage = "Disbursed";
          break;

        case loan_status_enum.REJECTED:
          leadStage = "Rejected";
          break;

        default:
          leadStage = status;
      }
    }
    const disbursedStatuses: loan_status_enum[] = [
      loan_status_enum.DISBURSED,
      loan_status_enum.ACTIVE,
      loan_status_enum.PARTIALLY_PAID,
      loan_status_enum.PAID,
      loan_status_enum.COMPLETED,
      loan_status_enum.POST_ACTIVE,
      loan_status_enum.WRITE_OFF,
      loan_status_enum.SETTLED,
      loan_status_enum.DEFAULTED,
      loan_status_enum.OVERDUE,
    ];

    const isDisbursed =
      latestLoan && disbursedStatuses.includes(latestLoan.status);
    let allRejectionRemarks = "";
    let rejectionDate = "";

    // Only get rejection date if loan is NOT disbursed
    if (!isDisbursed) {
      // Get rejection date from loan status history (already filtered to REJECTED status in query)
      if (
        latestLoan?.loanStatusHistory &&
        latestLoan.loanStatusHistory.length > 0
      ) {
        rejectionDate =
          formatDate(latestLoan.loanStatusHistory[0].createdAt, "MM-DD-YYYY") ||
          "";
      }

      // Also check for user-level rejection based on status_id
      if (
        !rejectionDate &&
        user.status_id !== null &&
        user.status_id !== undefined
      ) {
        rejectionDate = formatDate(new Date(), "MM-DD-YYYY");
      }
    }

    if (!isDisbursed) {
      const loanRejectionRemarks =
        latestLoan?.loanStatusHistory
          ?.map((history) => {
            const brandReasons = history.loan_status_brand_reasons
              .map((reason) => reason.brandStatusReason.reason)
              .join(", ");
            const message = history.message || "";
            const partnerInfo = history.partnerUser
              ? ` by ${history.partnerUser.name || history.partnerUser.email}`
              : "";

            if (brandReasons) {
              return `${brandReasons}${message ? ` - ${message}` : ""}${partnerInfo}`;
            } else if (message) {
              return `${message}${partnerInfo}`;
            }
            return "";
          })
          .filter(Boolean)
          .join(" | ") || "";

      // Format user status rejection remarks
      const userStatusRemarks =
        user.user_status_brand_reasons
          ?.map((reason) => reason.brand_status_reasons.reason)
          .join(", ") || "";

      // Combine both rejection remarks
      allRejectionRemarks = [loanRejectionRemarks, userStatusRemarks]
        .filter(Boolean)
        .join(" | ");
    }

    // Extract UTM details with new fields
    const utmDetails =
      user.utmTracking && user.utmTracking.length > 0
        ? user.utmTracking.map((utm) => ({
            LandingPageUrl: utm.landingPageUrl || "",
            UTMCampaign: utm.utmCampaign || "",
            UTMTerm: utm.utmTerm || "",
            UTMContent: utm.utmContent || "",
            UTMSource: utm.utmSource || "",
            UTMMedium: utm.utmMedium || "",
            UTMClickid: utm.clickid || "",
          }))
        : [
            {
              LandingPageUrl: "",
              UTMCampaign: "",
              UTMTerm: "",
              UTMContent: "",
              UTMSource: "",
              UTMMedium: "",
              UTMClickid: "",
            },
          ];

    const landingPageUrl = utmDetails
      .map((utm) => utm.LandingPageUrl)
      .join(", ");
    const utmCampaign = utmDetails.map((utm) => utm.UTMCampaign).join(", ");
    const utmTerm = utmDetails.map((utm) => utm.UTMTerm).join(", ");
    const utmContent = utmDetails.map((utm) => utm.UTMContent).join(", ");
    const utmSource = utmDetails.map((utm) => utm.UTMSource).join(", ");
    const utmMedium = utmDetails.map((utm) => utm.UTMMedium).join(", ");
    const utmClickid = utmDetails.map((utm) => utm.UTMClickid).join(", ");

    const calculateAge = (dob: Date | null) => {
      if (!dob) return "";
      const today = new Date();
      const birthDate = new Date(dob);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (
        monthDiff < 0 ||
        (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ) {
        age--;
      }
      return age.toString();
    };

    // Get source (domain or marketing source)
    const source =
      user.brandSubDomain?.subdomain ||
      user.brandSubDomain?.marketingSource ||
      "";

    // Get sanction date (approval date)
    const approvedHistory = latestLoan?.loanStatusHistory?.find(
      (h) =>
        h.status === loan_status_enum.APPROVED ||
        h.status === loan_status_enum.SANCTION_MANAGER_APPROVED,
    );
    const sanctionDate = approvedHistory?.createdAt || null;

    return {
      CustomerId: user.formattedUserId || user.id || "",
      userId: user.formattedUserId || user.id || "",
      PhoneNumber: this.formatedPhoneNo(user.phoneNumber, true) || "",
      LoanId: latestLoan?.formattedLoanId || "",
      LoanType: latestLoan?.loanType || "",
      FreshRepeat:
        latestLoan?.loanType === "LOAN-1"
          ? "FRESH"
          : latestLoan?.loanType
            ? "REPEAT"
            : "FRESH",
      Domain: user.brandSubDomain?.subdomain || "",
      LandingPageUrl: landingPageUrl,
      UTMCampaign: utmCampaign,
      UTMTerm: utmTerm,
      UTMContent: utmContent,
      UTMSource: utmSource,
      UTMMedium: utmMedium,
      UTMClickid: utmClickid,
      LeadStage: leadStage,
      RejectionRemarks: allRejectionRemarks,
      RejectionDate: rejectionDate,
      IsReloanCase: latestLoan?.is_repeat_loan ? "Yes" : "No",
      AppliedOn: formatDate(user.createdAt, "MM-DD-YYYY") || "",
      AmountDisbursed: disbursedAmount,
      DisburalDate:
        formatDate(latestLoan?.disbursementDate, "MM-DD-YYYY") || "",
      SanctionDate: formatDate(sanctionDate, "MM-DD-YYYY") || "",
      UTMSourceFirstClick: utmSource || "",
      UTMSourceFirstClickTimestamp: "",
      UTMSourceLastClick: utmSource || "",
      UTMSourceLastClickTimestamp: "",
      ClickID: utmClickid || "",
    };
  }
  private getFullName(
    user: User & {
      userDetails?: UserDetails;
    },
  ): string {
    if (!user?.userDetails) return "";
    const { firstName, middleName, lastName } = user.userDetails;
    return [firstName, middleName, lastName].filter(Boolean).join(" ");
  }
  private getStateCode(
    pinCode: string | number,
  ): { state: string; code: number } | null {
    const prefix = parseInt(String(pinCode).slice(0, 2), 10);

    const stateMappings = [
      { state: "Jammu & Kashmir", min: 18, max: 19, code: 1 },
      { state: "Himachal Pradesh", min: 17, max: 17, code: 2 },
      { state: "Punjab", min: 14, max: 16, code: 3 },
      { state: "Chandigarh", min: 16, max: 16, code: 4 },
      { state: "Uttaranchal", min: 24, max: 26, code: 5 },
      { state: "Haryana", min: 12, max: 13, code: 6 },
      { state: "Delhi", min: 11, max: 11, code: 7 },
      { state: "Rajasthan", min: 30, max: 34, code: 8 },
      { state: "Uttar Pradesh", min: 20, max: 28, code: 9 },
      { state: "Bihar", min: 80, max: 85, code: 10 },
      { state: "Sikkim", min: 73, max: 73, code: 11 },
      { state: "Arunachal Pradesh", min: 78, max: 79, code: 12 },
      { state: "Nagaland", min: 79, max: 79, code: 13 },
      { state: "Manipur", min: 79, max: 79, code: 14 },
      { state: "Mizoram", min: 79, max: 79, code: 15 },
      { state: "Tripura", min: 72, max: 79, code: 16 },
      { state: "Meghalaya", min: 79, max: 79, code: 17 },
      { state: "Assam", min: 78, max: 79, code: 18 },
      { state: "West Bengal", min: 70, max: 74, code: 19 },
      { state: "Jharkhand", min: 81, max: 83, code: 20 },
      { state: "Orissa", min: 75, max: 77, code: 21 },
      { state: "Chhattisgarh", min: 46, max: 49, code: 22 },
      { state: "Madhya Pradesh", min: 45, max: 48, code: 23 },
      { state: "Gujarat", min: 36, max: 39, code: 24 },
      { state: "Daman & Diu", min: 36, max: 39, code: 25 },
      { state: "Dadra & Nagar Haveli", min: 39, max: 39, code: 26 },
      { state: "Maharashtra", min: 40, max: 44, code: 27 },
      { state: "Andhra Pradesh", min: 50, max: 56, code: 28 },
      { state: "Karnataka", min: 53, max: 59, code: 29 },
      { state: "Goa", min: 40, max: 40, code: 30 },
      { state: "Lakshadweep", min: 67, max: 68, code: 31 },
      { state: "Kerala", min: 67, max: 69, code: 32 },
      { state: "Tamil Nadu", min: 53, max: 66, code: 33 },
      { state: "Pondicherry", min: 53, max: 67, code: 34 },
      { state: "Andaman & Nicobar Islands", min: 74, max: 74, code: 35 },
      { state: "Telangana", min: 50, max: 56, code: 36 },
      { state: "APO Address", min: 90, max: 90, code: 99 },
    ];

    for (const state of stateMappings) {
      if (prefix >= state.min && prefix <= state.max) {
        return { state: state.state, code: state.code };
      }
    }

    return null; // If no matching state found
  }
  async sendReportEmail(
    brandId: string,
    partnerUserId: string,
    reportType: string,
    fromDate: string,
    toDate: string,
    filePath: string,
  ) {
    // ✅ For Prisma queries (all DateTime columns, regardless of @db.Date)
    const fromDateIST = _dayjs
      .tz(fromDate, "Asia/Kolkata")
      .startOf("day")
      .toDate();
    const toDateIST = _dayjs.tz(toDate, "Asia/Kolkata").endOf("day").toDate();

    // ✅ For raw SQL queries with @db.Date columns: use "YYYY-MM-DD" format
    const fromDateIST_DateOnly = _dayjs
      .tz(fromDate, "Asia/Kolkata")
      .format("YYYY-MM-DD");
    const toDateIST_DateOnly = _dayjs
      .tz(toDate, "Asia/Kolkata")
      .format("YYYY-MM-DD");

    if (!brandId || !partnerUserId) {
      throw new BadRequestException(
        "Both brandId and partnerUserId are required.",
      );
    }

    // Fetch brand config with nested config
    const brandConfig = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        id: true,
        name: true,
        brandConfig: {
          select: { ccReminderEmail: true },
        },
        domain: true,
      },
    });

    if (!brandConfig) {
      throw new NotFoundException(`Brand not found for ID: ${brandId}`);
    }

    // Fetch partner user
    const partnerUser = await this.prisma.partnerUser.findUnique({
      where: { id: partnerUserId },
      select: {
        id: true,
        email: true,
        name: true,
        globalRoles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
        brandRoles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!partnerUser) {
      throw new NotFoundException(
        `Partner user not found for ID: ${partnerUserId}`,
      );
    }

    const ccEmails =
      brandConfig.brandConfig?.ccReminderEmail
        .split(",")
        .map((email) => email.trim()) || [];
    if (ccEmails.length === 0) {
      console.warn(`No CC reminder emails found for brand ID: ${brandId}`);
      return;
    }

    // Template setup
    const templateName = "report-downloaded-email";
    const basePath = path.join(
      process.cwd(),
      "src",
      "templates",
      "partner",
      "ejs",
    );
    const templatePath = path.join(basePath, `${templateName}.ejs`);

    // Format dates for display
    const now = new Date();
    const downloadDate = formatDate(now, "DD MMMM YYYY");
    const downloadTime = formatDate(now, "HH:mm:ss");

    // Report type mapping
    const reportTitles = {
      "master-report": "Master Report",
      "disbursed-loan-report": "Disbursed Loan Report",
      "non-disbursed-loan-report": "Non-Disbursed Loan Report",
      "master-collection-report": "Master Collection Report",
      "collection-loan-report": "Collection Loan Report",
      "cic-report": "CIC Report",
      "marketing-report": "Marketing Report",
      "completed-loan-with-no-repet-report":
        "Completed with no Repayment Report",
      "active-loans-by-due-date-report": "Active Loans by Due Date Report",
    };

    const reportTitle = reportTitles[reportType] || reportType;
    const fileName = filePath ? path.basename(filePath) : "";

    // Get user roles
    const userRoles = [
      ...(partnerUser.globalRoles?.map((gr) => gr.role.name) || []),
      ...(partnerUser.brandRoles?.map((br) => br.role.name) || []),
    ];
    const userRoleDisplay = userRoles.length > 0 ? userRoles.join(", ") : "N/A";

    // Read CSV file and prepare attachment
    const fileContent = fs.readFileSync(filePath);
    const base64Content = fileContent.toString("base64");
    const attachments = [
      {
        filename: fileName,
        content: base64Content,
        contentType: "text/csv",
        mime_type: "text/csv",
      },
    ];

    // Prepare template data
    const data = {
      brandName: brandConfig.name ?? "",
      brandDomain: brandConfig.domain || "",
      securityEmail: "sameer@8byte.ai",
      downloaderName: partnerUser.name || "",
      downloaderEmail: partnerUser.email,
      downloaderRole: userRoleDisplay,
      reportType: reportTitle,
      reportUrl: filePath || "#",
      downloadDate,
      downloadTime,
      fromDate: formatDate(fromDateIST, "DD MMM YYYY"),
      toDate: formatDate(toDateIST, "DD MMM YYYY"),
      fileName,
    };

    // Render HTML content
    const htmlContent = await ejs.renderFile(templatePath, data);

    try {
      // Send emails to all CC recipients
      await Promise.all(
        ccEmails.map((recipientEmail) =>
          this.emailService.sendEmail({
            to: recipientEmail,
            name: "Admin",
            subject: `Report Downloaded: ${reportTitle} - ${brandConfig.name}`,
            html: htmlContent,
            attachments: attachments,
          }),
        ),
      );
    } catch (error) {
      console.error(
        "❌ Error sending report download notification emails:",
        error,
      );
      // Don't throw error - just log it so report download isn't blocked
      console.error("Report download will continue despite email failure");
    }
  }

  private async exportRejectReportCSV(
    data: LoanWithRelations[],
    brandId: string,
  ): Promise<string> {
    const fileName = `reject-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    // Ensure reports directory exists
    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    // Generate analytics data
    const analyticsData = this.generateRejectAnalyticsData(data);

    const csvContent = this.generateRejectAnalyticsCSV(analyticsData);
    // Write CSV content to file
    fs.writeFileSync(filePath, csvContent);
    return filePath;
  }

  private generateRejectAnalyticsData(data: LoanWithRelations[]) {
    const currentMonth = formatDate(new Date(), "MM/YY");

    // Group data by domain (subdomain)
    const domainGroups = data.reduce(
      (acc, loan) => {
        const domain = loan.user?.brandSubDomain?.subdomain || "Default";
        if (!acc[domain]) acc[domain] = [];
        acc[domain].push(loan);
        return acc;
      },
      {} as Record<string, LoanWithRelations[]>,
    );
    // Domain-wise analysis
    const domainWiseData = Object.entries(domainGroups).map(
      ([domain, loans]) => {
        const totalLoans = loans.length;
        const rejectedLoans = loans.filter(
          (l) => l.status === loan_status_enum.REJECTED,
        ).length;
        const sanctionedLoans = loans.filter(
          (l) =>
            l.status === loan_status_enum.APPROVED ||
            l.status === loan_status_enum.SANCTION_MANAGER_APPROVED ||
            l.status === loan_status_enum.DISBURSED ||
            l.status === loan_status_enum.COMPLETED,
        ).length;

        const wipLoans = loans.filter(
          (l) =>
            l.status === loan_status_enum.PENDING ||
            l.status === loan_status_enum.CREDIT_EXECUTIVE_APPROVED ||
            l.status === loan_status_enum.SANCTION_MANAGER_APPROVED,
        ).length;
        // Get previous month's pending applications as opening stock
        const previousMonthEnd = new Date();
        previousMonthEnd.setMonth(previousMonthEnd.getMonth() - 1);
        previousMonthEnd.setDate(0);

        const openingStock = loans.filter((l) => {
          const createdDate = new Date(l.createdAt);
          return (
            createdDate <= previousMonthEnd &&
            (l.status === loan_status_enum.PENDING ||
              l.status === loan_status_enum.CREDIT_EXECUTIVE_APPROVED ||
              l.status === loan_status_enum.SANCTION_MANAGER_APPROVED)
          );
        }).length;
        const freshApplications = loans.filter((l) => {
          const createdDate = new Date(l.createdAt);
          return createdDate > previousMonthEnd;
        }).length;
        const rejectPercent =
          totalLoans > 0
            ? ((rejectedLoans / totalLoans) * 100).toFixed(2)
            : "0.00";

        return {
          domain,
          month: currentMonth,
          openingStock,
          freshApplications,
          totalToProcess: totalLoans,
          appDecisioned: rejectedLoans + sanctionedLoans,
          rejected: rejectedLoans,
          sanctioned: sanctionedLoans,
          rejectPercent,
          wip: wipLoans,
        };
      },
    );

    // Reject reason-wise analysis (NO CHANGES)
    const rejectionReasons = data
      .filter((loan) => loan.status === loan_status_enum.REJECTED)
      .map((loan) => {
        const rejectionHistory = loan.loanStatusHistory.find(
          (status) => status.status === loan_status_enum.REJECTED,
        );
        // Get brand-specific rejection reasons
        const brandReasons =
          rejectionHistory?.loan_status_brand_reasons
            ?.map((reason) => reason.brandStatusReason.reason)
            .join(", ") || "";
        // Combine brand reasons and message, prioritizing brand reasons
        let combinedReason = "";
        if (brandReasons) {
          combinedReason = brandReasons;
        } else {
          combinedReason = "Unknown Reason";
        }

        return {
          reason: combinedReason,
          amount: loan.amount || 0,
        };
      });

    const reasonGroups = rejectionReasons.reduce(
      (acc, item) => {
        if (!acc[item.reason]) {
          acc[item.reason] = { count: 0, totalAmount: 0 };
        }
        acc[item.reason].count += 1;
        acc[item.reason].totalAmount += item.amount;
        return acc;
      },
      {} as Record<string, { count: number; totalAmount: number }>,
    );

    const totalRejections = rejectionReasons.length;
    const totalRejectedAmount = rejectionReasons.reduce(
      (sum, item) => sum + item.amount,
      0,
    );

    const rejectReasonData = Object.entries(reasonGroups).map(
      ([reason, data], index) => {
        const percentage =
          totalRejections > 0
            ? ((data.count / totalRejections) * 100).toFixed(2)
            : "0.00";
        const valueInLakhs = (data.totalAmount / 100000).toFixed(2);
        const valuePercentage =
          totalRejectedAmount > 0
            ? ((data.totalAmount / totalRejectedAmount) * 100).toFixed(2)
            : "0.00";

        return {
          sNo: index + 1,
          domain: "All Domains",
          month: currentMonth,
          rejectReason: reason,
          cases: data.count,
          percentage,
          valueInLakhs,
          valuePercentage,
        };
      },
    );

    // Credit Manager-wise analysis
    const creditManagerGroups = data.reduce(
      (acc, loan) => {
        const creditManagerHistory = loan.loanStatusHistory.find(
          (history) =>
            history.status === loan_status_enum.CREDIT_EXECUTIVE_APPROVED ||
            history.status === loan_status_enum.REJECTED,
        );
        const manager =
          creditManagerHistory?.partnerUser?.name ||
          creditManagerHistory?.partnerUser?.email ||
          "Unknown Manager";

        if (!acc[manager]) acc[manager] = [];
        acc[manager].push(loan);
        return acc;
      },
      {} as Record<string, LoanWithRelations[]>,
    );

    const creditManagerData = Object.entries(creditManagerGroups).map(
      ([manager, loans]) => {
        const casesApproved = loans.filter(
          (l) =>
            l.status === loan_status_enum.APPROVED ||
            l.status === loan_status_enum.SANCTION_MANAGER_APPROVED,
        ).length;

        const casesRejected = loans.filter(
          (l) => l.status === loan_status_enum.REJECTED,
        ).length;
        const totalDecisioned = casesApproved + casesRejected;

        const approvedAmount = loans
          .filter(
            (l) =>
              l.status === loan_status_enum.APPROVED ||
              l.status === loan_status_enum.SANCTION_MANAGER_APPROVED,
          )
          .reduce((sum, loan) => sum + (loan.amount || 0), 0);

        const rejectedAmount = loans
          .filter((l) => l.status === loan_status_enum.REJECTED)
          .reduce((sum, loan) => sum + (loan.amount || 0), 0);

        const totalAmount = approvedAmount + rejectedAmount;

        const rejectPercent =
          totalDecisioned > 0
            ? ((casesRejected / totalDecisioned) * 100).toFixed(2)
            : "0.00";
        const approvePercent =
          totalDecisioned > 0
            ? ((casesApproved / totalDecisioned) * 100).toFixed(2)
            : "0.00";
        const rejectValuePercent =
          totalAmount > 0
            ? ((rejectedAmount / totalAmount) * 100).toFixed(2)
            : "0.00";
        const approveValuePercent =
          totalAmount > 0
            ? ((approvedAmount / totalAmount) * 100).toFixed(2)
            : "0.00";

        return {
          domain: "All Domains",
          month: currentMonth,
          creditManager: manager,
          casesApproved,
          casesRejected,
          totalDecisioned,
          rejectPercent,
          approvePercent,
          rejectValuePercent,
          approveValuePercent,
        };
      },
    );

    return {
      domainWiseData,
      rejectReasonData,
      creditManagerData,
    };
  }

  private generateRejectAnalyticsCSV(analyticsData: {
    domainWiseData: Array<{
      domain: string;
      month: string;
      openingStock: number;
      freshApplications: number;
      totalToProcess: number;
      appDecisioned: number;
      rejected: number;
      sanctioned: number;
      rejectPercent: string;
      wip: number;
    }>;
    rejectReasonData: Array<{
      sNo: number;
      domain: string;
      month: string;
      rejectReason: string;
      cases: number;
      percentage: string;
      valueInLakhs: string;
      valuePercentage: string;
    }>;
    creditManagerData: Array<{
      domain: string;
      month: string;
      creditManager: string;
      casesApproved: number;
      casesRejected: number;
      totalDecisioned: number;
      rejectPercent: string;
      approvePercent: string;
      rejectValuePercent: string;
      approveValuePercent: string;
    }>;
  }): string {
    const lines: string[] = [
      "Reject Analysis Dashboard - Monthly Snapshot",
      "",
      "1. Domain-Wise Reject Analysis",
      "",
      "Domain,Month,Opening Stock,Fresh Applications,Total to Process,Applications Decisioned,Rejected,Sanctioned,Reject %,WIP",
    ];

    for (const row of analyticsData.domainWiseData) {
      lines.push(
        `${row.domain},${row.month},${row.openingStock},${row.freshApplications},${row.totalToProcess},${row.appDecisioned},${row.rejected},${row.sanctioned},${row.rejectPercent},${row.wip}`,
      );
    }

    lines.push(
      "",
      "",
      "2. Reject Reason-Wise Analysis",
      "",
      "S. No,Domain,Month,Reject Reason,Cases (#),% of Total,Value (₹ Lakhs),Value %",
    );

    for (const row of analyticsData.rejectReasonData) {
      lines.push(
        `${row.sNo},${row.domain},${row.month},"${row.rejectReason}",${row.cases},${row.percentage},${row.valueInLakhs},${row.valuePercentage}`,
      );
    }

    lines.push(
      "",
      "",
      "3. Credit Manager-Wise Reject Analysis",
      "",
      "Domain,Month,Credit Manager,Cases Approved,Cases Rejected,Total Decisioned,Reject %,Approve %,Reject Value %,Approve Value %",
    );

    for (const row of analyticsData.creditManagerData) {
      lines.push(
        `${row.domain},${row.month},"${row.creditManager}",${row.casesApproved},${row.casesRejected},${row.totalDecisioned},${row.rejectPercent},${row.approvePercent},${row.rejectValuePercent},${row.approveValuePercent}`,
      );
    }

    return lines.join("\n");
  }

  private async exportCompletedLoanWithNoRepetReportCSV(
    data: any[],
    brandId: string,
    partnerUserId: string,
  ): Promise<string> {
    const fileName = `completed-loan-with-no-repet-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    // Ensure reports directory exists
    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Updated CSV headers
    const headers = [
      { id: "CustomerId", title: "Customer ID" },
      { id: "customerName", title: "Customer Name" },
      ...this.conditionalFields(partnerUserId, [
        { id: "mobileNumber", title: "Mobile Number" },
      ]),
      { id: "email", title: "Email" },
      { id: "loanAmount", title: "Loan Amount" },
      { id: "disbursementDate_IST", title: "Disb Date" },
      { id: "dueDate_ist", title: "Repayment Date" },
      { id: "closureDate_IST", title: "Closure Date" },
      { id: "dueDateClosureDateDiff", title: "Due Date - Closure Date (Days)" },
      { id: "status", title: "STATUS" },
      { id: "loanId", title: "LOAN Number" },
      { id: "formattedUserId", title: "User ID" },
      { id: "createdAt_ist", title: "Created At (IST)" },
    ];

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers,
    });
    console.log(
      "🚀 Exporting Completed Loan with No Repayment Report CSV with data:",
      data,
    );
    //  formattedUserId: 'MCS4S0008202',
    //   mobileNumber: '+918758428897',
    //   email: 'harshbhut4@gmail.com',
    //   customerName: 'Harsh Jagdishbhai Bhut',
    //   loanId: 'L26020100460',
    //   loanAmount: 22000,
    //   status: 'COMPLETED',
    //   applicationDate: 2026-02-07T10:01:22.162Z,
    //   approvalDate: 2026-02-07T00:00:00.000Z,
    //   disbursementDate: 2026-02-07T00:00:00.000Z,
    //   dueDate: 2026-03-07T00:00:00.000Z,
    //   closureDate: 2026-02-23T00:00:00.000Z,
    //   dueDateClosureDateDiff: -12
    // Format the data for CSV output
    const formattedData = data.map((row: any) => ({
      CustomerId: row.formattedUserId || "",
      customerName: row.customerName || "",
      mobileNumber: row.mobileNumber || "",
      email: row.email || "",
      loanAmount: row.loanAmount || "",
      disbursementDate_IST: row.disbursementDate
        ? _dayjs(row.disbursementDate).format("DD MMM YYYY")
        : "",
      dueDate_ist: row.dueDate ? _dayjs(row.dueDate).format("DD MMM YYYY") : "",
      closureDate_IST: row.closureDate
        ? _dayjs(row.closureDate).format("DD MMM YYYY")
        : "",
      dueDateClosureDateDiff: row.dueDateClosureDateDiff ?? "",
      status: row.status || "",
      loanId: row.loanId || "",
      formattedUserId: row.formattedUserId || "",
      createdAt_ist: row.createdAt_ist
        ? _dayjs(row.createdAt_ist).format("DD MMM YYYY HH:mm:ss")
        : "",
    }));
    // Write data to CSV
    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportActiveLoansByDueDateReportCSV(
    data: any[],
    brandId: string,
    partnerUserId: string,
  ): Promise<string> {
    const fileName = `active-loans-by-due-date-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Updated CSV headers with new fields
    const headers = [
      { id: "CustomerId", title: "Customer ID" },
      { id: "customerName", title: "Customer Name" },
      ...this.conditionalFields(partnerUserId, [
        { id: "mobileNumber", title: "Mobile Number" },
      ]),
      { id: "disbursementDate_IST", title: "Disb Date" },
      { id: "dueDate", title: "Repayment Date" },
      { id: "status", title: "STATUS" },
      { id: "formattedLoanId", title: "LOAN Number" },
      { id: "loan_amount", title: "Loan Amount" },
      { id: "repayment_amount", title: "Repayment Amount" },
      { id: "formattedUserId", title: "User ID" },
    ];
    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: headers,
    });

    // Format the data for CSV output
    const formattedData = data.map((row: any) => ({
      CustomerId: row.formattedUserId || "",
      customerName: row.customerName || "",
      mobileNumber: row.mobileNumber || "",
      disbursementDate_IST: row.disbursementDate_IST
        ? _dayjs(row.disbursementDate_IST).format("DD MMM YYYY")
        : "",
      dueDate: row.dueDate ? _dayjs(row.dueDate).format("DD MMM YYYY") : "",
      status: row.status || "",
      formattedLoanId: row.formattedLoanId || "",
      loan_amount: row.loan_amount || 0,
      repayment_amount: row.repayment_amount || 0,
      formattedUserId: row.formattedUserId || "",
    }));
    // Write data to CSV
    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportCollectionAllocationExecutiveReportCSV(
    data: LoanWithRelations[],
    brandId: string,
  ): Promise<string> {
    const fileName = `collection-allocation-executive-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "CustomerId", title: "Customer ID" },
        { id: "LoanNumber", title: "Loan Number" },
        { id: "UserId", title: "User ID" },
        { id: "CollectionExecutiveName", title: "Collection Executive Name" },
        { id: "CollectionExecutiveEmail", title: "Collection Executive Email" },
        { id: "CollectionManagerName", title: "Collection Manager Name" },
        { id: "CollectionManagerEmail", title: "Collection Manager Email" },
        { id: "CustomerName", title: "Customer Name" },
        { id: "DisbursedDate", title: "Disbursed Date" },
        { id: "DueDate", title: "Due Date" },
        { id: "DPDDays", title: "DPD Days" },
        { id: "PrincipalAmount", title: "Principal Amount" },
        { id: "InterestAmount", title: "Interest Amount" },
        { id: "OutstandingAmount", title: "Outstanding Amount" },
      ],
    });

    const formattedData = data.map((loan) => {
      // Get all active collection allocated partners
      const allCollectionPartners =
        loan.loan_collection_allocated_partner?.filter(
          (cp) => cp.isActive && !cp.isDeallocated,
        ) || [];

      // Separate executives and managers by role
      const collectionExecutives = allCollectionPartners
        .filter((partner) => {
          const role = partner.partnerUser?.brandRoles?.[0]?.role?.name;
          return role === "COLLECTION_EXECUTIVE";
        })
        .map((partner) => ({
          name: partner.partnerUser?.name || "N/A",
          email: partner.partnerUser?.email || "N/A",
        }));

      const collectionManagers = allCollectionPartners
        .filter((partner) => {
          const role = partner.partnerUser?.brandRoles?.[0]?.role?.name;
          return role === "COLLECTION_MANAGER" || role === "COLLECTION_HEAD";
        })
        .map((partner) => ({
          name: partner.partnerUser?.name || "N/A",
          email: partner.partnerUser?.email || "N/A",
        }));

      // Combine executive names and emails with commas
      const executiveNames =
        collectionExecutives.length > 0
          ? collectionExecutives.map((e) => e.name).join(", ")
          : "Not Allocated";

      const executiveEmails =
        collectionExecutives.length > 0
          ? collectionExecutives.map((e) => e.email).join(", ")
          : "N/A";

      // Remove duplicate managers by email
      const uniqueManagers = collectionManagers.reduce(
        (acc, manager) => {
          if (!acc.find((m) => m.email === manager.email)) {
            acc.push(manager);
          }
          return acc;
        },
        [] as { name: string; email: string }[],
      );

      // Combine manager names and emails with commas
      const managerNames =
        uniqueManagers.length > 0
          ? uniqueManagers.map((m) => m.name).join(", ")
          : "N/A";

      const managerEmails =
        uniqueManagers.length > 0
          ? uniqueManagers.map((m) => m.email).join(", ")
          : "N/A";

      // Calculate DPD
      const dueDate = loan.loanDetails?.dueDate
        ? new Date(loan.loanDetails.dueDate)
        : null;
      const disbursementDate = loan.disbursementDate
        ? new Date(loan.disbursementDate)
        : null;

      function getLoanDPDDays(
        dueDateStr: Date | null,
        disbursementDateStr: Date | null,
      ) {
        if (loan_status_enum.COMPLETED === loan.status) {
          return 0;
        }
        if (!dueDateStr || !disbursementDateStr) return 0;

        const IST_OFFSET = 5.5 * 60 * 60 * 1000;
        const toISTDate = (date: Date) => {
          const d = new Date(date.getTime() + IST_OFFSET);
          return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        };

        const due = toISTDate(dueDateStr);
        const today = toISTDate(new Date());

        const diffTime = today.getTime() - due.getTime();
        const dpd = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

        return dpd;
      }

      const dpdDays = getLoanDPDDays(dueDate, disbursementDate);

      // Get successful collection transactions
      const successfulCollections = loan.paymentRequests
        .filter((pr) => pr.type === TransactionTypeEnum.COLLECTION)
        .flatMap((pr) => pr.collectionTransactions)
        .filter(
          (tx) =>
            tx.status === TransactionStatusEnum.SUCCESS &&
            tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
        );

      const successfulPartialCollections = loan.paymentRequests
        .filter((pr) => pr.type === TransactionTypeEnum.PARTIAL_COLLECTION)
        .flatMap((pr) => pr.partialCollectionTransactions)
        .filter(
          (tx) =>
            tx.status === TransactionStatusEnum.SUCCESS &&
            tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
        );

      // Calculate paid amounts (Principal, Interest)
      const paidPrincipal =
        successfulCollections.reduce(
          (sum, tx) => sum + (tx.principalAmount || 0),
          0,
        ) +
        successfulPartialCollections.reduce(
          (sum, tx) => sum + (tx.principalAmount || 0),
          0,
        );

      const paidInterest =
        successfulCollections.reduce(
          (sum, tx) => sum + (tx.totalFees || 0),
          0,
        ) +
        successfulPartialCollections.reduce(
          (sum, tx) => sum + (tx.totalFees || 0),
          0,
        );

      // Calculate total paid amount
      const totalPaid =
        successfulCollections.reduce(
          (sum, tx) => sum + (tx.amount?.toNumber?.() || 0),
          0,
        ) +
        successfulPartialCollections.reduce(
          (sum, tx) => sum + (tx.amount?.toNumber?.() || 0),
          0,
        );

      // Get original loan amounts from repayment
      const totalPrincipal = loan.amount || 0;
      const totalInterest = loan.repayment?.totalFees || 0;
      const totalObligation = loan.repayment?.totalObligation || 0;

      // Calculate outstanding amounts
      const outstandingPrincipal = Math.max(totalPrincipal - paidPrincipal, 0);
      const outstandingInterest = Math.max(totalInterest - paidInterest, 0);
      const outstandingAmount = Math.max(totalObligation - totalPaid, 0);

      return {
        CustomerId: loan.user?.formattedUserId || loan.user?.id || "",
        LoanNumber: loan.formattedLoanId || "",
        UserId: loan.user?.formattedUserId || loan.user?.id || "",
        CollectionExecutiveName: executiveNames,
        CollectionExecutiveEmail: executiveEmails,
        CollectionManagerName: managerNames,
        CollectionManagerEmail: managerEmails,
        CustomerName: this.getFullName(loan.user),
        DisbursedDate: formatDate(loan.disbursementDate, "DD MMM YYYY"),
        DueDate: formatDate(loan.loanDetails?.dueDate, "DD MMM YYYY"),
        DPDDays: dpdDays,
        PrincipalAmount: outstandingPrincipal.toFixed(2),
        InterestAmount: outstandingInterest.toFixed(2),
        OutstandingAmount: outstandingAmount.toFixed(2),
      };
    });
    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportDisburseNonDisburseReportCSV(
    data: LoanWithRelations[],
    brandId: string,
    partnerUserId: string,
  ): Promise<string> {
    const fileName = `disburse-non-disburse-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "CustomerId", title: "Customer Id" },
        { id: "LoanNumber", title: "Loan Number" },
        { id: "CustomerName", title: "Customer Name" },
        { id: "PanNumber", title: "Pan Number" },
        { id: "Status", title: "Status" },
        { id: "SanctionApproveDate", title: "Sanction Approve Date" },
        { id: "DisburseDate", title: "Disburse Date" },
        { id: "RepayDate", title: "Repay Date" },
        { id: "LoanAmount", title: "Loan Amount" },
        { id: "PFPercentage", title: "PF %" },
        { id: "ROIPercentage", title: "ROI %" },
        { id: "Tenure", title: "Tenure" },
        { id: "ProcessingFee", title: "Processing Fee" },
        { id: "NetDisburseAmount", title: "Net Disburse Amount" },
        { id: "Interest", title: "Interest" },
        { id: "RepaymentAmount", title: "Repayment Amt" },
        { id: "BeneficiaryName", title: "Beneficiary Name" },
        { id: "BankName", title: "Bank Name" },
        { id: "AccountNo", title: "Account No" },
        { id: "IFSCCode", title: "IFSC Code" },
        { id: "ReferenceAddress", title: "Reference Address" },
        { id: "City", title: "CITY" },
        { id: "State", title: "STATE" },
        { id: "RepeatFresh", title: "Repeat / Fresh" },
        { id: "SanctionBy", title: "Sanction By" },
      ],
    });

    const formattedData = data.map((loan) => {
      // Extract PF percentage
      const pf =
        loan.disbursement?.deductions?.filter(
          (deduction) => deduction.chargeMode === ChargeMode.INCLUSIVE,
        ) || [];
      const formattedPf = pf
        .map((deduction) => {
          return `${deduction.chargeValue}${deduction.calculationValueType === "percentage" ? "%" : ""}`;
        })
        .join(", ");

      // Extract ROI percentage
      const roi =
        loan.repayment?.feeBreakdowns?.filter(
          (fee) => fee.chargeMode === ChargeMode.EXCLUSIVE,
        ) || [];
      const formattedRoi = roi
        .map((fee) => {
          return `${fee.chargeValue}${fee.calculationValueType === "percentage" ? "%" : ""}`;
        })
        .join(", ");

      // Get Credit Executive (Screener)
      const creditExecutive = loan.loanStatusHistory?.find(
        (history) =>
          history.status === loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
      );

      const executiveName = creditExecutive?.partnerUser
        ? `${creditExecutive.partnerUser.name || creditExecutive.partnerUser.email}`
        : "N/A";
      const repeatFresh = loan.is_repeat_loan ? "REPEAT" : "FRESH";

      // Determine Status: Disbursed or Non-Disbursed
      const hasSuccessfulDisbursement =
        loan.paymentRequests?.some((pr) =>
          pr.disbursalTransactions?.some(
            (tx) => tx.status === TransactionStatusEnum.SUCCESS,
          ),
        ) ?? false;

      const status = hasSuccessfulDisbursement ? "Disbursed" : "Non-Disbursed";

      return {
        CustomerId: loan.user?.formattedUserId || loan.user?.id || "",
        LoanNumber: loan.formattedLoanId || "",
        CustomerName: this.getFullName(loan.user),
        PanNumber: loan.user?.documents?.[0]?.documentNumber || "",
        Status: status,
        SanctionApproveDate: formatDate(loan.approvalDate, "DD MMM YYYY") || "",
        DisburseDate:
          formatDate(loan.disbursementDate, "DD MMM YYYY") || "Not Disbursed",
        RepayDate: formatDate(loan.loanDetails?.dueDate, "DD MMM YYYY") || "",
        LoanAmount: loan.amount || 0,
        PFPercentage: formattedPf || "",
        ROIPercentage: formattedRoi || "",
        Tenure: loan.loanDetails?.durationDays || 0,
        ProcessingFee: loan.disbursement?.totalDeductions || 0,
        NetDisburseAmount: loan.disbursement?.netAmount || 0,
        Interest: loan.repayment?.totalFees || 0,
        RepaymentAmount: loan.repayment?.totalObligation || 0,
        BeneficiaryName:
          loan.user?.user_bank_account?.[0]?.accountHolderName || "",
        BankName: loan.user?.user_bank_account?.[0]?.bankName || "",
        AccountNo: `="${loan.user?.user_bank_account?.[0]?.accountNumber || ""}"`,
        IFSCCode: loan.user?.user_bank_account?.[0]?.ifscCode || "",
        ReferenceAddress: loan.user?.userDetails?.address || "",
        City: loan.user?.userDetails?.city || "",
        State: loan.user?.userDetails?.state || "",
        RepeatFresh: repeatFresh,
        SanctionBy: executiveName,
      };
    });
    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportEquifaxCreditReportCSV(
    data: LoanWithRelations[],
    brandId: string,
    partnerUserId: string,
  ): Promise<string> {
    const fileName = `equifax-credit-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const memberConfig = this.getMemberConfig(brandId);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "ConsumerName", title: "Consumer Name" },
        { id: "DateOfBirth", title: "Date of Birth" },
        { id: "Gender", title: "Gender" },
        { id: "IncomeTaxIDNumber", title: "Income Tax ID Number" },
        { id: "PassportNumber", title: "Passport Number" },
        { id: "PassportIssueDate", title: "Passport Issue Date" },
        { id: "PassportExpiryDate", title: "Passport Expiry Date" },
        { id: "VoterIDNumber", title: "Voter ID Number" },
        { id: "DrivingLicenseNumber", title: "Driving License Number" },
        { id: "DrivingLicenseIssueDate", title: "Driving License Issue Date" },
        {
          id: "DrivingLicenseExpiryDate",
          title: "Driving License Expiry Date",
        },
        { id: "RationCardNumber", title: "Ration Card Number" },
        { id: "UniversalIDNumber", title: "Universal ID Number" },
        { id: "AdditionalID1", title: "Additional ID #1" },
        { id: "AdditionalID2", title: "Additional ID #2" },
        ...this.conditionalFields(partnerUserId, [
          { id: "TelephoneNoMobile", title: "Telephone No.Mobile" },
          { id: "TelephoneNoResidence", title: "Telephone No.Residence" },
          { id: "TelephoneNoOffice", title: "Telephone No.Office" },
          { id: "ExtensionOffice", title: "Extension Office" },
          { id: "TelephoneNoOther", title: "Telephone No.Other" },
          { id: "ExtensionOther", title: "Extension Other" },
          { id: "EmailID1", title: "Email ID 1" },
          { id: "EmailID2", title: "Email ID 2" },
        ]),
        { id: "Address1", title: "Address 1" },
        { id: "StateCode1", title: "State Code 1" },
        { id: "PINCode1", title: "PIN Code 1" },
        { id: "AddressCategory1", title: "Address Category 1" },
        { id: "ResidenceCode1", title: "Residence Code 1" },
        { id: "Address2", title: "Address 2" },
        { id: "StateCode2", title: "State Code 2" },
        { id: "PINCode2", title: "PIN Code 2" },
        { id: "AddressCategory2", title: "Address Category 2" },
        { id: "ResidenceCode2", title: "Residence Code 2" },
        { id: "CurrentNewMemberCode", title: "Current/New Member Code" },
        {
          id: "CurrentNewMemberShortName",
          title: "Current/New Member Short Name",
        },
        { id: "CurrNewAccountNo", title: "Curr/New Account No" },
        { id: "AccountType", title: "Account Type" },
        { id: "OwnershipIndicator", title: "Ownership Indicator" },
        { id: "DateOpenedDisbursed", title: "Date Opened/Disbursed" },
        { id: "DateOfLastPayment", title: "Date of Last Payment" },
        { id: "DateClosed", title: "Date Closed" },
        { id: "DateReported", title: "Date Reported" },
        { id: "HighCreditSanctionedAmt", title: "High Credit/Sanctioned Amt" },
        { id: "CurrentBalance", title: "Current Balance" },
        { id: "AmtOverdue", title: "Amt Overdue" },
        { id: "NoOfDaysPastDue", title: "No of Days Past Due" },
        { id: "OldMbrCode", title: "Old Mbr Code" },
        { id: "OldMbrShortName", title: "Old Mbr Short Name" },
        { id: "OldAccNo", title: "Old Acc No" },
        { id: "OldAccType", title: "Old Acc Type" },
        { id: "OldOwnershipIndicator", title: "Old Ownership Indicator" },
        { id: "SuitFiledWilfulDefault", title: "Suit Filed / Wilful Default" },
        {
          id: "WrittenOffSettledStatus",
          title: "Written-off and Settled Status",
        },
        { id: "AssetClassification", title: "Asset Classification" },
        { id: "ValueOfCollateral", title: "Value of Collateral" },
        { id: "TypeOfCollateral", title: "Type of Collateral" },
        { id: "CreditLimit", title: "Credit Limit" },
        { id: "CashLimit", title: "Cash Limit" },
        { id: "RateOfInterest", title: "Rate of Interest" },
        { id: "RepaymentTenure", title: "RepaymentTenure" },
        { id: "EMIAmount", title: "EMI Amount" },
        { id: "WrittenOffAmountTotal", title: "Written-off Amount (Total)" },
        {
          id: "WrittenOffPrincipalAmount",
          title: "Written-off Principal Amount",
        },
        { id: "SettlementAmt", title: "Settlement Amt" },
        { id: "PaymentFrequency", title: "Payment Frequency" },
        { id: "ActualPaymentAmt", title: "Actual Payment Amt" },
        { id: "OccupationCode", title: "Occupation Code" },
        { id: "Income", title: "Income" },
        { id: "NetGrossIncomeIndicator", title: "Net/Gross Income Indicator" },
        {
          id: "MonthlyAnnualIncomeIndicator",
          title: "Monthly/Annual Income Indicator",
        },
      ],
    });

    const formattedData = data.map((loan) => {
      // Helper to find document by type
      const getDocument = (type: string) =>
        loan.user?.documents?.find((d) => d.type === type);

      // Get documents
      const panDoc = getDocument("PAN");
      const aadhaarDoc = getDocument("AADHAAR");
      const passportDoc = getDocument("PASSPORT");
      const voterIdDoc = getDocument("VOTER_ID");
      const drivingLicenseDoc = getDocument("DRIVING_LICENSE");
      const rationCardDoc = getDocument("RATION_CARD");

      // Calculate DPD and overdue
      const dueDate = loan.loanDetails?.dueDate
        ? new Date(loan.loanDetails.dueDate)
        : null;
      const currentDate = new Date();
      const daysPastDue =
        dueDate && currentDate > dueDate
          ? Math.floor(
              (currentDate.getTime() - dueDate.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0;

      // Calculate current balance (outstanding) - EXCLUSIVE of interest for non-credit cards
      const successfulCollections =
        loan.paymentRequests
          ?.filter((pr) => pr?.type === TransactionTypeEnum.COLLECTION)
          ?.flatMap((pr) => pr?.collectionTransactions || [])
          ?.filter(
            (tx) =>
              tx?.status === TransactionStatusEnum.SUCCESS &&
              tx?.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
          ) || [];

      const successfulPartialCollections =
        loan.paymentRequests
          ?.filter((pr) => pr?.type === TransactionTypeEnum.PARTIAL_COLLECTION)
          ?.flatMap((pr) => pr?.partialCollectionTransactions || [])
          ?.filter(
            (tx) =>
              tx?.status === TransactionStatusEnum.SUCCESS &&
              tx?.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
          ) || [];

      // Total principal paid
      const totalPrincipalPaid =
        successfulCollections.reduce(
          (sum, tx) => sum + (tx?.principalAmount || 0),
          0,
        ) +
        successfulPartialCollections.reduce(
          (sum, tx) => sum + (tx?.principalAmount || 0),
          0,
        );

      // Current balance = Loan amount - Principal paid (exclusive of interest)
      const currentBalance = Math.max(
        (loan.amount || 0) - totalPrincipalPaid,
        0,
      );

      // Amount overdue = current balance only if past due date
      const overdueAmount = daysPastDue > 0 ? currentBalance : 0;

      // Get last payment date
      const allSuccessfulTransactions = [
        ...successfulCollections,
        ...successfulPartialCollections,
      ];
      const lastPaymentDate =
        allSuccessfulTransactions.length > 0
          ? allSuccessfulTransactions.sort(
              (a, b) =>
                new Date(b.completedAt).getTime() -
                new Date(a.completedAt).getTime(),
            )[0]?.completedAt
          : null;

      // Asset classification based on DPD - USE CODES
      let assetClassification = "01"; // Standard
      if (daysPastDue > 90 && daysPastDue <= 180) {
        assetClassification = "02"; // Sub-standard
      } else if (daysPastDue > 180 && daysPastDue <= 365) {
        assetClassification = "03"; // Doubtful
      } else if (daysPastDue > 365) {
        assetClassification = "04"; // Loss
      }

      // ROI
      const roi = loan.repayment?.feeBreakdowns?.[0];
      const rateOfInterest = roi
        ? `${roi.chargeValue}${roi.calculationValueType === "percentage" ? "%" : ""}`
        : "";

      // State code helper
      const getStateCode = (pincode: string | number | null) => {
        if (!pincode) return "";
        const code = this.getStateCode(pincode)?.code;
        return code ? String(code).padStart(2, "0") : "";
      };

      // Calculate EMI
      const calculatedEMI = loan.loanDetails?.durationDays
        ? Math.round(
            (loan.repayment?.totalObligation || 0) /
              (loan.loanDetails.durationDays / 30 || 1),
          )
        : 0;

      // Occupation code mapping (Field Tag 46)
      const getOccupationCode = () => {
        const employmentType = loan.user?.employment?.employmenttype;
        if (!employmentType) return "";

        const salariedTypes = [
          "FULL_TIME",
          "PART_TIME",
          "CONTRACT",
          "TEMPORARY",
          "INTERN",
          "CASUAL",
          "APPRENTICE",
        ];
        const selfEmployedProfessional = ["FREELANCE"];
        const selfEmployed = ["COMMISSION_BASED", "GIG"];

        if (salariedTypes.includes(employmentType)) return "1";
        if (selfEmployedProfessional.includes(employmentType)) return "2";
        if (selfEmployed.includes(employmentType)) return "3";
        return "4";
      };

      // Gender mapping: 1 = Female, 2 = Male, 3 = Transgender (USE CODES)
      const getGenderCode = () => {
        const gender = loan.user?.userDetails?.gender?.toUpperCase();
        if (gender === "FEMALE") return "1";
        if (gender === "MALE") return "2";
        if (gender === "TRANSGENDER") return "3";
        return "";
      };

      // Residence Code mapping: 01 = Owned, 02 = Rented (USE CODES)
      const getResidenceCode = () => {
        const residenceType =
          loan.user?.userDetails?.residenceType?.toUpperCase();
        if (residenceType === "OWNED") return "01";
        if (residenceType === "RENTED") return "02";
        return "";
      };

      return {
        ConsumerName: this.getFullName(loan.user) || "",
        DateOfBirth:
          formatDate(loan.user?.userDetails?.dateOfBirth, "DDMMYYYY") || "",
        Gender: getGenderCode(), // FIXED: Uses codes (1/2/3)
        IncomeTaxIDNumber: panDoc?.documentNumber || "",
        PassportNumber: passportDoc?.documentNumber || "",
        PassportIssueDate: "",
        PassportExpiryDate: "",
        VoterIDNumber: voterIdDoc?.documentNumber || "",
        DrivingLicenseNumber: drivingLicenseDoc?.documentNumber || "",
        DrivingLicenseIssueDate: "",
        DrivingLicenseExpiryDate: "",
        RationCardNumber: rationCardDoc?.documentNumber || "",
        UniversalIDNumber: (() => {
          const aadhaar = aadhaarDoc?.documentNumber || "";
          return aadhaar ? `="${aadhaar}"` : "";
        })(),
        AdditionalID1: "",
        AdditionalID2: "",
        TelephoneNoMobile: (() => {
          const phone = loan.user?.phoneNumber || "";
          return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
        })(),
        TelephoneNoResidence: (() => {
          const phone = loan.user?.alternatePhoneNumbers?.[0]?.phone || "";
          return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
        })(),
        TelephoneNoOffice: "",
        ExtensionOffice: "",
        TelephoneNoOther: (() => {
          const phone = loan.user?.alternatePhoneNumbers?.[1]?.phone || "";
          return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
        })(),
        ExtensionOther: "",
        EmailID1: loan.user?.email || "",
        EmailID2: loan.user?.employment?.officialEmail || "",
        AddressLine1: loan.user?.userDetails?.address || "",
        StateCode1: getStateCode(loan.user?.userDetails?.pincode),
        PINCode1: loan.user?.userDetails?.pincode || "",
        AddressCategory1: "01", // Permanent (2 digits required)
        ResidenceCode1: getResidenceCode(), // FIXED: Uses codes (01/02)
        AddressLine2: loan.user?.alternateAddresses?.[0]?.address || "",
        StateCode2: getStateCode(loan.user?.alternateAddresses?.[0]?.pincode),
        PINCode2: loan.user?.alternateAddresses?.[0]?.pincode || "",
        AddressCategory2: "02", // Additional (2 digits required)
        ResidenceCode2: (() => {
          const residenceType =
            loan.user?.alternateAddresses?.[0]?.residenceType?.toUpperCase();
          if (residenceType === "OWNED") return "01";
          if (residenceType === "RENTED") return "02";
          return "";
        })(),
        CurrentNewMemberCode: memberConfig.memberCode,
        CurrentNewMemberShortName: memberConfig.memberShortName,
        CurrNewAccountNo: loan.formattedLoanId || "",
        AccountType: "05", // Personal Loan per Appendix D
        OwnershipIndicator: "1", // Individual (numeric, not "I")
        DateOpenedDisbursed:
          formatDate(loan.disbursementDate, "DDMMYYYY") || "",
        DateOfLastPayment: formatDate(lastPaymentDate, "DDMMYYYY") || "",
        DateClosed:
          currentBalance === 0 ? formatDate(loan.closureDate, "DDMMYYYY") : "", // FIXED: Only when balance = 0
        DateReported: formatDate(new Date(), "DDMMYYYY"),
        HighCreditSanctionedAmt: loan.amount || 0,
        CurrentBalance: currentBalance, // FIXED: Exclusive of interest (principal only)
        AmtOverdue: Math.max(overdueAmount, 0),
        NoOfDaysPastDue: Math.max(daysPastDue, 0),
        OldMbrCode: "",
        OldMbrShortName: "",
        OldAccNo: "",
        OldAccType: "",
        OldOwnershipIndicator: "",
        SuitFiledWilfulDefault: "",
        CreditFacilityStatus: (() => {
          if (loan.closingType === closingTypeEnum.WRITE_OFF) return "02"; // Written-off
          if (loan.closingType === closingTypeEnum.SETTLEMENT) return "03"; // Settled
          return "";
        })(),
        AssetClassification: assetClassification, // FIXED: Uses codes (01/02/03/04) not text
        ValueOfCollateral: "",
        TypeOfCollateral: "",
        CreditLimit: loan.amount || 0,
        CashLimit: "",
        RateOfInterest: rateOfInterest,
        RepaymentTenure: loan.loanDetails?.durationDays || 0,
        EMIAmount: loan.repayment.totalObligation,
        WrittenOffAmountTotal:
          loan.closingType === closingTypeEnum.WRITE_OFF ? currentBalance : 0,
        WrittenOffPrincipalAmount:
          loan.closingType === closingTypeEnum.WRITE_OFF ? currentBalance : 0,
        SettlementAmt:
          loan.closingType === closingTypeEnum.SETTLEMENT
            ? totalPrincipalPaid
            : 0,
        PaymentFrequency: "05", // FIXED: Bullet payment (code 05) for payday loans
        ActualPaymentAmt: totalPrincipalPaid,
        OccupationCode: getOccupationCode(),
        Income: loan.user?.employment?.salary || 0,
        NetGrossIncomeIndicator: "N", // Net
        MonthlyAnnualIncomeIndicator: "M", // Monthly
      };
    });

    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportFieldVisitReportCSV(
    data: any[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `field-visit-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "NBFCName", title: "NBFC Name" },
        { id: "AllocationDate", title: "Allocation Date" },
        { id: "State", title: "State" },
        { id: "City", title: "City" },
        { id: "LoanNumber", title: "Loan Number" },
        { id: "CustomerFullName", title: "Customer Full Name" },
        ...this.conditionalFields(partnerUserId, [
          { id: "MobileNumber", title: "Mobile Number" },
          { id: "AltMobileNumber", title: "Alt Mobile Number" },
        ]),
        { id: "LoanAmount", title: "Loan Amount" },
        { id: "DisburseDate", title: "Disburse Date" },
        { id: "RepaymentAmount", title: "Repayment Amount" },
        { id: "RepaymentDate", title: "Repayment Date" },
        ...this.conditionalFields(partnerUserId, [
          { id: "PersonalMailId", title: "Personal Mail ID" },
          { id: "OfficeMailId", title: "Office Mail ID" },
        ]),
        { id: "ResidentialAddress", title: "Residential Address" },
        { id: "ResidentialPincode", title: "Residential PINCODE" },
        { id: "CompanyName", title: "Company Name" },
        { id: "CompanyAddress", title: "Company Address" },
        { id: "CompanyPincode", title: "COMPANY PINCODE" },
        { id: "CallingTeamRemarks", title: "Calling Team Remarks" },
        { id: "ReferenceName1", title: "Reference Name 1" },
        { id: "ReferenceNumber1", title: "Reference Number 1" },
        { id: "ReferenceName2", title: "Reference Name 2" },
        { id: "ReferenceNumber2", title: "Reference Number 2" },
        { id: "LoanStatus", title: "Loan Status" },
        { id: "PanCard", title: "Pan Card" },
      ],
    });

    const formattedData = data.map((row: any) => ({
      NBFCName: row.nbfcName || "",
      AllocationDate: row.allocationDate
        ? formatDate(row.allocationDate, "DD-MM-YYYY")
        : "",
      State: row.state || "",
      City: row.city || "",
      LoanNumber: row.loanNumber || "",
      CustomerFullName: row.customerFullName || "",
      MobileNumber: row.mobileNumber || "",
      AltMobileNumber: row.altMobileNumber || "",
      LoanAmount: row.loanAmount || 0,
      DisburseDate: row.disburseDate
        ? formatDate(row.disburseDate, "DD-MM-YYYY")
        : "",
      RepaymentAmount: row.repaymentAmount || 0,
      RepaymentDate: row.repaymentDate
        ? formatDate(row.repaymentDate, "DD-MM-YYYY")
        : "",
      PersonalMailId: row.personalMailId || "",
      OfficeMailId: row.officeMailId || "",
      ResidentialAddress: row.residentialAddress || "",
      ResidentialPincode: row.residentialPincode || "",
      CompanyName: row.companyName || "",
      CompanyAddress: row.companyAddress || "",
      CompanyPincode: row.companyPincode || "",
      CallingTeamRemarks: row.callingTeamRemarks || "",
      ReferenceName1: row.referenceName1 || "",
      ReferenceNumber1: row.referenceNumber1 || "",
      ReferenceName2: row.referenceName2 || "",
      ReferenceNumber2: row.referenceNumber2 || "",
      LoanStatus: row.loanStatus || "",
      PanCard: row.panNumber || "",
    }));

    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportDailyMarketingMISReportCSV(
    data: any[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `daily-marketing-mis-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "LeadID", title: "Lead ID" },
        { id: "LeadDate", title: "Lead Date" },
        { id: "Domain", title: "Domain" },
        { id: "ApplicationNumber", title: "Application Number" },
        { id: "CustomerName", title: "Customer Name" },
        ...this.conditionalFields(partnerUserId, [
          { id: "MobileNumber", title: "Mobile Number" },
        ]),
        { id: "Profession", title: "Profession" },
        { id: "LeadStatus", title: "Lead Status" },
        { id: "State", title: "State" },
        { id: "Pincode", title: "Pincode" },
        { id: "SanctionedAmount", title: "Sanctioned Amount" },
        { id: "DisbursedAmount", title: "Disbursed Amount" },
        { id: "DisbursedDate", title: "Disbursed Date" },
        { id: "RejectDate", title: "Reject Date" },
        { id: "RejectedRemarks", title: "Rejected Remarks" },
        { id: "FreshRepeat", title: "Fresh/Repeat" },
      ],
    });

    const formattedData = data.map((user: any) => {
      const latestLoan = user.loans?.[0];

      // Get user status (PENDING, HOLD, REJECTED, etc.)
      let leadStatus = "NEW";

      // First check if user has a status_id (indicating a status has been set)
      if (user.status_id !== null && user.status_id !== undefined) {
        leadStatus = "REJECTED";
      }
      // If user has a loan, override with loan-based status
      else if (latestLoan) {
        if (latestLoan.status === loan_status_enum.REJECTED) {
          leadStatus = "REJECTED";
        } else if (
          latestLoan.status === loan_status_enum.DISBURSED ||
          latestLoan.status === loan_status_enum.ACTIVE ||
          latestLoan.status === loan_status_enum.COMPLETED ||
          latestLoan.status === loan_status_enum.PAID
        ) {
          leadStatus = "DISBURSED";
        } else if (
          latestLoan.status === loan_status_enum.APPROVED ||
          latestLoan.status === loan_status_enum.SANCTION_MANAGER_APPROVED
        ) {
          leadStatus = "SANCTIONED";
        } else if (
          latestLoan.status === loan_status_enum.PENDING ||
          latestLoan.status === loan_status_enum.CREDIT_EXECUTIVE_APPROVED
        ) {
          leadStatus = "IN PROCESS";
        }
      }

      // Get rejection details
      const rejectionHistory = latestLoan?.loanStatusHistory?.[0];
      const rejectionDate = rejectionHistory?.createdAt || null;
      const rejectionRemarks =
        rejectionHistory?.loan_status_brand_reasons
          ?.map((reason) => reason.brandStatusReason.reason)
          .join(", ") ||
        rejectionHistory?.message ||
        "";

      // Get customer name
      const customerName =
        `${user.userDetails?.firstName || ""} ${user.userDetails?.middleName || ""} ${user.userDetails?.lastName || ""}`.trim();

      // Show profession as-is from enum
      const profession = user.employment?.employmenttype || "";

      return {
        LeadID: user.formattedUserId || user.id || "",
        LeadDate: formatDate(user.createdAt, "DD-MM-YYYY") || "",
        Domain: user.brandSubDomain?.subdomain || "",
        ApplicationNumber: latestLoan?.formattedLoanId || "",
        CustomerName: customerName,
        MobileNumber: (() => {
          const phone = user.phoneNumber || "";
          return phone ? `="${phone}"` : "";
        })(),
        Profession: profession,
        LeadStatus: leadStatus,
        State: user.userDetails?.state || "",
        Pincode: user.userDetails?.pincode || "",
        SanctionedAmount: latestLoan?.amount || 0,
        DisbursedAmount: latestLoan?.disbursement?.netAmount || 0,
        DisbursedDate: latestLoan?.disbursementDate
          ? formatDate(latestLoan.disbursementDate, "DD-MM-YYYY")
          : "",
        RejectDate: rejectionDate
          ? formatDate(rejectionDate, "DD-MM-YYYY")
          : "",
        RejectedRemarks: rejectionRemarks,
        FreshRepeat: latestLoan?.is_repeat_loan ? "Repeat" : "Fresh",
      };
    });

    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportTransUnionReportCSV(
    data: LoanWithRelations[],
    brandId: string,
    partnerUserId: string,
  ): Promise<string> {
    const fileName = `transunion-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    const memberConfig = this.getMemberConfig(brandId);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "ConsumerName", title: "Consumer Name" },
        { id: "DateOfBirth", title: "Date of Birth" },
        { id: "Gender", title: "Gender" },
        { id: "IncomeTaxIDNumber", title: "Income Tax ID Number" },
        { id: "PassportNumber", title: "Passport Number" },
        { id: "PassportIssueDate", title: "Passport Issue Date" },
        { id: "PassportExpiryDate", title: "Passport Expiry Date" },
        { id: "VoterIDNumber", title: "Voter ID Number" },
        { id: "DrivingLicenseNumber", title: "Driving License Number" },
        { id: "DrivingLicenseIssueDate", title: "Driving License Issue Date" },
        {
          id: "DrivingLicenseExpiryDate",
          title: "Driving License Expiry Date",
        },
        { id: "RationCardNumber", title: "Ration Card Number" },
        { id: "UniversalIDNumber", title: "Universal ID Number" },
        { id: "AdditionalID1", title: "Additional ID #1" },
        { id: "AdditionalID2", title: "Additional ID #2" },
        ...this.conditionalFields(partnerUserId, [
          { id: "TelephoneNoMobile", title: "Telephone No.Mobile" },
          { id: "TelephoneNoResidence", title: "Telephone No.Residence" },
          { id: "TelephoneNoOffice", title: "Telephone No.Office" },
          { id: "ExtensionOffice", title: "Extension Office" },
          { id: "TelephoneNoOther", title: "Telephone No.Other" },
        ]),
        { id: "ExtensionOther", title: "Extension Other" },
        { id: "EmailID1", title: "Email ID 1" },
        { id: "EmailID2", title: "Email ID 2" },
        { id: "AddressLine1", title: "Address Line 1" },
        { id: "StateCode1", title: "State Code 1" },
        { id: "PINCode1", title: "PIN Code 1" },
        { id: "AddressCategory1", title: "Address Category 1" },
        { id: "ResidenceCode1", title: "Residence Code 1" },
        { id: "AddressLine2", title: "Address Line 2" },
        { id: "StateCode2", title: "State Code 2" },
        { id: "PINCode2", title: "PIN Code 2" },
        { id: "AddressCategory2", title: "Address Category 2" },
        { id: "ResidenceCode2", title: "Residence Code 2" },
        { id: "CurrentNewMemberCode", title: "Current/New Member Code" },
        {
          id: "CurrentNewMemberShortName",
          title: "Current/New Member Short Name",
        },
        { id: "CurrNewAccountNo", title: "Curr/New Account No" },
        { id: "AccountType", title: "Account Type" },
        { id: "OwnershipIndicator", title: "Ownership Indicator" },
        { id: "DateOpenedDisbursed", title: "Date Opened/Disbursed" },
        { id: "DateOfLastPayment", title: "Date of Last Payment" },
        { id: "DateClosed", title: "Date Closed" },
        { id: "DateReported", title: "Date Reported" },
        { id: "HighCreditSanctionedAmt", title: "High Credit/Sanctioned Amt" },
        { id: "CurrentBalance", title: "Current Balance" },
        { id: "AmtOverdue", title: "Amt Overdue" },
        { id: "NoOfDaysPastDue", title: "No of Days Past Due" },
        { id: "OldMbrCode", title: "Old Mbr Code" },
        { id: "OldMbrShortName", title: "Old Mbr Short Name" },
        { id: "OldAccNo", title: "Old Acc No" },
        { id: "OldAccType", title: "Old Acc Type" },
        { id: "OldOwnershipIndicator", title: "Old Ownership Indicator" },
        { id: "SuitFiledWilfulDefault", title: "Suit Filed / Wilful Default" },
        { id: "CreditFacilityStatus", title: "Credit Facility Status" },
        { id: "AssetClassification", title: "Asset Classification" },
        { id: "ValueOfCollateral", title: "Value of Collateral" },
        { id: "TypeOfCollateral", title: "Type of Collateral" },
        { id: "CreditLimit", title: "Credit Limit" },
        { id: "CashLimit", title: "Cash Limit" },
        { id: "RateOfInterest", title: "Rate of Interest" },
        { id: "RepaymentTenure", title: "RepaymentTenure" },
        { id: "EMIAmount", title: "EMI Amount" },
        { id: "WrittenOffAmountTotal", title: "Written-off Amount (Total)" },
        {
          id: "WrittenOffPrincipalAmount",
          title: "Written-off Principal Amount",
        },
        { id: "SettlementAmt", title: "Settlement Amt" },
        { id: "PaymentFrequency", title: "Payment Frequency" },
        { id: "ActualPaymentAmt", title: "Actual Payment Amt" },
        { id: "OccupationCode", title: "Occupation Code" },
        { id: "Income", title: "Income" },
        { id: "NetGrossIncomeIndicator", title: "Net/Gross Income Indicator" },
        {
          id: "MonthlyAnnualIncomeIndicator",
          title: "Monthly/Annual Income Indicator",
        },
        { id: "CKYC", title: "CKYC" },
        { id: "NREGACardNumber", title: "NREGA Card Number" },
      ],
    });

    const formattedData = data.map((loan) => {
      // Helper to find document by type
      const getDocument = (type: string) =>
        loan.user?.documents?.find((d) => d.type === type);

      // Get documents
      const panDoc = getDocument("PAN");
      const aadhaarDoc = getDocument("AADHAAR");
      const passportDoc = getDocument("PASSPORT");
      const voterIdDoc = getDocument("VOTER_ID");
      const drivingLicenseDoc = getDocument("DRIVING_LICENSE");
      const rationCardDoc = getDocument("RATION_CARD");
      const nregaDoc = getDocument("NREGA_CARD");
      const ckycDoc = getDocument("CKYC");

      // Calculate DPD and overdue
      const dueDate = loan.loanDetails?.dueDate
        ? new Date(loan.loanDetails.dueDate)
        : null;
      const currentDate = new Date();
      const daysPastDue =
        dueDate && currentDate > dueDate
          ? Math.floor(
              (currentDate.getTime() - dueDate.getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0;

      // Calculate current balance
      const successfulCollections =
        loan.paymentRequests
          ?.flatMap((pr) => pr.collectionTransactions)
          ?.filter((tx) => tx.amount) || [];

      const totalPaid = successfulCollections.reduce(
        (sum, tx) => sum + (Number(tx.amount) || 0),
        0,
      );
      const currentBalance = (loan.repayment?.totalObligation || 0) - totalPaid;
      const overdueAmount = daysPastDue > 0 ? currentBalance : 0;

      // Get last payment date
      const lastPaymentDate =
        successfulCollections.length > 0
          ? successfulCollections[0]?.completedAt
          : null;

      // Asset classification based on DPD
      let assetClassification = "01"; // Standard
      if (daysPastDue > 90 && daysPastDue <= 180) {
        assetClassification = "02"; // Sub-standard
      } else if (daysPastDue > 180 && daysPastDue <= 365) {
        assetClassification = "03"; // Doubtful
      } else if (daysPastDue > 365) {
        assetClassification = "04"; // Loss
      }

      // Credit Facility Status (Field Tag 22)
      let creditFacilityStatus = "";
      if (loan.closingType === closingTypeEnum.WRITE_OFF) {
        creditFacilityStatus = "02"; // Written-off
      } else if (loan.closingType === closingTypeEnum.SETTLEMENT) {
        creditFacilityStatus = "03"; // Settled
      }

      // ROI
      const roi = loan.repayment?.feeBreakdowns?.[0];
      const rateOfInterest = roi
        ? `${roi.chargeValue}${roi.calculationValueType === "percentage" ? "%" : ""}`
        : "";

      // State code helper
      const getStateCode = (pincode: string | number | null) => {
        if (!pincode) return "";
        const code = this.getStateCode(pincode)?.code;
        return code ? String(code).padStart(2, "0") : ""; // Ensure 2 digits
      };
      // Gender mapping: 1 = Female, 2 = Male, 3 = Transgender
      const genderMap: Record<string, string> = {
        FEMALE: "1",
        MALE: "2",
        TRANSGENDER: "3",
      };
      const gender =
        genderMap[loan.user?.userDetails?.gender?.toUpperCase() || ""] || "";

      return {
        ConsumerName: this.getFullName(loan.user) || "",
        DateOfBirth:
          formatDate(loan.user?.userDetails?.dateOfBirth, "DD-MM-YYYY") || "",
        Gender: gender,
        IncomeTaxIDNumber: panDoc?.documentNumber || "",
        PassportNumber: passportDoc?.documentNumber || "",
        PassportIssueDate: "",
        PassportExpiryDate: "",
        VoterIDNumber: voterIdDoc?.documentNumber || "",
        DrivingLicenseNumber: drivingLicenseDoc?.documentNumber || "",
        DrivingLicenseIssueDate: "",
        DrivingLicenseExpiryDate: "",
        RationCardNumber: rationCardDoc?.documentNumber || "",
        UniversalIDNumber: (() => {
          const aadhaar = aadhaarDoc?.documentNumber || "";
          return aadhaar ? `="${aadhaar}"` : "";
        })(),
        AdditionalID1: "",
        AdditionalID2: "",
        TelephoneNoMobile: (() => {
          const phone = loan.user?.phoneNumber || "";
          return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
        })(),

        TelephoneNoResidence: (() => {
          const phone = loan.user?.alternatePhoneNumbers?.[0]?.phone || "";
          return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
        })(),

        TelephoneNoOffice: "",
        ExtensionOffice: "",

        TelephoneNoOther: (() => {
          const phone = loan.user?.alternatePhoneNumbers?.[1]?.phone || "";
          return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
        })(),

        ExtensionOther: "",
        EmailID1: loan.user?.email || "",
        EmailID2: loan.user?.employment?.officialEmail || "",
        AddressLine1: loan.user?.userDetails?.address || "",
        StateCode1: getStateCode(loan.user?.userDetails?.pincode),
        PINCode1: loan.user?.userDetails?.pincode || "",
        AddressCategory1: "01", // Permanent (2 digits required)
        ResidenceCode1: "",
        AddressLine2: loan.user?.alternateAddresses?.[0]?.address || "",
        StateCode2: getStateCode(loan.user?.alternateAddresses?.[0]?.pincode),
        PINCode2: loan.user?.alternateAddresses?.[0]?.pincode || "",
        AddressCategory2: "02", // Additional (2 digits required)
        ResidenceCode2: loan.user?.alternateAddresses?.[0]?.residenceType || "",
        CurrentNewMemberCode: memberConfig.memberCode,
        CurrentNewMemberShortName: memberConfig.memberShortName,
        CurrNewAccountNo: loan.formattedLoanId || "",
        AccountType: "05", // Personal Loan per Appendix D
        OwnershipIndicator: "1", // Individual (numeric, not "I")
        DateOpenedDisbursed:
          formatDate(loan.disbursementDate, "DD-MM-YYYY") || "",
        DateOfLastPayment: formatDate(lastPaymentDate, "DD-MM-YYYY") || "",
        DateClosed: formatDate(loan.closureDate, "DD-MM-YYYY") || "",
        DateReported: formatDate(new Date(), "DD-MM-YYYY"),
        HighCreditSanctionedAmt: loan.amount || 0,
        CurrentBalance: Math.max(currentBalance, 0),
        AmtOverdue: Math.max(overdueAmount, 0),
        NoOfDaysPastDue: Math.max(daysPastDue, 0),
        OldMbrCode: "",
        OldMbrShortName: "",
        OldAccNo: "",
        OldAccType: "",
        OldOwnershipIndicator: "",
        SuitFiledWilfulDefault: "",
        CreditFacilityStatus: creditFacilityStatus,
        AssetClassification: assetClassification,
        ValueOfCollateral: "",
        TypeOfCollateral: "",
        CreditLimit: loan.amount || 0,
        CashLimit: "",
        RateOfInterest: rateOfInterest,
        RepaymentTenure: loan.loanDetails?.durationDays || 0,
        EMIAmount: loan.repayment.totalObligation,
        WrittenOffAmountTotal:
          loan.closingType === closingTypeEnum.WRITE_OFF ? currentBalance : 0,
        WrittenOffPrincipalAmount:
          loan.closingType === closingTypeEnum.WRITE_OFF ? loan.amount : 0,
        SettlementAmt:
          loan.closingType === closingTypeEnum.SETTLEMENT ? totalPaid : 0,
        PaymentFrequency: "03", // Monthly
        ActualPaymentAmt: totalPaid,
        OccupationCode: (() => {
          const employmentType = loan.user?.employment?.employmenttype;
          if (!employmentType) return "";

          // Salaried - Regular employees with employment contracts
          const salariedTypes = [
            "FULL_TIME",
            "PART_TIME",
            "CONTRACT",
            "TEMPORARY",
            "INTERN",
            "CASUAL",
            "APPRENTICE",
          ];

          // Self-Employed Professional - Independent professionals
          const selfEmployedProfessional = ["FREELANCE"];

          // Self-Employed - Business/commission-based work
          const selfEmployed = ["COMMISSION_BASED", "GIG"];

          if (salariedTypes.includes(employmentType)) return "1";
          if (selfEmployedProfessional.includes(employmentType)) return "2";
          if (selfEmployed.includes(employmentType)) return "3";
          return "4";
        })(),
        Income: loan.user?.employment?.salary || 0,
        NetGrossIncomeIndicator: "N", // Net
        MonthlyAnnualIncomeIndicator: "M", // Monthly
        CKYC: ckycDoc?.documentNumber || "",
        NREGACardNumber: nregaDoc?.documentNumber || "",
      };
    });
    await csvWriter.writeRecords(formattedData);
    return filePath;
  }

  private async exportInternalMarketingReportCSV(
    data: any[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `internal-marketing-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "CustomerId", title: "Customer ID" },
        { id: "Name", title: "Name" },
        ...this.conditionalFields(partnerUserId, [
          { id: "Phone", title: "Phone" },
          { id: "Email", title: "Email" },
        ]),
        { id: "Salary", title: "Salary" },
        { id: "LoanType", title: "Loan Type" },
        { id: "FreshRepeat", title: "Fresh/Repeat" },
        { id: "Domain", title: "Domain" },
        { id: "OnboardingStep", title: "Onboarding Step" },
        { id: "CampaignName", title: "Campaign Name" },
        { id: "CampaignTerm", title: "Campaign Term" },
        { id: "CampaignContent", title: "Campaign Content" },
        { id: "CampaignSource", title: "Campaign Source" },
        { id: "CampaignMedium", title: "Campaign Medium" },
        { id: "UTMClickID", title: "UTM Click ID" },
        { id: "LeadStage", title: "Lead Stage" },
        { id: "RejectionRemarks", title: "Rejection Remarks" },
        { id: "SanctionedAmount", title: "Sanctioned Amount" },
        { id: "DisbursedAmount", title: "Disbursed Amount" },
        { id: "DisbursedDate", title: "Disbursed Date" },
        { id: "CreatedDate", title: "Created Date" },
      ],
    });

    const formattedData = data.map((user: any) => {
      const latestLoan = user.loans?.[0];

      // Get customer name
      const customerName =
        [
          user.userDetails?.firstName,
          user.userDetails?.middleName,
          user.userDetails?.lastName,
        ]
          .filter(Boolean)
          .join(" ") || "";

      // Calculate salary
      const salary = user.employment?.salaryExceedsBase
        ? `${user.brand?.brandConfig?.salaryThresholdAmount || 0}+`
        : user.employment?.salary || 0;

      // Get UTM details
      const utmDetails = user.utmTracking?.[0] || {};

      // Determine lead stage
      let leadStage = "New";
      if (user.onboardingStep) {
        const step = parseInt(String(user.onboardingStep));
        if (step === 0) leadStage = "New";
        else if (step >= 1 && step <= 3) leadStage = "Personal Info";
        else if (step >= 4 && step <= 6) leadStage = "Employment Info";
        else if (step >= 7 && step <= 9) leadStage = "Bank Details";
        else if (step >= 10) leadStage = "Onboarding Completed";
      }

      // Override with loan status if exists
      if (latestLoan) {
        const status = latestLoan.status;
        switch (status) {
          case loan_status_enum.PENDING:
            leadStage = "Loan Application Pending";
            break;
          case loan_status_enum.CREDIT_EXECUTIVE_APPROVED:
            leadStage = "Credit Executive Approved";
            break;
          case loan_status_enum.SANCTION_MANAGER_APPROVED:
            leadStage = "Sanction Manager Approved";
            break;
          case loan_status_enum.APPROVED:
            leadStage = "Sanction Head Approved";
            break;
          case loan_status_enum.DISBURSED:
          case loan_status_enum.ACTIVE:
          case loan_status_enum.POST_ACTIVE:
          case loan_status_enum.PAID:
          case loan_status_enum.PARTIALLY_PAID:
          case loan_status_enum.COMPLETED:
          case loan_status_enum.DEFAULTED:
          case loan_status_enum.SETTLED:
          case loan_status_enum.OVERDUE:
          case loan_status_enum.POST_ACTIVE:
            leadStage = "Disbursed";
            break;
          case loan_status_enum.REJECTED:
            leadStage = "Rejected";
            break;
          default:
            leadStage = status;
        }
      }

      // Get rejection remarks
      const disbursedStatuses: loan_status_enum[] = [
        loan_status_enum.DISBURSED,
        loan_status_enum.ACTIVE,
        loan_status_enum.PARTIALLY_PAID,
        loan_status_enum.PAID,
        loan_status_enum.COMPLETED,
        loan_status_enum.POST_ACTIVE,
        loan_status_enum.WRITE_OFF,
        loan_status_enum.SETTLED,
        loan_status_enum.DEFAULTED,
        loan_status_enum.OVERDUE,
      ];

      const isDisbursed =
        latestLoan && disbursedStatuses.includes(latestLoan.status);

      // Format rejection remarks from both loan status history and user status
      // ✅ Only show rejection remarks if NOT disbursed
      let allRejectionRemarks = "";

      if (!isDisbursed) {
        const loanRejectionRemarks =
          latestLoan?.loanStatusHistory
            ?.map((history) => {
              const brandReasons = history.loan_status_brand_reasons
                .map((reason) => reason.brandStatusReason.reason)
                .join(", ");
              const message = history.message || "";
              const partnerInfo = history.partnerUser
                ? ` by ${history.partnerUser.name || history.partnerUser.email}`
                : "";

              if (brandReasons) {
                return `${brandReasons}${message ? ` - ${message}` : ""}${partnerInfo}`;
              } else if (message) {
                return `${message}${partnerInfo}`;
              }
              return "";
            })
            .filter(Boolean)
            .join(" | ") || "";

        // Format user status rejection remarks
        const userStatusRemarks =
          user.user_status_brand_reasons
            ?.map((reason) => reason.brand_status_reasons.reason)
            .join(", ") || "";

        // Combine both rejection remarks
        allRejectionRemarks = [loanRejectionRemarks, userStatusRemarks]
          .filter(Boolean)
          .join(" | ");
      }

      return {
        CustomerId: user.formattedUserId || user.id || "",
        Name: customerName,
        Phone: user.phoneNumber || "",
        Email: user.email || "",
        Salary: salary,
        LoanType: latestLoan?.loanType || "",
        FreshRepeat: latestLoan?.is_repeat_loan
          ? "REPEAT"
          : latestLoan?.loanType
            ? "FRESH"
            : "FRESH",
        Domain: user.brandSubDomain?.subdomain || "",
        OnboardingStep: user.onboardingStep || "0",
        CampaignName: utmDetails.utmCampaign || "",
        CampaignTerm: utmDetails.utmTerm || "",
        CampaignContent: utmDetails.utmContent || "",
        CampaignSource: utmDetails.utmSource || "",
        CampaignMedium: utmDetails.utmMedium || "",
        UTMClickID: utmDetails.clickid || "",
        LeadStage: leadStage,
        RejectionRemarks: allRejectionRemarks,
        SanctionedAmount: latestLoan?.amount || 0,
        DisbursedAmount: latestLoan?.disbursement?.netAmount || 0,
        DisbursedDate: latestLoan?.disbursementDate
          ? formatDate(latestLoan.disbursementDate, "DD-MM-YYYY")
          : "",
        CreatedDate: formatDate(user.createdAt, "DD-MM-YYYY HH:mm:ss") || "",
      };
    });

    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportCollectionRemarksReportCSV(
    data: any[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `collection-remarks-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "LoanNumber", title: "LOAN NUMBER" },
        { id: "CustomerName", title: "CUSTOMER NAME" },
        { id: "MobileNo", title: "MOBILE NO." },
        { id: "Remark", title: "REMARK" },
        { id: "Timing", title: "TIMING" },
        { id: "AddedBy", title: "ADDED BY" },
      ],
    });

    // Create one row per remark
    const formattedData: any[] = [];

    data.forEach((loan: any) => {
      const customerName =
        [
          loan.user?.userDetails?.firstName,
          loan.user?.userDetails?.middleName,
          loan.user?.userDetails?.lastName,
        ]
          .filter(Boolean)
          .join(" ") || "";

      const mobileNo = loan.user?.phoneNumber || "";

      // Create a separate row for each remark
      loan.loanStatusHistory.forEach((history: any) => {
        formattedData.push({
          LoanNumber: loan.formattedLoanId || "",
          CustomerName: customerName,
          MobileNo: mobileNo,
          Remark: history.message?.replace("COMMENT: ", "") || "",
          AddedBy:
            history.partnerUser?.name || history.partnerUser?.email || "N/A",
          Timing: formatDate(history.createdAt, "DD-MM-YYYY HH:mm:ss") || "",
        });
      });
    });

    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportOutstandingDataReportCSV(
    data: LoanWithRelations[],
    brandId: string,
    partnerUserId: string,
  ): Promise<string> {
    const fileName = `outstanding-data-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "LeadID", title: "Lead ID" },
        { id: "LoanNo", title: "Loan No" },
        { id: "Branch", title: "Branch" },
        { id: "CustomerName", title: "Customer Name" },
        { id: "PAN", title: "PAN" },
        { id: "Gender", title: "Gender" },
        { id: "LoanAmount", title: "Loan Amount" },
        { id: "ROI", title: "ROI" },
        { id: "Tenure", title: "Tenure" },
        { id: "LoanRepayAmount", title: "Loan Repay Amount" },
        { id: "NetDisbursalAmount", title: "Net Disbursal Amount" },
        { id: "LoanDisburseDate", title: "Loan Disburse Date" },
        { id: "LoanRepayDate", title: "Loan Repay Date" },
        { id: "ProcessingFeeWithGST", title: "Processing Fee With GST" },
        { id: "ProcessingFeeWithoutGST", title: "Processing Fee Without GST" },
        { id: "GST", title: "GST" },
        { id: "PFPercentage", title: "PF Percentage" },
        { id: "CurrentAddress", title: "Current Address" },
        { id: "CurrentCity", title: "Current City" },
        { id: "CurrentState", title: "Current State" },
        { id: "CurrentPincode", title: "Current Pincode" },
        { id: "OfficeName", title: "Office Name" },
        { id: "OfficeAddress", title: "Office Address" },
        { id: "OfficeCity", title: "Office City" },
        { id: "OfficeState", title: "Office State" },
        { id: "OfficePincode", title: "Office Pincode" },
        { id: "SanctionBy", title: "Sanction By" },
        { id: "TransferedFlag", title: "Transfered Flag" },
        { id: "Bucket", title: "Bucket" },
        { id: "DPD", title: "DPD" },
        { id: "TotalCollection", title: "Total Collection" },
        { id: "ActivePOS", title: "Active POS" },
        { id: "OutstandingAmount", title: "Outstanding Amount" },
        { id: "Source", title: "Source" },
        { id: "UserType", title: "User Type" },
        { id: "MonthlyIncome", title: "Monthly Income" },
        { id: "Status", title: "Status" },
        { id: "ReferenceName", title: "Reference Name" },
        { id: "ReferenceMobile", title: "Reference Mobile" },
        { id: "ReferenceRelation", title: "Reference Relation" },
        ...this.conditionalFields(partnerUserId, [
          { id: "Mobile", title: "Mobile" },
          { id: "AlternateMobile", title: "Alternate Mobile" },
          { id: "Email", title: "Email" },
          { id: "AlternateEmail", title: "Alternate Email" },
        ]),
      ],
    });

    const formattedData = data.map((loan) =>
      this.formatOutstandingDataReportData(loan),
    );
    await csvWriter.writeRecords(formattedData);
    return filePath;
  }

  private formatOutstandingDataReportData(loan: LoanWithRelations) {
    // Calculate DPD
    const dueDate = loan.loanDetails?.dueDate
      ? new Date(loan.loanDetails.dueDate)
      : null;
    function calculateDPD(dueDate: Date | null): number {
      if (!dueDate) return 0;
      if (loan.status === loan_status_enum.COMPLETED) return 0;

      const IST_OFFSET = 5.5 * 60 * 60 * 1000;
      const toISTDate = (date: Date) => {
        const d = new Date(date.getTime() + IST_OFFSET);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      };

      const due = toISTDate(dueDate);
      const today = toISTDate(new Date());

      const diffTime = today.getTime() - due.getTime();
      const dpd = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      return dpd;
    }

    const dpdDays = calculateDPD(dueDate);

    // Calculate Bucket based on DPD
    function getBucket(dpd: number): string {
      if (dpd === 0) return "Current";
      if (dpd >= 1 && dpd <= 30) return "Bucket 1 (1-30)";
      if (dpd >= 31 && dpd <= 60) return "Bucket 2 (31-60)";
      if (dpd >= 61 && dpd <= 90) return "Bucket 3 (61-90)";
      if (dpd >= 91 && dpd <= 180) return "Bucket 4 (91-180)";
      if (dpd > 180) return "Bucket 5 (180+)";
      return "Current";
    }

    // Calculate collections
    const successfulCollections = loan.paymentRequests
      .filter((pr) => pr.type === TransactionTypeEnum.COLLECTION)
      .flatMap((pr) => pr.collectionTransactions)
      .filter(
        (tx) =>
          tx.status === TransactionStatusEnum.SUCCESS &&
          tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
      );

    const successfulPartialCollections = loan.paymentRequests
      .filter((pr) => pr.type === TransactionTypeEnum.PARTIAL_COLLECTION)
      .flatMap((pr) => pr.partialCollectionTransactions)
      .filter(
        (tx) =>
          tx.status === TransactionStatusEnum.SUCCESS &&
          tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
      );

    const totalCollected =
      successfulCollections.reduce(
        (sum, tx) => sum + (tx.amount?.toNumber?.() || 0),
        0,
      ) +
      successfulPartialCollections.reduce(
        (sum, tx) => sum + (tx.amount?.toNumber?.() || 0),
        0,
      );

    const totalObligation = loan.repayment?.totalObligation || 0;
    const outstandingAmount = Math.max(totalObligation - totalCollected, 0);
    const activePOS = outstandingAmount; // Active Principal Outstanding

    // Get PF details
    const pf =
      loan.disbursement?.deductions?.filter(
        (deduction) => deduction.chargeMode === ChargeMode.INCLUSIVE,
      ) || [];

    const pfPercentage = pf
      .map((deduction) => {
        return `${deduction.chargeValue}${deduction.calculationValueType === "percentage" ? "%" : ""}`;
      })
      .join(", ");

    const processingFeeWithoutGST = loan.disbursement?.totalDeductions || 0;

    // Calculate GST
    const gstAmount =
      loan.disbursement?.deductions
        ?.flatMap((d) => d.taxes || [])
        .reduce((sum, tax) => sum + tax.amount, 0) || 0;

    const processingFeeWithGST = processingFeeWithoutGST;

    // Get ROI
    const roi =
      loan.repayment?.feeBreakdowns?.filter(
        (fee) => fee.chargeMode === ChargeMode.EXCLUSIVE,
      ) || [];

    const formattedRoi = roi
      .map((fee) => {
        return `${fee.chargeValue}${fee.calculationValueType === "percentage" ? "%" : ""}`;
      })
      .join(", ");

    // Get sanctioned by
    const sanctionedByHistory = loan.loanStatusHistory?.[0];
    const sanctionedBy = sanctionedByHistory?.partnerUser
      ? `${sanctionedByHistory.partnerUser.name || sanctionedByHistory.partnerUser.email}`
      : "System";

    // Get source
    const utmString =
      loan.user.utmTracking && loan.user.utmTracking.length > 0
        ? loan.user.utmTracking
            .map((utm) =>
              `${utm.utmSource || ""} ${utm.utmMedium || ""} ${utm.utmCampaign || ""}`.trim(),
            )
            .join(", ")
        : "";

    const leadMatchesCampaign =
      loan.user.leadMatches?.[0]?.leadForm?.campaign_name || "";
    const source =
      utmString ||
      leadMatchesCampaign ||
      loan.user.brandSubDomain?.marketingSource ||
      "Direct";

    // Get user type (Fresh/Repeat)
    const userType = loan.is_repeat_loan ? "REPEAT" : "FRESH";

    // Get references
    const reference1 = loan.user.alternatePhoneNumbers?.[0];
    const reference2 = loan.user.alternatePhoneNumbers?.[1];

    // Get alternate address
    const alternateAddress = loan.user.alternateAddresses?.[0];

    return {
      LeadID: loan.user?.formattedUserId || "",
      LoanNo: loan.formattedLoanId || "",
      Branch: "",
      CustomerName: this.getFullName(loan.user),
      PAN:
        loan.user?.documents?.find((d) => d.type === DocumentTypeEnum.PAN)
          ?.documentNumber || "",
      Gender: loan.user?.userDetails?.gender || "",
      LoanAmount: loan.amount || 0,
      ROI: formattedRoi,
      Tenure: loan.loanDetails?.durationDays || 0,
      LoanRepayAmount: totalObligation,
      NetDisbursalAmount: loan.disbursement?.netAmount || 0,
      LoanDisburseDate: formatDate(loan.disbursementDate, "DD-MM-YYYY") || "",
      LoanRepayDate: formatDate(loan.loanDetails?.dueDate, "DD-MM-YYYY") || "",
      ProcessingFeeWithGST: processingFeeWithGST,
      ProcessingFeeWithoutGST: processingFeeWithoutGST - gstAmount,
      GST: gstAmount,
      PFPercentage: pfPercentage,
      CurrentAddress: loan.user?.userDetails?.address || "",
      CurrentCity: loan.user?.userDetails?.city || "",
      CurrentState: loan.user?.userDetails?.state || "",
      CurrentPincode: loan.user?.userDetails?.pincode || "",
      OfficeName: loan.user?.employment?.companyName || "",
      OfficeAddress: loan.user?.employment?.companyAddress || "",
      OfficeCity: loan.user?.employment?.companyAddress || "",
      OfficeState: loan.user?.employment?.companyAddress || "",
      OfficePincode: loan.user?.employment?.pinCode || "",
      SanctionBy: sanctionedBy,
      TransferedFlag: "No", // Default to No, update logic if needed
      Bucket: getBucket(dpdDays),
      DPD: dpdDays,
      TotalCollection: totalCollected,
      ActivePOS: activePOS,
      OutstandingAmount: outstandingAmount,
      Source: source,
      UserType: userType,
      MonthlyIncome: loan.user?.employment?.salaryExceedsBase
        ? `${loan.user.brand?.brandConfig?.salaryThresholdAmount || 0}+`
        : loan.user?.employment?.salary || 0,
      Status: loan.status,
      ReferenceName: reference1?.name || "",
      ReferenceMobile: (() => {
        const phone = reference1?.phone || "";
        return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
      })(),
      ReferenceRelation: reference1?.relationship || "",
      Mobile: (() => {
        const phone = loan.user?.phoneNumber || "";
        return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
      })(),
      AlternateMobile: (() => {
        const phone = reference2?.phone || "";
        return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
      })(),
      Email: loan.user?.email || "",
      AlternateEmail: loan.user?.employment?.officialEmail || "",
    };
  }

  private async exportLoanCloseReportCSV(
    data: LoanWithRelations[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `loan-close-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Fetch company bank account once for efficiency
    const companyBankAccount = await this.prisma.brandBankAccount.findFirst({
      where: {
        brandId: brandId,
        isPrimaryAccount: true,
      },
      select: {
        accountNumber: true,
        bankName: true,
      },
    });

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "LeadID", title: "lead ID" },
        { id: "StateName", title: "State Name" },
        { id: "CityName", title: "City Name" },
        { id: "LoanNo", title: "Loan No" },
        { id: "CustomerName", title: "Customer Name" },
        ...this.conditionalFields(partnerUserId, [
          { id: "MobileNumber", title: "Mobile Number" },
        ]),
        { id: "Pancard", title: "Pancard" },
        { id: "UserType", title: "User Type" },
        { id: "LoanAmount", title: "Loan Amount" },
        { id: "LoanRepayAmount", title: "Loan Repay Amount" },
        { id: "ROI", title: "ROI" },
        { id: "Tenure", title: "Tenure" },
        { id: "LoanDisburseDate", title: "Loan Disburse Date" },
        { id: "LoanRepayDate", title: "Loan Repay Date" },
        { id: "DateOfReceived", title: "Date Of Received" },
        { id: "LoanStatus", title: "Loan Status" },
        { id: "PaymentMode", title: "Payment Mode" },
        { id: "PrincipalReceived", title: "Principal Recieved" },
        { id: "InterestReceived", title: "Interest Received" },
        { id: "PenalReceived", title: "Penal Received" },
        { id: "TotalDiscount", title: "Total Discount" },
        { id: "TotalReceivedAmount", title: "Total Received Amount" },
        { id: "RecoveryBy", title: "Recovery By" },
        { id: "RecoveryDate", title: "Recovery Date" },
        { id: "VerifiedBy", title: "Verified By" },
        { id: "VerifiedDate", title: "Verified Date" },
        { id: "CompanyAccountNumber", title: "Company Account Number" },
        { id: "ReferenceNumber", title: "Refrence Number" },
        { id: "Remark", title: "Remark" },
        { id: "NOC", title: "NOC" },
        { id: "NOCSentBy", title: "NOC Sent By" },
        { id: "NOCSentDateTime", title: "NOC Sent DateTime" },
      ],
    });

    const formattedData = [];
    for (const loan of data) {
      // Get all successful collection transactions
      const successfulCollections = loan.paymentRequests
        .filter((pr) => pr.type === TransactionTypeEnum.COLLECTION)
        .flatMap((pr) => pr.collectionTransactions)
        .filter(
          (tx) =>
            tx.status === TransactionStatusEnum.SUCCESS &&
            tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
        );

      const successfulPartialCollections = loan.paymentRequests
        .filter((pr) => pr.type === TransactionTypeEnum.PARTIAL_COLLECTION)
        .flatMap((pr) => pr.partialCollectionTransactions)
        .filter(
          (tx) =>
            tx.status === TransactionStatusEnum.SUCCESS &&
            tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
        );

      // Combine all transactions and sort by completion date
      const allTransactions = [
        ...successfulCollections.map((tx) => ({
          ...tx,
          type: "FULL",
          completedAt: tx.completedAt,
        })),
        ...successfulPartialCollections.map((tx) => ({
          ...tx,
          type: "PARTIAL",
          completedAt: tx.completedAt,
        })),
      ].sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateA - dateB;
      });

      // Get ROI
      const roi =
        loan.repayment?.feeBreakdowns?.filter(
          (fee) => fee.chargeMode === ChargeMode.EXCLUSIVE,
        ) || [];

      const formattedRoi = roi
        .map((fee) => {
          return `${fee.chargeValue}${fee.calculationValueType === "percentage" ? "%" : ""}`;
        })
        .join(", ");

      // Get loan status display name
      let loanStatus = loan.status;
      if (loan.closingType === closingTypeEnum.SETTLEMENT) {
        loanStatus = "SETTLED" as any;
      } else if (loan.closingType === closingTypeEnum.WRITE_OFF) {
        loanStatus = "WRITE-OFF" as any;
      }

      // Get NOC/NoDueCertificate details
      const noDueCertificate = loan.noDueCertificate;

      // Base loan data (common for all rows)
      const baseLoanData = {
        LeadID: loan.user?.formattedUserId || "",
        StateName: loan.user?.userDetails?.state || "",
        CityName: loan.user?.userDetails?.city || "",
        LoanNo: loan.formattedLoanId || "",
        CustomerName: this.getFullName(loan.user),
        MobileNumber: (() => {
          const phone = loan.user?.phoneNumber || "";
          return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
        })(),
        Pancard:
          loan.user?.documents?.find((d) => d.type === DocumentTypeEnum.PAN)
            ?.documentNumber || "",
        UserType: loan.is_repeat_loan ? "REPEAT" : "FRESH",
        LoanAmount: loan.amount || 0,
        LoanRepayAmount: loan.repayment?.totalObligation || 0,
        ROI: formattedRoi,
        Tenure: loan.loanDetails?.durationDays || 0,
        LoanDisburseDate: formatDate(loan.disbursementDate, "DD-MM-YYYY") || "",
        LoanRepayDate:
          formatDate(loan.loanDetails?.dueDate, "DD-MM-YYYY") || "",
        LoanStatus: loanStatus,
        CompanyAccountNumber: companyBankAccount?.accountNumber
          ? `="${companyBankAccount.accountNumber}"`
          : "",
        // NOC fields from LoanNoDueCertificate
        NOC: noDueCertificate ? "Yes" : "No",
        NOCSentBy: noDueCertificate?.issuedBy || "",
        NOCSentDateTime: noDueCertificate?.sentAt
          ? formatDate(noDueCertificate.sentAt, "DD-MM-YYYY HH:mm:ss")
          : "",
      };

      // If no transactions, return single row with loan data
      if (allTransactions.length === 0) {
        formattedData.push({
          ...baseLoanData,
          DateOfReceived: "",
          PaymentMode: "",
          PrincipalReceived: 0,
          InterestReceived: 0,
          PenalReceived: 0,
          TotalDiscount: 0,
          TotalReceivedAmount: 0,
          RecoveryBy: "",
          RecoveryDate: "",
          VerifiedBy: "",
          VerifiedDate: "",
          ReferenceNumber: "",
          Remark: "",
        });
      } else {
        // Create a row for each transaction
        for (const tx of allTransactions) {
          // Calculate discount
          const penaltyDiscount = tx.penaltyDiscount || 0;
          const roundOffDiscount = tx.roundOffDiscount || 0;
          const totalDiscount = penaltyDiscount + roundOffDiscount;

          // Get recovery and verified by info
          const recoveryBy = tx.createdByPartner
            ? `${tx.createdByPartner.name || tx.createdByPartner.email}`
            : "Customer";

          const verifiedBy = tx.opsByPartner
            ? `${tx.opsByPartner.name || tx.opsByPartner.email}`
            : "";

          formattedData.push({
            ...baseLoanData,
            DateOfReceived: tx.completedAt
              ? formatDate(tx.completedAt, "DD-MM-YYYY")
              : "",
            PaymentMode: tx.method || "",
            PrincipalReceived: tx.principalAmount || 0,
            InterestReceived: tx.totalFees || 0,
            PenalReceived: tx.totalPenalties || 0,
            TotalDiscount: totalDiscount,
            TotalReceivedAmount: tx.amount?.toNumber?.() || 0,
            RecoveryBy: recoveryBy,
            RecoveryDate: tx.completedAt
              ? formatDate(tx.completedAt, "DD-MM-YYYY")
              : "",
            VerifiedBy: verifiedBy,
            VerifiedDate: tx.completedAt
              ? formatDate(tx.completedAt, "DD-MM-YYYY")
              : "",
            ReferenceNumber: tx.externalRef || "",
            Remark: tx.note || "",
          });
        }
      }
    }

    // Sort by closure date descending
    formattedData.sort((a, b) => {
      const dateA = new Date(a.DateOfReceived || a.RecoveryDate || 0);
      const dateB = new Date(b.DateOfReceived || b.RecoveryDate || 0);
      return dateB.getTime() - dateA.getTime();
    });

    await csvWriter.writeRecords(formattedData);
    return filePath;
  }

  private async exportTotalRecoveryReportCSV(
    data: LoanWithRelations[],
    brandId: string,
  ): Promise<string> {
    const fileName = `total-recovery-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Fetch company bank account once for efficiency
    const companyBankAccount = await this.prisma.brandBankAccount.findFirst({
      where: {
        brandId: brandId,
        isPrimaryAccount: true,
      },
      select: {
        accountNumber: true,
        bankName: true,
        branchName: true, // Company's branch name
      },
    });

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "LeadID", title: "lead ID" },
        { id: "Branch", title: "Branch" },
        { id: "City", title: "City" },
        { id: "State", title: "State" },
        { id: "LoanNo", title: "Loan No" },
        { id: "CustomerName", title: "Customer Name" },
        { id: "LoanAmount", title: "Loan Amount" },
        { id: "LoanRepayAmount", title: "Loan Repay Amount" },
        { id: "ROI", title: "ROI" },
        { id: "LoanDisburseDate", title: "Loan Disburse Date" },
        { id: "LoanRepayDate", title: "Loan Repay Date" },
        { id: "ReceivedAmount", title: "Received Amount" },
        { id: "DateOfReceived", title: "Date Of Received" },
        { id: "LoanStatus", title: "Loan Status" },
        { id: "PaymentMode", title: "Payment Mode" },
        { id: "Discount", title: "Discount" },
        { id: "Refund", title: "Refund" },
        { id: "RecoveryBy", title: "Recovery By" },
        { id: "RecoveryDate", title: "Recovery Date" },
        { id: "ApprovedBy", title: "Approved By" },
        { id: "ApprovedDate", title: "Approved Date" },
        { id: "CompanyAccountNumber", title: "Company Account Number" },
        { id: "ReferenceNumber", title: "Refrence Number" },
        { id: "CollectionRemarks", title: "Collection Remarks" },
        { id: "ClosureRemark", title: "Closure Remark" },
        { id: "CollectionType", title: "Collection Type" },
        { id: "NOC", title: "NOC" },
        { id: "Source", title: "Source" },
      ],
    });

    const formattedData = [];
    for (const loan of data) {
      // Get all successful collection transactions
      const successfulCollections = loan.paymentRequests
        .filter((pr) => pr.type === TransactionTypeEnum.COLLECTION)
        .flatMap((pr) => pr.collectionTransactions)
        .filter(
          (tx) =>
            tx.status === TransactionStatusEnum.SUCCESS &&
            tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
        );

      const successfulPartialCollections = loan.paymentRequests
        .filter((pr) => pr.type === TransactionTypeEnum.PARTIAL_COLLECTION)
        .flatMap((pr) => pr.partialCollectionTransactions)
        .filter(
          (tx) =>
            tx.status === TransactionStatusEnum.SUCCESS &&
            tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
        );

      // Combine all transactions and sort by completion date
      const allTransactions = [
        ...successfulCollections.map((tx) => ({
          ...tx,
          type: "FULL_PAYMENT",
          completedAt: tx.completedAt,
        })),
        ...successfulPartialCollections.map((tx) => ({
          ...tx,
          type: "PARTIAL_PAYMENT",
          completedAt: tx.completedAt,
        })),
      ].sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateA - dateB;
      });

      // Get ROI
      const roi =
        loan.repayment?.feeBreakdowns?.filter(
          (fee) => fee.chargeMode === ChargeMode.EXCLUSIVE,
        ) || [];

      const formattedRoi = roi
        .map((fee) => {
          return `${fee.chargeValue}${fee.calculationValueType === "percentage" ? "%" : ""}`;
        })
        .join(", ");

      // Get source
      const utmString =
        loan.user.utmTracking && loan.user.utmTracking.length > 0
          ? loan.user.utmTracking
              .map((utm) =>
                `${utm.utmSource || ""} ${utm.utmMedium || ""} ${utm.utmCampaign || ""}`.trim(),
              )
              .join(", ")
          : "";

      const leadMatchesCampaign =
        loan.user.leadMatches?.[0]?.leadForm?.campaign_name || "";
      const source =
        utmString ||
        leadMatchesCampaign ||
        loan.user.brandSubDomain?.marketingSource ||
        "Direct";

      // Get NOC details
      const noDueCertificate = loan.noDueCertificate;

      // Get loan status display name
      let loanStatus = loan.status;
      if (loan.closingType === closingTypeEnum.SETTLEMENT) {
        loanStatus = "SETTLED" as any;
      } else if (loan.closingType === closingTypeEnum.WRITE_OFF) {
        loanStatus = "WRITE-OFF" as any;
      }

      // Base loan data (common for all rows)
      const baseLoanData = {
        LeadID: loan.user?.formattedUserId || "",
        Branch: "",
        City: loan.user?.userDetails?.city || "",
        State: loan.user?.userDetails?.state || "",
        LoanNo: loan.formattedLoanId || "",
        CustomerName: this.getFullName(loan.user),
        LoanAmount: loan.amount || 0,
        LoanRepayAmount: loan.repayment?.totalObligation || 0,
        ROI: formattedRoi,
        LoanDisburseDate: formatDate(loan.disbursementDate, "DD-MM-YYYY") || "",
        LoanRepayDate:
          formatDate(loan.loanDetails?.dueDate, "DD-MM-YYYY") || "",
        LoanStatus: loanStatus,
        CompanyAccountNumber: companyBankAccount?.accountNumber
          ? `="${companyBankAccount.accountNumber}"`
          : "",
        NOC: noDueCertificate ? "Yes" : "No",
        Source: source,
      };

      // If no transactions, skip this loan (since report is for recoveries)
      if (allTransactions.length === 0) {
        continue;
      }

      // Create a row for each transaction
      for (const tx of allTransactions) {
        // Calculate discount
        const penaltyDiscount = tx.penaltyDiscount || 0;
        const roundOffDiscount = tx.roundOffDiscount || 0;
        const totalDiscount = penaltyDiscount + roundOffDiscount;

        // Calculate refund (excess amount)
        const refund = tx.excessAmount || 0;

        // Get recovery and approved by info
        const recoveryBy = tx.createdByPartner
          ? `${tx.createdByPartner.name || tx.createdByPartner.email}`
          : "Customer";

        const approvedBy = tx.opsByPartner
          ? `${tx.opsByPartner.name || tx.opsByPartner.email}`
          : "";

        // Get collection type based on closing type
        let collectionType = tx.type; // "FULL_PAYMENT" or "PARTIAL_PAYMENT"
        if (tx.closingType === closingTypeEnum.SETTLEMENT) {
          collectionType = "SETTLEMENT";
        } else if (tx.closingType === closingTypeEnum.WRITE_OFF) {
          collectionType = "WRITE_OFF";
        }

        // Get closure remark
        let closureRemark = "";
        if (tx.closingType === closingTypeEnum.SETTLEMENT) {
          closureRemark = "Settled";
        } else if (tx.closingType === closingTypeEnum.WRITE_OFF) {
          closureRemark = "Written Off";
        } else if (tx.type === "FULL_PAYMENT" && tx.isPaymentComplete) {
          closureRemark = "Loan Closed";
        } else if (tx.type === "PARTIAL_PAYMENT" && tx.isPaymentComplete) {
          closureRemark = "Loan Closed via Partial Payment";
        }

        formattedData.push({
          ...baseLoanData,
          ReceivedAmount: tx.amount?.toNumber?.() || 0,
          DateOfReceived: tx.completedAt
            ? formatDate(tx.completedAt, "DD-MM-YYYY")
            : "",
          PaymentMode: tx.method || "",
          Discount: totalDiscount,
          Refund: refund,
          RecoveryBy: recoveryBy,
          RecoveryDate: tx.completedAt
            ? formatDate(tx.completedAt, "DD-MM-YYYY")
            : "",
          ApprovedBy: approvedBy,
          ApprovedDate: tx.completedAt
            ? formatDate(tx.completedAt, "DD-MM-YYYY")
            : "",
          ReferenceNumber: tx.externalRef || "",
          CollectionRemarks: tx.note || "",
          ClosureRemark: closureRemark,
          CollectionType: collectionType,
        });
      }
    }

    // Sort by recovery date descending
    formattedData.sort((a, b) => {
      const dateA = new Date(a.DateOfReceived || a.RecoveryDate || 0);
      const dateB = new Date(b.DateOfReceived || b.RecoveryDate || 0);
      return dateB.getTime() - dateA.getTime();
    });

    await csvWriter.writeRecords(formattedData);
    return filePath;
  }

  private async exportTotalApproveSanctionReportCSV(
    data: LoanWithRelations[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `total-approve-sanction-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Fetch company bank account once for efficiency
    const companyBankAccount = await this.prisma.brandBankAccount.findFirst({
      where: {
        brandId: brandId,
        isPrimaryAccount: true,
      },
      select: {
        accountNumber: true,
        bankName: true,
        branchName: true,
      },
    });

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "LeadId", title: "Lead Id" },
        { id: "BranchName", title: "Branch Name" },
        { id: "PanNumber", title: "Pan Number" },
        { id: "LoanNo", title: "Loan No" },
        { id: "CustomerName", title: "Customer Name" },
        { id: "LoanAmount", title: "Loan Amount" },
        { id: "AdminFee", title: "Admin Fee" },
        { id: "Tenure", title: "Tenure" },
        { id: "ROI", title: "ROI" },
        { id: "LoanRepayAmount", title: "Loan Repay Amount" },
        { id: "DisbursementDate", title: "Disbursement Date" },
        { id: "NetDisbursalAmount", title: "Net Disbursal Amount" },
        { id: "RepaymentDate", title: "Repayment Date" },
        { id: "CibilScore", title: "Cibil Score" },
        {
          id: "CustomerBankAccountNumber",
          title: "Customer Bank Account Number",
        },
        { id: "CustomerBankName", title: "Customer Bank Name" },
        { id: "CustomerBankIFSC", title: "Customer Bank IFSC" },
        { id: "RepeatType", title: "Repeat Type" },
        { id: "LeadInitiatedDate", title: "Lead Initiated Date" },
        { id: "SanctionedBy", title: "Sanctioned By" },
        { id: "TransferedFlag", title: "Transfered Flag" },
        { id: "SanctionDate", title: "Sanction Date" },
        { id: "SanctionApprovedDate", title: "Sanction Approved Date" },
        { id: "LoanInitiatedBy", title: "Loan Initiated By" },
        { id: "LoanInitiatedDate", title: "Loan Initiated Date" },
        { id: "Status", title: "Status" },
        { id: "Source", title: "Source" },
        ...this.conditionalFields(partnerUserId, [
          { id: "Mobile", title: "Mobile" },
          { id: "Email", title: "Email" },
          { id: "AlternateMobile", title: "Alternate Mobile" },
          { id: "AlternateEmail", title: "Alternate Email" },
        ]),
      ],
    });

    const formattedData = data.map((loan) => {
      // Get ROI
      const roi =
        loan.repayment?.feeBreakdowns?.filter(
          (fee) => fee.chargeMode === ChargeMode.EXCLUSIVE,
        ) || [];

      const formattedRoi = roi
        .map((fee) => {
          return `${fee.chargeValue}${fee.calculationValueType === "percentage" ? "%" : ""}`;
        })
        .join(", ");

      // Get Admin Fee (Processing Fee)
      const adminFee = loan.disbursement?.totalDeductions || 0;

      // Get source
      const utmString =
        loan.user.utmTracking && loan.user.utmTracking.length > 0
          ? loan.user.utmTracking
              .map((utm) =>
                `${utm.utmSource || ""} ${utm.utmMedium || ""} ${utm.utmCampaign || ""}`.trim(),
              )
              .join(", ")
          : "";

      const leadMatchesCampaign =
        loan.user.leadMatches?.[0]?.leadForm?.campaign_name || "";
      const source =
        utmString ||
        leadMatchesCampaign ||
        loan.user.brandSubDomain?.marketingSource ||
        "Direct";

      // Get loan status history for dates and users
      const loanInitiated = loan.loanStatusHistory.find(
        (h) => h.status === loan_status_enum.PENDING,
      );

      const creditExecutiveApproved = loan.loanStatusHistory.find(
        (h) => h.status === loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
      );

      const sanctionManagerApproved = loan.loanStatusHistory.find(
        (h) => h.status === loan_status_enum.SANCTION_MANAGER_APPROVED,
      );

      const finalApproved = loan.loanStatusHistory.find(
        (h) => h.status === loan_status_enum.APPROVED,
      );

      // Sanctioned By - final approver
      const sanctionedBy = finalApproved?.partnerUser
        ? `${finalApproved.partnerUser.name || finalApproved.partnerUser.email}`
        : sanctionManagerApproved?.partnerUser
          ? `${sanctionManagerApproved.partnerUser.name || sanctionManagerApproved.partnerUser.email}`
          : "System";

      // Loan Initiated By
      const loanInitiatedBy = loanInitiated?.partnerUser
        ? `${loanInitiated.partnerUser.name || loanInitiated.partnerUser.email}`
        : "Customer";

      // Sanction Date (first approval in the chain)
      const sanctionDate =
        creditExecutiveApproved?.createdAt ||
        sanctionManagerApproved?.createdAt ||
        loan.approvalDate;

      // Sanction Approved Date (final approval)
      const sanctionApprovedDate =
        finalApproved?.createdAt ||
        sanctionManagerApproved?.createdAt ||
        loan.approvalDate;

      // Get customer bank details
      const customerBankAccount = loan.user?.user_bank_account?.[0];

      // Get alternate contact
      const alternatePhone = loan.user?.alternatePhoneNumbers?.[0];

      return {
        LeadId: loan.user?.formattedUserId || "",
        BranchName: companyBankAccount?.branchName || "N/A",
        PanNumber:
          loan.user?.documents?.find((d) => d.type === DocumentTypeEnum.PAN)
            ?.documentNumber || "",
        LoanNo: loan.formattedLoanId || "",
        CustomerName: this.getFullName(loan.user),
        LoanAmount: loan.amount || 0,
        AdminFee: adminFee,
        Tenure: loan.loanDetails?.durationDays || 0,
        ROI: formattedRoi,
        LoanRepayAmount: loan.repayment?.totalObligation || 0,
        DisbursementDate: formatDate(loan.disbursementDate, "DD-MM-YYYY") || "",
        NetDisbursalAmount: loan.disbursement?.netAmount || 0,
        RepaymentDate:
          formatDate(loan.loanDetails?.dueDate, "DD-MM-YYYY") || "",
        CibilScore: loan.user?.userDetails?.creditScore || 0,
        CustomerBankAccountNumber: customerBankAccount?.accountNumber
          ? `="${customerBankAccount.accountNumber}"`
          : "",
        CustomerBankName: customerBankAccount?.bankName || "",
        CustomerBankIFSC: customerBankAccount?.ifscCode || "",
        RepeatType: loan.is_repeat_loan ? "REPEAT" : "FRESH",
        LeadInitiatedDate: formatDate(loan.user?.createdAt, "DD-MM-YYYY") || "",
        SanctionedBy: sanctionedBy,
        TransferedFlag: "No", // Default to No, update logic if needed
        SanctionDate: formatDate(sanctionDate, "DD-MM-YYYY") || "",
        SanctionApprovedDate:
          formatDate(sanctionApprovedDate, "DD-MM-YYYY") || "",
        LoanInitiatedBy: loanInitiatedBy,
        LoanInitiatedDate: formatDate(loan.createdAt, "DD-MM-YYYY") || "",
        Status: loan.status,
        Source: source,
        Mobile: (() => {
          const phone = loan.user?.phoneNumber || "";
          return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
        })(),
        Email: loan.user?.email || "",
        AlternateMobile: (() => {
          const phone = alternatePhone?.phone || "";
          return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
        })(),
        AlternateEmail: loan.user?.employment?.officialEmail || "",
      };
    });

    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportLeadTotalReportCSV(
    data: any[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `lead-total-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Fetch company bank account once for efficiency
    const companyBankAccount = await this.prisma.brandBankAccount.findFirst({
      where: {
        brandId: brandId,
        isPrimaryAccount: true,
      },
      select: {
        branchName: true,
      },
    });

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "LeadID", title: "Lead ID" },
        { id: "LoanNo", title: "Loan No" },
        { id: "CustomerID", title: "Customer ID" },
        { id: "CustomerName", title: "Customer Name" },
        { id: "Religion", title: "Religion" },
        { id: "PanCard", title: "PanCard" },
        { id: "OTPVerification", title: "OTP verification" },
        { id: "UserType", title: "User Type" },
        { id: "MonthlyIncome", title: "Monthly Income" },
        { id: "LoanApplied", title: "Loan Applied" },
        { id: "LoanRecommended", title: "Loan Recommended" },
        { id: "AdminFee", title: "Admin Fee" },
        { id: "Tenure", title: "Tenure" },
        { id: "Interest", title: "Interest" },
        { id: "RepaymentAmount", title: "Repayment Amount" },
        { id: "RepaymentDate", title: "Repayment Date" },
        { id: "CIBIL", title: "CIBIL" },
        { id: "Obligations", title: "Obligations" },
        { id: "JourneyType", title: "Journey Type" },
        { id: "LeadSource", title: "Lead Source" },
        { id: "UTMSource", title: "UTM Source" },
        { id: "UTMMedium", title: "UTM Medium" },
        { id: "UTMCampaign", title: "UTM Campaign" },
        { id: "UTMTerm", title: "UTM Term" },
        { id: "DOB", title: "DOB" },
        { id: "Gender", title: "Gender" },
        { id: "Branch", title: "Branch" },
        { id: "State", title: "State" },
        { id: "CurrentState", title: "Current State" },
        { id: "City", title: "City" },
        { id: "Status", title: "Status" },
        { id: "InitiatedDateTime", title: "Initiated DateTime" },
        { id: "DocsUploadedBy", title: "Docs Uploaded By" },
        { id: "ScreenBy", title: "Screen By" },
        { id: "ScreenerAssignDateTime", title: "Screener Assign DateTime" },
        {
          id: "ScreenerRecommendedDateTime",
          title: "Screener Recommended DateTime",
        },
        { id: "SanctionBy", title: "Sanction By" },
        { id: "SanctionAssignDateTime", title: "Sanction Assign DateTime" },
        {
          id: "SanctionRecommendedDateTime",
          title: "Sanction Recommended DateTime",
        },
        { id: "SanctionApprovedBy", title: "Sanction Approved By" },
        { id: "SanctionApprovedDateTime", title: "Sanction Approved DateTime" },
        { id: "CAMSaveDateTime", title: "CAM SAVE DateTime" },
        {
          id: "CustomerAcceptanceDateTime",
          title: "Customer Acceptance DateTime",
        },
        { id: "DisburalBy", title: "Disbursal By" },
        { id: "DisburalAssignDateTime", title: "Disbursal Assign DateTime" },
        {
          id: "DisburalRecommendedDateTime",
          title: "Disbursal Recommended DateTime",
        },
        { id: "DisburalApprovedBy", title: "Disbursal Approved By" },
        { id: "FinalDisbursedDateTime", title: "Final Disbursed DateTime" },
        { id: "RejectedReason", title: "Rejected Reason" },
        {
          id: "LeadRejectedAssignUserName",
          title: "Lead Rejected Assign User Name",
        },
        {
          id: "LeadRejectedAssignDateTime",
          title: "Lead Rejected Assign Date Time",
        },
        {
          id: "LeadRejectedAssignCounter",
          title: "Lead Rejected Assign Counter",
        },
        { id: "TransferedFlag", title: "Transfered Flag" },
        ...this.conditionalFields(partnerUserId, [
          { id: "Mobile", title: "Mobile" },
          { id: "AlternateMobile", title: "Alternate Mobile" },
          { id: "Email", title: "Email" },
          { id: "AlternateEmail", title: "Alternate Email" },
        ]),
      ],
    });

    const formattedData = data.map((user) => {
      const latestLoan = user.loans?.[0];

      // Get UTM details
      const utmTracking = user.utmTracking?.[0];
      const leadSource =
        user.brandSubDomain?.marketingSource ||
        user.leadMatches?.[0]?.leadForm?.campaign_name ||
        "Direct";

      // Get loan status history events
      const loanHistory = latestLoan?.loanStatusHistory || [];

      const pendingStatus = loanHistory.find(
        (h) => h.status === loan_status_enum.PENDING,
      );
      const creditExecApproved = loanHistory.find(
        (h) => h.status === loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
      );
      const sanctionManagerApproved = loanHistory.find(
        (h) => h.status === loan_status_enum.SANCTION_MANAGER_APPROVED,
      );
      const approved = loanHistory.find(
        (h) => h.status === loan_status_enum.APPROVED,
      );
      const disbursed = loanHistory.find(
        (h) => h.status === loan_status_enum.DISBURSED,
      );
      const rejected = loanHistory.find(
        (h) => h.status === loan_status_enum.REJECTED,
      );

      // Get allotted partners
      const allottedPartners = latestLoan?.allottedPartners || [];
      const screener = allottedPartners.find(
        (p) => p.partnerUser.reportsToId !== null,
      );
      const sanctionManager = allottedPartners.find(
        (p) => p.partnerUser.reportsToId === null,
      );

      // Get rejection details
      let rejectionReasons = "";
      let rejectedByUser = "";
      let rejectedDateTime = "";

      if (rejected) {
        const brandReasons = rejected.loan_status_brand_reasons
          ?.map((r) => r.brandStatusReason.reason)
          .join(", ");
        rejectionReasons = brandReasons || rejected.message || "";
        rejectedByUser = rejected.partnerUser
          ? `${rejected.partnerUser.name || rejected.partnerUser.email}`
          : "System";
        rejectedDateTime = formatDate(
          rejected.createdAt,
          "DD-MM-YYYY HH:mm:ss",
        );
      }

      // User rejection
      const userRejectionReasons =
        user.user_status_brand_reasons
          ?.map((r) => r.brand_status_reasons.reason)
          .join(", ") || "";

      const allRejectionReasons = [rejectionReasons, userRejectionReasons]
        .filter(Boolean)
        .join(" | ");

      // Get interest/ROI
      const roi =
        latestLoan?.repayment?.feeBreakdowns?.filter(
          (fee) => fee.chargeMode === ChargeMode.EXCLUSIVE,
        ) || [];

      const formattedRoi = roi
        .map(
          (fee) =>
            `${fee.chargeValue}${fee.calculationValueType === "percentage" ? "%" : ""}`,
        )
        .join(", ");

      // Get alternate contact
      const alternatePhone = user.alternatePhoneNumbers?.[0];

      // Journey Type (Based on onboarding step or loan status)
      let journeyType = "Lead";
      if (latestLoan) {
        if (
          latestLoan.status === loan_status_enum.DISBURSED ||
          latestLoan.status === loan_status_enum.ACTIVE ||
          latestLoan.status === loan_status_enum.COMPLETED
        ) {
          journeyType = "Disbursed";
        } else if (
          latestLoan.status === loan_status_enum.APPROVED ||
          latestLoan.status === loan_status_enum.SANCTION_MANAGER_APPROVED
        ) {
          journeyType = "Sanctioned";
        } else if (
          latestLoan.status === loan_status_enum.CREDIT_EXECUTIVE_APPROVED
        ) {
          journeyType = "Screened";
        } else if (latestLoan.status === loan_status_enum.PENDING) {
          journeyType = "In Process";
        } else if (latestLoan.status === loan_status_enum.REJECTED) {
          journeyType = "Rejected";
        }
      } else if (user.status_id !== null && user.status_id !== undefined) {
        journeyType = "Rejected";
      }

      // Current State (onboarding step or loan status)
      let currentState = "New Lead";
      if (user.onboardingStep) {
        const step = parseInt(String(user.onboardingStep));
        if (step === 0) currentState = "New Lead";
        else if (step >= 1 && step <= 3) currentState = "Personal Info";
        else if (step >= 4 && step <= 6) currentState = "Employment Info";
        else if (step >= 7 && step <= 9) currentState = "Bank Details";
        else if (step >= 10) currentState = "Onboarding Completed";
      }
      if (latestLoan) {
        currentState = latestLoan.status;
      }

      // Get user allotted partner (for lead assignment)
      // Note: User allocation now uses allocated_partner_user_id (denormalized field)

      return {
        LeadID: user.formattedUserId || user.id || "",
        LoanNo: latestLoan?.formattedLoanId || "",
        CustomerID: user.formattedUserId || user.id || "",
        CustomerName: this.getFullName(user),
        Religion: user.userDetails?.religion || "",
        PanCard:
          user.documents?.find((d) => d.type === DocumentTypeEnum.PAN)
            ?.documentNumber || "",
        OTPVerification: user.isPhoneVerified ? "Yes" : "No",
        UserType: latestLoan?.is_repeat_loan ? "REPEAT" : "FRESH",
        MonthlyIncome: user.employment?.salary || 0,
        LoanApplied: latestLoan?.loan_applied_amount || latestLoan?.amount || 0,
        LoanRecommended: latestLoan?.amount || 0,
        AdminFee: latestLoan?.disbursement?.totalDeductions || 0,
        Tenure: latestLoan?.loanDetails?.durationDays || 0,
        Interest: formattedRoi,
        RepaymentAmount: latestLoan?.repayment?.totalObligation || 0,
        RepaymentDate:
          formatDate(latestLoan?.loanDetails?.dueDate, "DD-MM-YYYY") || "",
        CIBIL: user.userDetails?.creditScore || 0,
        Obligations: "", // Can be calculated if needed
        JourneyType: journeyType,
        LeadSource: leadSource,
        UTMSource: utmTracking?.utmSource || "",
        UTMMedium: utmTracking?.utmMedium || "",
        UTMCampaign: utmTracking?.utmCampaign || "",
        UTMTerm: utmTracking?.utmTerm || "",
        DOB: formatDate(user.userDetails?.dateOfBirth, "DD-MM-YYYY") || "",
        Gender: user.userDetails?.gender || "",
        Branch:
          companyBankAccount?.branchName ||
          user.brandSubDomain?.subdomain ||
          "",
        State: user.userDetails?.state || "",
        CurrentState: currentState,
        City: user.userDetails?.city || "",
        Status:
          latestLoan?.status ||
          (user.status_id !== null && user.status_id !== undefined
            ? "REJECTED"
            : "New") ||
          "New",
        InitiatedDateTime: formatDate(user.createdAt, "DD-MM-YYYY HH:mm:ss"),
        DocsUploadedBy: "Customer",
        ScreenBy: screener?.partnerUser
          ? `${screener.partnerUser.name || screener.partnerUser.email}`
          : "",
        ScreenerAssignDateTime: screener
          ? formatDate(screener.allottedAt, "DD-MM-YYYY HH:mm:ss")
          : "",
        ScreenerRecommendedDateTime: creditExecApproved
          ? formatDate(creditExecApproved.createdAt, "DD-MM-YYYY HH:mm:ss")
          : "",
        SanctionBy: sanctionManager?.partnerUser
          ? `${sanctionManager.partnerUser.name || sanctionManager.partnerUser.email}`
          : "",
        SanctionAssignDateTime: sanctionManager
          ? formatDate(sanctionManager.allottedAt, "DD-MM-YYYY HH:mm:ss")
          : "",
        SanctionRecommendedDateTime: sanctionManagerApproved
          ? formatDate(sanctionManagerApproved.createdAt, "DD-MM-YYYY HH:mm:ss")
          : "",
        SanctionApprovedBy: approved?.partnerUser
          ? `${approved.partnerUser.name || approved.partnerUser.email}`
          : "",
        SanctionApprovedDateTime: approved
          ? formatDate(approved.createdAt, "DD-MM-YYYY HH:mm:ss")
          : "",
        CAMSaveDateTime: "", // Would need cam_calculators table
        CustomerAcceptanceDateTime: latestLoan?.agreement?.signedAt
          ? formatDate(latestLoan.agreement.signedAt, "DD-MM-YYYY HH:mm:ss")
          : "",
        DisburalBy: disbursed?.partnerUser
          ? `${disbursed.partnerUser.name || disbursed.partnerUser.email}`
          : "",
        DisburalAssignDateTime: "", // Would need disbursal assignment tracking
        DisburalRecommendedDateTime: "", // Would need disbursal recommendation tracking
        DisburalApprovedBy: disbursed?.partnerUser
          ? `${disbursed.partnerUser.name || disbursed.partnerUser.email}`
          : "",
        FinalDisbursedDateTime: latestLoan?.disbursementDate
          ? formatDate(latestLoan.disbursementDate, "DD-MM-YYYY HH:mm:ss")
          : "",
        RejectedReason: allRejectionReasons,
        LeadRejectedAssignUserName: rejectedByUser || "",
        LeadRejectedAssignDateTime: rejectedDateTime,
        LeadRejectedAssignCounter: rejected ? "1" : "0",
        TransferedFlag: "No", // Would need transfer tracking
        Mobile: (() => {
          const phone = user.phoneNumber || "";
          return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
        })(),
        AlternateMobile: (() => {
          const phone = alternatePhone?.phone || "";
          return phone ? `="${this.formatedPhoneNo(phone)}"` : "";
        })(),
        Email: user.email || "",
        AlternateEmail: user.employment?.officialEmail || "",
      };
    });

    await csvWriter.writeRecords(formattedData);
    return filePath;
  }
  private async exportLoginSessionsReportCSV(
    data: any[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `login-sessions-report-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        ...this.conditionalFields(partnerUserId, [
          { id: "UserEmail", title: "User Email" },
        ]),
        { id: "UserName", title: "User Name" },
        { id: "LoginDate", title: "Login Date" },
        { id: "TotalSessions", title: "Total Sessions" },
        { id: "FirstLogin", title: "First Login (IST)" },
        { id: "LastLogin", title: "Last Login (IST)" },
        { id: "Sessions", title: "Sessions" },
      ],
    });

    const formattedData = data.map((row: any) => {
      // Parse sessions from JSONB
      const sessions = Array.isArray(row.sessions) ? row.sessions : [];

      // Format sessions as readable string
      const sessionsString = sessions
        .map((session: any, index: number) => {
          const logoutStatus = session.isLoggedOut
            ? `Logout: ${session.logoutTime || "N/A"}`
            : "Still Active";

          return `Session ${index + 1}: Login: ${session.loginTime} | ${logoutStatus} | Device: ${session.deviceType || "N/A"} (${session.os || "N/A"}) | App: ${session.appVersion || "N/A"} | IP: ${session.ipAddress || "N/A"}`;
        })
        .join("\n");

      return {
        UserEmail: row.userEmail || "",
        UserName: row.userName || "",
        LoginDate: row.loginDate || "",
        TotalSessions: row.totalSessions || 0,
        FirstLogin: row.firstLogin || "",
        LastLogin: row.lastLogin || "",
        Sessions: sessionsString || "No sessions",
      };
    });

    await csvWriter.writeRecords(formattedData);
    return filePath;
  }

  private async exportCollectionLoanReportByApprovedDateCSV(
    data: LoanWithRelations[],
    brandId: string,
    partnerUserId?: string,
  ): Promise<string> {
    const fileName = `collection-loan-report-by-approved-date-${brandId}-${Date.now()}.csv`;
    const filePath = path.join(process.cwd(), "reports", fileName);

    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: "CustomerId", title: "Customer ID" },
        { id: "source", title: "Source" },
        { id: "LoanNo", title: "Loan No" },
        { id: "Status", title: "Status" },
        { id: "SanctionedAmount", title: "Sanctioned Amount" },
        { id: "ROI", title: "ROI" },
        { id: "InterestAmount", title: "Interest Amount" },
        { id: "PFPercentage", title: "PF" },
        { id: "RepaymentAmount", title: "Repayment Amount" },
        { id: "DisbursedDate", title: "Disbursed Date" },
        { id: "RepaymentDate", title: "Repayment Date" },
        { id: "Name", title: "Name" },
        { id: "PAN", title: "PAN" },
        ...this.conditionalFields(partnerUserId, [
          { id: "Mobile", title: "Mobile" },
          { id: "AlternateMobile", title: "AlternateMobile" },
        ]),
        { id: "State", title: "State" },
        { id: "City", title: "City" },
        { id: "CollectionStatus", title: "Collection Status" },
        { id: "PaymentDate", title: "Payment Date" },
        { id: "ApprovedDate", title: "Approved Date" },
        { id: "PaidAmount", title: "Paid Amount" },
        { id: "PFAmount", title: "PF Amount" },
        { id: "Tax", title: "Tax" },
        { id: "PrincipalReceived", title: "Principal Received" },
        { id: "InterestReceived", title: "Interest Received" },
        { id: "PenaltyReceived", title: "Penalty Received" },
        { id: "PenaltyDiscount", title: "Penalty Discount" },
        { id: "RoundOffDiscount", title: "Round Off Discount" },
        { id: "ExcessAmount", title: "Excess Amount" },
        { id: "CreditedBank", title: "Credited Bank" },
        { id: "PaymentReference", title: "Payment Reference" },
        { id: "PaymentMode", title: "Payment Mode" },
        { id: "CreatedBy", title: "Created By" },
        { id: "ApprovedBy", title: "Approved By" },
        { id: "AccountRemarks", title: "Account Remarks" },
      ],
    });

    const formattedData = [];
    for (const loan of data) {
      const loanRows =
        await this.formatCollectionReportByApprovedDateData(loan);
      formattedData.push(...loanRows);
    }

    // Sort by approved date descending
    formattedData.sort((a, b) => {
      const dateA = new Date(a.ApprovedDate || a.PaymentDate || 0);
      const dateB = new Date(b.ApprovedDate || b.PaymentDate || 0);
      return dateB.getTime() - dateA.getTime();
    });

    await csvWriter.writeRecords(formattedData);
    return filePath;
  }

  private async formatCollectionReportByApprovedDateData(
    loan: LoanWithRelations,
  ) {
    // Helper function to format charge values
    const formatCharge = (charge: {
      chargeValue: any;
      calculationValueType: string;
    }) =>
      `${charge.chargeValue}${charge.calculationValueType === "percentage" ? "%" : ""}`;

    // Get and format ROI
    const roi =
      loan.repayment.feeBreakdowns?.filter(
        (fee) => fee.chargeMode === ChargeMode.EXCLUSIVE,
      ) || [];
    const formattedRoi = roi.map(formatCharge).join(", ") || "";

    // Get and format PF
    const pf =
      loan.disbursement.deductions?.filter(
        (deduction) => deduction.chargeMode === ChargeMode.INCLUSIVE,
      ) || [];
    const formattedPf = pf.map(formatCharge).join(", ") || "";

    // Find payment requests
    const paymentRequests = loan.paymentRequests || [];
    const paymentRequest = paymentRequests.find(
      (p) =>
        p.type === TransactionTypeEnum.COLLECTION &&
        p.collectionTransactions?.length > 0,
    );
    const partialPayment = paymentRequests.find(
      (p) =>
        p.type === TransactionTypeEnum.PARTIAL_COLLECTION &&
        p.partialCollectionTransactions?.length > 0,
    );

    // Helper function to filter successful transactions
    const filterSuccessful = (transactions: any[]) =>
      transactions?.filter(
        (tx) =>
          tx.status === TransactionStatusEnum.SUCCESS &&
          tx.opsApprovalStatus === OpsApprovalStatusEnum.APPROVED,
      ) || [];

    const successfulTransactions = filterSuccessful(
      paymentRequest?.collectionTransactions,
    );
    const successfulPartialTransactions = filterSuccessful(
      partialPayment?.partialCollectionTransactions,
    );

    // Calculate tax once
    const tax = calculateTax(
      loan.disbursement.totalDeductions,
      18,
      "inclusive",
    );
    const taxAmount = tax.taxAmount || 0;

    // Common base data
    const baseData = {
      CustomerId: loan.user?.formattedUserId || "",
      LoanNo: loan.formattedLoanId || "",
      RepaymentDate: formatDate(loan.loanDetails?.dueDate || "", "DD MMM YYYY"),
      Status: loan.loanType || "",
      DisbursedDate: formatDate(loan.disbursementDate, "DD MMM YYYY"),
      Name: this.getFullName(loan.user),
      PAN:
        loan.user?.documents?.find((d) => d.type === "PAN")?.documentNumber ||
        "",
      Mobile: loan.user?.phoneNumber || "",
      AlternateMobile: loan.user?.alternatePhoneNumbers?.[0]?.phone || "",
      State: loan.user?.userDetails?.state || "",
      City: loan.user?.userDetails?.city || "",
      SanctionedAmount: loan.amount || 0,
      ROI: formattedRoi,
      InterestAmount: loan.repayment?.totalFees || 0,
      PFPercentage: formattedPf,
      PFAmount: loan.disbursement.totalDeductions || 0,
      Tax: taxAmount,
      RepaymentAmount: loan.repayment.totalObligation || 0,
      CollectionStatus: collectionStatus(loan) || "",
    };
    const brandBankMap = new Map<string, string>();

    // Collect all unique brand_bank_ids
    const allBrandBankIds = new Set<string>();
    [...successfulTransactions, ...successfulPartialTransactions].forEach(
      (tx) => {
        if (tx.brand_bank_id) {
          allBrandBankIds.add(tx.brand_bank_id);
        }
      },
    );
    // Helper function to format transaction rows
    const formatTransactionRow = async (
      tx: any,
      isPartial: boolean = false,
    ) => {
      let status = "";
      const { closingType } = tx;

      if (closingType === closingTypeEnum.NORMAL) {
        status = isPartial
          ? tx.isPaymentComplete
            ? "CLOSED"
            : "PARTIALLY PAID"
          : "CLOSED";
        if (status === "CLOSED") {
          const dueDate = loan.loanDetails?.dueDate
            ? new Date(loan.loanDetails.dueDate)
            : null;
          const paymentDate = tx.completedAt ? new Date(tx.completedAt) : null;

          if (dueDate && paymentDate) {
            if (paymentDate < dueDate) {
              status = "PRE-CLOSED";
            } else if (
              paymentDate.getFullYear() === dueDate.getFullYear() &&
              paymentDate.getMonth() === dueDate.getMonth() &&
              paymentDate.getDate() === dueDate.getDate()
            ) {
              status = "CLOSED";
            } else if (paymentDate > dueDate) {
              status = "POST-CLOSED";
            }
          }
        }
      } else if (closingType === closingTypeEnum.SETTLEMENT) {
        status = "SETTLED";
      } else if (closingType === closingTypeEnum.WRITE_OFF) {
        status = "WRITTEN OFF";
      }

      const createdBy = tx.createdByPartner
        ? `${tx.createdByPartner.email}${tx.createdByPartner.name ? ` (${tx.createdByPartner.name})` : ""}`
        : "created by customer";
      const approvedBy = tx.opsByPartner
        ? `${tx.opsByPartner.email}${tx.opsByPartner.name ? ` (${tx.opsByPartner.name})` : ""}`
        : "";

      // Get approved date based on transaction type
      const approvedDate = isPartial
        ? tx.ppct__approved_at
          ? formatDate(tx.ppct__approved_at, "DD-MM-YYYY")
          : ""
        : tx.pct__approved_at
          ? formatDate(tx.pct__approved_at, "DD-MM-YYYY")
          : "";

      let paymentMode = tx.method || "";

      if (tx.method === "MANUAL" && tx.brand_bank_id) {
        try {
          const bankAccount = await this.prisma.brandBankAccount.findUnique({
            where: { id: tx.brand_bank_id },
            select: {
              bankName: true,
              accountNumber: true, // ADD THIS
            },
          });
          if (bankAccount?.bankName && bankAccount?.accountNumber) {
            // Show both bank name and last 4 digits of account number
            const accNUmber = bankAccount.accountNumber;
            paymentMode = `${bankAccount.bankName} (${bankAccount.accountNumber})(manual)`;
          } else if (bankAccount?.bankName) {
            paymentMode = `${bankAccount.bankName}(manual)`;
          }
        } catch (error) {
          paymentMode = "MANUAL";
        }
      }
      const accountRemarks = tx.opsRemark || "";

      return {
        ...baseData,
        PaymentDate: tx.completedAt
          ? formatDate(tx.completedAt, "DD-MM-YYYY")
          : "",
        ApprovedDate: approvedDate,
        PaidAmount: tx.amount?.toNumber?.() || 0,
        PaymentReference: tx.externalRef || "",
        PaymentMode: paymentMode,
        AccountRemarks: accountRemarks,
        PrincipalReceived: tx.principalAmount || 0,
        InterestReceived: tx.totalFees || 0,
        PenaltyReceived: tx.totalPenalties || 0,
        PenaltyDiscount: tx.penaltyDiscount || 0,
        RoundOffDiscount: tx.roundOffDiscount || 0,
        ExcessAmount: tx.excessAmount || 0,
        CollectionStatus: status,
        CreatedBy: createdBy,
        ApprovedBy: approvedBy,
      };
    };

    // Format all transactions
    const fullTransactionRows = await Promise.all(
      successfulTransactions.map((tx) => formatTransactionRow(tx, false)),
    );

    const partialTransactionRows = await Promise.all(
      successfulPartialTransactions.map((tx) => formatTransactionRow(tx, true)),
    );

    return [...fullTransactionRows, ...partialTransactionRows];
  }
}
