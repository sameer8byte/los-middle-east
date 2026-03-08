import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { UpdateLoanStatusDto } from "./dto/update-loan.dto";
import { UpdateLoanWithReasonsDto } from "./dto/update-loan-with-reasons.dto";
import { SendBackToCeDto } from "./dto/send-back-to-ce.dto";
import { SendBackToCeSmDto } from "./dto/send-back-to-ce-sm.dto";
import { canUpdateLoanStatus } from "src/utils/canUpdateLoanStatus";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { formatDate, getDateFilter } from "src/utils";
import {
  agreement_status_enum,
  BrandBankAccountType,
  BrandProviderType,
  certificate_type_enum,
  document_status_enum,
  DocumentTypeEnum,
  EligibilityStatusEnum,
  loan_status_enum,
  LoanXlsxFileType,
  notification_priority_enum,
  OpsApprovalStatusEnum,
  platform_type,
  ReloanStatus,
  TransactionStatusEnum,
  TransactionTypeEnum,
  user_bank_verification_status,
} from "@prisma/client";
import * as ExcelJS from "exceljs";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { PdfService } from "src/core/pdf/pdf.service";
import * as path from "path";
import * as ejs from "ejs";
import { LoansService } from "src/features/loans/services/loans.services";
import * as dayjs from "dayjs";
export interface CommentResponse {
  id: string;
  loanId: string;
  comment: string;
  createdAt: string;
  partnerUser: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CommentsListResponse {
  success: boolean;
  comments: CommentResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateCommentResponse {
  success: boolean;
  comment: CommentResponse;
  message: string;
}

// Access the default function from the namespace import
const _dayjs = dayjs.default;
import axios from "axios";
import { generateCertificateId } from "src/utils/generateCertificateId";
import { EmailService } from "src/core/communication/services/email.service";
import { NotificationService } from "src/features/notification/notification.service";
import { AwsAuditLogsSqsService } from "src/core/aws/sqs/aws-audit-logs-sqs.service";
import { PermissionsEnum } from "src/constant/permissions";
import { PartnerTabsEnum, UserStatusEnum } from "src/constant/enum";
import { RedisService } from "src/core/redis/redis.service";
@Injectable()
export class PartnerLoansService {
  private readonly isDev: boolean = process.env.NODE_ENV !== "production";

  constructor(
    private readonly prisma: PrismaService,
    private readonly awsS3Service: AwsPublicS3Service,
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
    private readonly loansService: LoansService,
    private readonly notificationService: NotificationService,
    @Optional() private readonly awsAuditLogsSqsService: AwsAuditLogsSqsService,
    private readonly redis: RedisService,
  ) { }

  private generateLoansCacheKey(
    brandId: string,
    partnerRole: string,
    partnerUserId: string,
    paginationDto: PaginationDto,
    filter?: Record<string, string>,
  ): string {
    const cacheData = {
      brandId,
      partnerRole,
      partnerUserId,
      page: paginationDto.page || 1,
      limit: paginationDto.limit || 10,
      dateFilter: paginationDto.dateFilter || "[]",
      filter: filter || {},
    };
    // Create a hash-like string from the parameters
    const keyString = JSON.stringify(cacheData);
    const keyHash = Buffer.from(keyString).toString("base64");

    return `loans:getLoans:${brandId}:${partnerRole}:${keyHash}`;
  }

  async invalidateLoansCacheForBrand(brandId: string): Promise<void> {
    try {
      const pattern = `loans:getLoans:${brandId}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await Promise.all(keys.map((key) => this.redis.del(key)));
      }
    } catch (error) {
      console.error("Error invalidating loans cache:", error);
      // Don't throw error, just log it to prevent breaking the main flow
    }
  }

  private parseFilterValue(
    value: string | undefined,
    defaultValue: any = [],
  ): any {
    if (!value) return defaultValue;
    try {
      return JSON.parse(value);
    } catch {
      return defaultValue;
    }
  }

  private buildPermissionFilter(
    partnerUser: any,
    partnerUserIds: string[],
    PermissionValues: Record<PermissionsEnum, loan_status_enum[]>,
    PermissionsEnumType: typeof PermissionsEnum,
  ) {
    const validStatusSet = new Set<loan_status_enum>();
    let isApprovalStatus = false;
    let isSectionHead = false;
    let isCollectionHead = false;

    // Fast path: Global roles
    if (partnerUser.globalRoles?.length) {
      if (partnerUserIds.length > 1) isApprovalStatus = true;
      Object.values(loan_status_enum).forEach((status) =>
        validStatusSet.add(status),
      );
      return {
        validStatus: Array.from(validStatusSet),
        isApprovalStatus,
        isSectionHead,
        isCollectionHead,
      };
    }

    // Fast path: ALL permission
    if (
      partnerUser.userPermissions?.some(
        (p) => p.partnerPermission?.name === PermissionsEnumType.ALL,
      )
    ) {
      Object.values(loan_status_enum).forEach((status) =>
        validStatusSet.add(status),
      );
      return {
        validStatus: Array.from(validStatusSet),
        isApprovalStatus,
        isSectionHead,
        isCollectionHead,
      };
    }

    // Slow path: Individual permissions
    if (partnerUser.userPermissions?.length) {
      partnerUser.userPermissions.forEach((permission) => {
        const permName = permission.partnerPermission?.name;
        const statuses = PermissionValues[permName];
        if (
          [
            PermissionsEnumType.ONBOARDING_COMPLETED,
            PermissionsEnumType.ONBOARDING_IN_PROGRESS,
            PermissionsEnumType.SANCTION_MANAGER,
            PermissionsEnumType.PRE_COLLECTIONS,
            PermissionsEnumType.POST_COLLECTIONS,
          ].includes(permName)
        ) {
          partnerUser.subordinates?.forEach((partner) =>
            partnerUserIds.push(partner.id),
          );
          isApprovalStatus = true;
        }

        if (permName === PermissionsEnumType.SANCTION_HEAD) {
          isSectionHead = true;
        }
        if (
          permName === PermissionsEnumType.COLLECTIONS ||
          permName === PermissionsEnumType.PRE_COLLECTIONS ||
          permName === PermissionsEnumType.POST_COLLECTIONS
        ) {
          isCollectionHead = true;
        }

        if (statuses) {
          statuses.forEach((status) => validStatusSet.add(status));
        }
      });
    }

    return {
      validStatus: Array.from(validStatusSet),
      isApprovalStatus,
      isCollectionHead,
      isSectionHead,
    };
  }

  // 🚀 Helper to build search conditions
  private buildSearchConditions(search: string) {
    if (search.length <= 3) return null;

    const words = search.split(/\s+/);
    const conditions: any[] = [];

    if (words.length === 1) {
      const word = words[0];
      return [
        { firstName: { contains: word, mode: "insensitive" as const } },
        { middleName: { contains: word, mode: "insensitive" as const } },
        { lastName: { contains: word, mode: "insensitive" as const } },
      ];
    }

    if (words.length >= 2) {
      conditions.push({
        AND: [
          { firstName: { contains: words[0], mode: "insensitive" as const } },
          { lastName: { contains: words[1], mode: "insensitive" as const } },
        ],
      });
      conditions.push({
        AND: [
          { firstName: { contains: words[1], mode: "insensitive" as const } },
          { lastName: { contains: words[0], mode: "insensitive" as const } },
        ],
      });

      if (words.length >= 3) {
        conditions.push({
          AND: [
            { firstName: { contains: words[0], mode: "insensitive" as const } },
            {
              middleName: { contains: words[1], mode: "insensitive" as const },
            },
            { lastName: { contains: words[2], mode: "insensitive" as const } },
          ],
        });
      }
    }

    return conditions.length > 0 ? conditions : null;
  }

  async getLoans(
    brandId: string,
    tabId: PartnerTabsEnum,
    partnerUserId: string,
    paginationDto: PaginationDto,
    filter?: Record<string, string>,
  ) {
    const pStatus = this.parseFilterValue(filter?.status);
    const pSenctionStatus = this.parseFilterValue(filter?.pSenctionStatus);
    const pLoanAgreementStatus = this.parseFilterValue(
      filter?.loanAgreementStatus,
    );
    const pOpsStatus = this.parseFilterValue(filter?.opsStatus);
    const assignedExecutive = this.parseFilterValue(filter?.assignedExecutive);
    const assignedSupervisor = this.parseFilterValue(
      filter?.assignedSupervisor,
    );
    const assignedCollectionExecutive = this.parseFilterValue(
      filter?.assignedCollectionExecutive,
    );
    const assignedCollectionSupervisor = this.parseFilterValue(
      filter?.assignedCollectionSupervisor,
    );
    const loanTypeFilter = filter?.loanType || "";
    const isRejectedFilter = pStatus.includes(loan_status_enum.REJECTED);

    // Parse salary filter parameters
    const pSalaryMin = filter?.salaryMin
      ? parseFloat(filter.salaryMin.toString().trim())
      : null;
    const pSalaryMax = filter?.salaryMax
      ? parseFloat(filter.salaryMax.toString().trim())
      : null;

    const PermissionValues: Record<PermissionsEnum, loan_status_enum[]> = {
      [PermissionsEnum.ALL]: [...Object.values(loan_status_enum)],
      [PermissionsEnum.CUSTOMER]: [...Object.values(loan_status_enum)],
      [PermissionsEnum.BRAND_SETTINGS]: [],
      [PermissionsEnum.LOANS]: [],
      [PermissionsEnum.LOAN_OPS]: [
        loan_status_enum.APPROVED,
        loan_status_enum.DISBURSED,
      ],
      [PermissionsEnum.COLLECTIONS]: [
        loan_status_enum.ACTIVE,
        loan_status_enum.POST_ACTIVE,
        loan_status_enum.PARTIALLY_PAID,
        loan_status_enum.PAID,
        loan_status_enum.DEFAULTED,
        loan_status_enum.OVERDUE,
      ],
      [PermissionsEnum.PRE_COLLECTIONS]: [
        loan_status_enum.ACTIVE,
        loan_status_enum.POST_ACTIVE,
        loan_status_enum.PARTIALLY_PAID,
        loan_status_enum.PAID,
        loan_status_enum.DEFAULTED,
        loan_status_enum.OVERDUE,
      ],

      [PermissionsEnum.POST_COLLECTIONS]: [
        loan_status_enum.ACTIVE,
        loan_status_enum.POST_ACTIVE,
        loan_status_enum.PARTIALLY_PAID,
        loan_status_enum.PAID,
        loan_status_enum.DEFAULTED,
        loan_status_enum.OVERDUE,
      ],
      [PermissionsEnum.PARTNER_USER_MANAGEMENT]: [],
      [PermissionsEnum.VIEW_DASHBOARD]: [...Object.values(loan_status_enum)],
      [PermissionsEnum.COMPLETED_LOANS]: [loan_status_enum.COMPLETED],

      [PermissionsEnum.SANCTION_MANAGER]: [
        loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
      ],
      [PermissionsEnum.SANCTION_HEAD]: [
        loan_status_enum.SANCTION_MANAGER_APPROVED,
      ],
      [PermissionsEnum.LOAN_REACTIVATE]: [],
      [PermissionsEnum.LOAN_FORCE_BYPASS]: [],
      [PermissionsEnum.LOAN_RULE_TYPE]: [],
      [PermissionsEnum.RELOCATE_USER]: [],
      [PermissionsEnum.COLLECTION_REALLOCATE_LOANS]: [],
      [PermissionsEnum.MASTER_REPORTS]: [],
      [PermissionsEnum.DISBURSED_LOAN_REPORT]: [],
      [PermissionsEnum.NON_DISBURSED_LOAN_REPORT]: [],
      [PermissionsEnum.MASTER_COLLECTION_REPORT]: [],
      [PermissionsEnum.COLLECTION_LOAN_REPORT]: [],
      [PermissionsEnum.CIC_REPORT]: [],
      [PermissionsEnum.MARKETING_REPORT]: [],
      [PermissionsEnum.ONBOARDING_IN_PROGRESS]: [
        loan_status_enum.PENDING,
        loan_status_enum.REJECTED,
      ],
      [PermissionsEnum.ONBOARDING_COMPLETED]: [
        loan_status_enum.PENDING,
        loan_status_enum.REJECTED,
      ],
      [PermissionsEnum.GLOBAL_SEARCH]: [],
      [PermissionsEnum.REJECT_REASON_REPORT]: [],
      [PermissionsEnum.LOAN_RELOCATE]: [],
      [PermissionsEnum.LOAN_SEND_BACK]: [],
      [PermissionsEnum.ACTIVE_LOANS_BY_DUE_DATE_REPORT]: [],
      [PermissionsEnum.COMPLETED_LOAN_WITH_NO_REPET_REPORT]: [],
      [PermissionsEnum.COLLECTION_ALLOCATION_EXECUTIVE_REPORT]: [],
      [PermissionsEnum.PROCESS_DISBURSEMENT_TRANSACTION_REPORT]: [],
      [PermissionsEnum.COLLECTION_DUE_REPORT]: [],
      [PermissionsEnum.FIELD_VISIT_REPORT]: [],
      [PermissionsEnum.DAILY_MARKETING_REPORT]: [],
      [PermissionsEnum.TRANSUNION_REPORT]: [],
      [PermissionsEnum.INTERNAL_MARKETING_REPORT]: [],
      [PermissionsEnum.COLLECTION_REMARKS_REPORT]: [],
      [PermissionsEnum.OUTSTANDING_DATA_REPORT]: [],
      [PermissionsEnum.LOAN_CLOSE_REPORT]: [],
      [PermissionsEnum.TOTAL_RECOVERY_REPORT]: [],
      [PermissionsEnum.TOTAL_APPROVE_SANCTION_REPORT]: [],
      [PermissionsEnum.LEAD_TOTAL_REPORT]: [],
      [PermissionsEnum.LOGIN_SESSIONS_REPORT]: [],
      [PermissionsEnum.COLLECTION_LOAN_REPORT_BY_APPROVED_DATE]: [],
    };

    const partnerUser = await this.prisma.partnerUser.findUnique({
      where: { id: partnerUserId },
      select: {
        id: true,
        userPermissions: {
          select: {
            partnerPermission: true,
          },
        },
        subordinates: true,
        reportsTo: true,
        globalRoles: true,
      },
    });

    if (!partnerUser) {
      throw new BadRequestException("Partner user not found");
    }

    let loanCollectionFilter = null;
    if (
      tabId === PartnerTabsEnum.PRE_COLLECTIONS ||
      tabId === PartnerTabsEnum.POST_COLLECTIONS ||
      tabId === PartnerTabsEnum.COLLECTIONS
    ) {
      loanCollectionFilter = {
        OR: [
          {
            paymentRequests: {
              none: {
                type: {
                  in: ["COLLECTION", "PARTIAL_COLLECTION"],
                },
              },
            },
          },
          {
            paymentRequests: {
              some: {
                OR: [
                  {
                    type: "COLLECTION",
                  },
                  {
                    type: "PARTIAL_COLLECTION",
                    status: {
                      not: "SUCCESS",
                    },
                  },
                ],
                AND: [
                  {
                    OR: [
                      {
                        collectionTransactions: {
                          every: {
                            OR: [
                              {
                                status: {
                                  in: [
                                    "PENDING",
                                    "FAILED",
                                    "RETRYING",
                                    "CANCELLED",
                                    "TIMEOUT",
                                  ],
                                },
                              },
                              {
                                AND: [
                                  { status: "SUCCESS" },
                                  {
                                    opsApprovalStatus: {
                                      notIn: ["APPROVED", "PENDING"],
                                    },
                                  },
                                ],
                              },
                            ],
                          },
                        },
                      },
                      {
                        collectionTransactions: {
                          none: {},
                        },
                      },
                    ],
                  },
                  {
                    OR: [
                      {
                        partialCollectionTransactions: {
                          every: {
                            OR: [
                              {
                                status: {
                                  in: [
                                    "PENDING",
                                    "FAILED",
                                    "RETRYING",
                                    "CANCELLED",
                                    "TIMEOUT",
                                  ],
                                },
                              },
                              {
                                AND: [
                                  { status: "SUCCESS" },
                                  {
                                    opsApprovalStatus: {
                                      notIn: ["PENDING"],
                                    },
                                  },
                                ],
                              },
                            ],
                          },
                        },
                      },
                      {
                        partialCollectionTransactions: {
                          none: {},
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
        ],
        AND: [
          ...(tabId !== PartnerTabsEnum.COLLECTIONS
            ? [
              {
                loanDetails: {
                  postActiveDate:
                    tabId === PartnerTabsEnum.POST_COLLECTIONS
                      ? { lt: new Date() }
                      : { gte: new Date() },
                },
              },
            ]
            : []),
        ],
      };
    }

    // loan Operations Filter Conditions
    let loanOpsFilter = null;
    if (tabId === PartnerTabsEnum.LOAN_OPS) {
      if (pOpsStatus.includes("payment_approval")) {
        loanOpsFilter = {
          OR: [
            {
              status: {
                in: [loan_status_enum.ACTIVE, loan_status_enum.PARTIALLY_PAID],
              },
              paymentRequests: {
                some: {
                  type: {
                    in: ["COLLECTION", "PARTIAL_COLLECTION"],
                  },
                  AND: [
                    {
                      OR: [
                        {
                          collectionTransactions: {
                            some: {
                              status: "SUCCESS",
                              opsApprovalStatus: "PENDING",
                            },
                          },
                        },
                        {
                          partialCollectionTransactions: {
                            some: {
                              status: "SUCCESS",
                              opsApprovalStatus: "PENDING",
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        };
      } else if (pOpsStatus.includes("in_progress")) {
        loanOpsFilter = {
          OR: [
            {
              paymentRequests: {
                some: {
                  type: {
                    in: ["COLLECTION", "PARTIAL_COLLECTION"],
                  },
                  status: TransactionStatusEnum.PENDING,
                  AND: [
                    {
                      OR: [
                        {
                          collectionTransactions: {
                            some: {
                              status: "SUCCESS",
                              opsApprovalStatus: "APPROVED",
                            },
                          },
                        },
                        {
                          partialCollectionTransactions: {
                            some: {
                              status: "SUCCESS",
                              opsApprovalStatus: "APPROVED",
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        };
      } else if (pOpsStatus.includes("completed")) {
        loanOpsFilter = {
          OR: [
            {
              status: {
                in: [loan_status_enum.PAID, loan_status_enum.PARTIALLY_PAID],
              },
              paymentRequests: {
                some: {
                  type: {
                    in: ["COLLECTION", "PARTIAL_COLLECTION"],
                  },
                  status: TransactionStatusEnum.SUCCESS,
                  AND: [
                    {
                      OR: [
                        {
                          collectionTransactions: {
                            some: {
                              status: "SUCCESS",
                              opsApprovalStatus: "APPROVED",
                            },
                          },
                        },
                        {
                          partialCollectionTransactions: {
                            some: {
                              status: "SUCCESS",
                              opsApprovalStatus: "APPROVED",
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        };
      } else if (pOpsStatus.includes("pending_disbursement")) {
        // Handle pending disbursement
      } else {
        // Fetch provider + autopay IDs once
        const brandProviders = await this.prisma.brandProvider.findMany({
          where: { brandId, isActive: true, isDisabled: false },
        });

        const apiProviderIds = brandProviders
          .filter((bp) => bp.type === BrandProviderType.UPI_AUTOPAY)
          .map((bp) => bp.id);

        const autoPay =
          apiProviderIds.length > 0
            ? {
              paymentRequests: {
                some: {
                  type: TransactionTypeEnum.AUTOPAY_CONSENT,
                  status: { notIn: [TransactionStatusEnum.SUCCESS] },
                },
              },
            }
            : null;

        loanOpsFilter = {
          OR: [
            {
              status: {
                in: [
                  loan_status_enum.APPROVED,
                  loan_status_enum.SANCTION_MANAGER_APPROVED,
                ],
              },
              ...(autoPay || {}),
            },
            {
              status: {
                in: [loan_status_enum.ACTIVE, loan_status_enum.PARTIALLY_PAID],
              },
              paymentRequests: {
                some: {
                  type: {
                    in: ["COLLECTION", "PARTIAL_COLLECTION"],
                  },
                  AND: [
                    {
                      OR: [
                        {
                          collectionTransactions: {
                            some: {
                              status: "SUCCESS",
                              opsApprovalStatus: "PENDING",
                            },
                          },
                        },
                        {
                          partialCollectionTransactions: {
                            some: {
                              status: "SUCCESS",
                              opsApprovalStatus: "PENDING",
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
            {
              status: {
                in: [loan_status_enum.PAID, loan_status_enum.PARTIALLY_PAID],
              },
              paymentRequests: {
                some: {
                  type: {
                    in: ["COLLECTION", "PARTIAL_COLLECTION"],
                  },
                  AND: [
                    {
                      OR: [
                        {
                          collectionTransactions: {
                            some: {
                              status: "SUCCESS",
                              opsApprovalStatus: "APPROVED",
                            },
                          },
                        },
                        {
                          partialCollectionTransactions: {
                            some: {
                              status: "SUCCESS",
                              opsApprovalStatus: "APPROVED",
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          ],
        };
      }
    }

    let partnerUserIds = [];

    if (partnerUser.id) {
      partnerUserIds.push(partnerUser.id);
    }

    const { validStatus, isApprovalStatus, isSectionHead, isCollectionHead } =
      this.buildPermissionFilter(
        partnerUser,
        partnerUserIds,
        PermissionValues,
        PermissionsEnum,
      );

    if (assignedExecutive.length > 0 || assignedSupervisor.length > 0) {
      partnerUserIds = [...assignedExecutive, ...assignedSupervisor];
    }
    if (
      assignedCollectionExecutive.length > 0 ||
      assignedCollectionSupervisor.length > 0
    ) {
      partnerUserIds = [
        ...assignedCollectionExecutive,
        ...assignedCollectionSupervisor,
      ];
    }
    const allStatusesValid = pStatus.every((status: loan_status_enum) =>
      validStatus.includes(status),
    );
    if (!allStatusesValid) {
      throw new BadRequestException(
        "Ops! You do not have permission to view loans with the selected status.",
      );
    }

    const search = filter?.search?.trim() || "";
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;
    const pDateFilter = JSON.parse(paginationDto?.dateFilter || "[]");

    // Customer date range filter (from/to) - takes precedence over preset dateFilter
    const customDateFrom = filter?.customDateFrom || "";
    const customDateTo = filter?.customDateTo || "";

    let dateFilter: any = {};
    if (customDateFrom || customDateTo) {
      if (customDateFrom) {
        dateFilter.gte = _dayjs(customDateFrom).startOf("day").toDate();
      }
      if (customDateTo) {
        dateFilter.lte = _dayjs(customDateTo).endOf("day").toDate();
      }
    } else {
      dateFilter = getDateFilter(pDateFilter);
    }

    const nameConditions = this.buildSearchConditions(search);

    let statusFilter = null;
    const defaultStatuses = Object.values(loan_status_enum).filter(
      (status) =>
        status !== loan_status_enum.PENDING &&
        status !== loan_status_enum.REJECTED,
    );

    if (pStatus.length > 0) {
      if (isRejectedFilter) {
        statusFilter = {
          OR: [
            { status: { in: pStatus } },
            {
              user: {
                status_id: {
                  in: [UserStatusEnum.BLOCKED, UserStatusEnum.SUSPENDED], // User's status_id is BLOCKED (5) or SUSPENDED (6)
                },
              },
            },
          ],
        };
      } else {
        statusFilter = {
          AND: [
            { status: { in: pStatus } },
            {
              user: {
                status_id: {
                  notIn: [UserStatusEnum.BLOCKED, UserStatusEnum.SUSPENDED],
                },
              },
            },
          ],
        };
      }
    } else if (pLoanAgreementStatus.includes(agreement_status_enum.NOT_SENT)) {
      statusFilter = { status: { in: defaultStatuses } };
    }

    const whereConditions: any[] = [];
    if (Object.keys(dateFilter).length > 0) {
      const isCollectionRelatedTab = [
        PartnerTabsEnum.COLLECTIONS,
        PartnerTabsEnum.PRE_COLLECTIONS,
        PartnerTabsEnum.POST_COLLECTIONS,
      ].includes(tabId);
      if (isCollectionRelatedTab) {
        // For collection tabs, always filter by due date
        whereConditions.push({
          loanDetails: {
            is: {
              dueDate: dateFilter,
            },
            isNot: null, // Ensure loanDetails exists
          },
        });
      } else {
        // For other tabs (like loans, sanction, etc.), use createdAt
        whereConditions.push({ createdAt: dateFilter });
      }
    }

    if (pStatus.length > 0 || pLoanAgreementStatus.length > 0) {
      whereConditions.push(
        pOpsStatus.includes("pending_disbursement")
          ? {
            status: {
              in: [
                loan_status_enum.SANCTION_MANAGER_APPROVED,
                loan_status_enum.APPROVED,
              ],
            },
          }
          : statusFilter,
      );
    }

    if (
      pSenctionStatus.includes(loan_status_enum.CREDIT_EXECUTIVE_APPROVED) ||
      pSenctionStatus.includes(loan_status_enum.SANCTION_MANAGER_APPROVED)
    ) {
      // Fetch provider + autopay IDs once
      const brandProviders = await this.prisma.brandProvider.findMany({
        where: { brandId, isActive: true, isDisabled: false },
      });

      const apiProviderIds = brandProviders
        .filter((bp) => bp.type === BrandProviderType.UPI_AUTOPAY)
        .map((bp) => bp.id);

      const autoPayPendingCondition =
        apiProviderIds.length > 0
          ? {
            agreement: { status: agreement_status_enum.SIGNED },
            status: {
              in: [
                loan_status_enum.SANCTION_MANAGER_APPROVED,
                loan_status_enum.APPROVED,
              ],
            },
            skip_auto_pay_consent: false,
            paymentRequests: {
              some: {
                type: TransactionTypeEnum.AUTOPAY_CONSENT,
                status: { notIn: [TransactionStatusEnum.SUCCESS] },
              },
            },
          }
          : null;

      // Helper to add only valid conditions
      const addWhereCondition = (conditions: any[]) => {
        whereConditions.push({
          OR: conditions.filter(Boolean), // remove null/false
        });
      };

      // ----------------------
      // SANCTION MANAGER LOGIC
      // ----------------------
      if (
        pSenctionStatus.includes(loan_status_enum.SANCTION_MANAGER_APPROVED)
      ) {
        addWhereCondition([
          {
            status: loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
            amount: { gt: 50000 },
          },
          {
            status: loan_status_enum.APPROVED,
            agreement: { status: { not: agreement_status_enum.SIGNED } },
          },
          autoPayPendingCondition,
        ]);
      }

      // ------------------------------
      // CREDIT EXECUTIVE APPROVED LOGIC
      // ------------------------------

      if (
        pSenctionStatus.includes(loan_status_enum.CREDIT_EXECUTIVE_APPROVED)
      ) {
        addWhereCondition([
          {
            status: loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
            amount: { lte: 50000 },
          },
          {
            status: loan_status_enum.SANCTION_MANAGER_APPROVED,
            agreement: { status: { notIn: [agreement_status_enum.SIGNED] } },
          },
          autoPayPendingCondition,
        ]);
      }
    }

    if (pLoanAgreementStatus.length > 0) {
      whereConditions.push({
        agreement: { status: { in: pLoanAgreementStatus } },
      });
    }

    const hasAssignedUsers =
      assignedExecutive.length > 0 || assignedSupervisor.length > 0;

    const hasAssignedCollectionUsers =
      assignedCollectionExecutive.length > 0 ||
      assignedCollectionSupervisor.length > 0;

    if (
      ((isApprovalStatus && !isSectionHead) || hasAssignedUsers) &&
      [
        PartnerTabsEnum.CREDIT_EXECUTIVE,
        PartnerTabsEnum.SANCTION_MANAGER,
        PartnerTabsEnum.LOANS,
      ].includes(tabId)
    ) {
      whereConditions.push({
        allottedPartners: { some: { partnerUserId: { in: partnerUserIds } } },
      });
    }
    if (
      ((isApprovalStatus && !isCollectionHead) || hasAssignedCollectionUsers) &&
      [
        PartnerTabsEnum.COLLECTIONS,
        PartnerTabsEnum.PRE_COLLECTIONS,
        PartnerTabsEnum.POST_COLLECTIONS,
      ].includes(tabId)
    ) {
      whereConditions.push({
        loan_collection_allocated_partner: {
          some: {
            partnerUserId: { in: partnerUserIds },
            isDeallocated: false,
            isActive: true,
          },
        },
      });
    }

    if (loanCollectionFilter) whereConditions.push(loanCollectionFilter);
    if (loanOpsFilter) whereConditions.push(loanOpsFilter);

    // Add salary filter condition
    let salaryCondition: any = null;

    if (pSalaryMin !== null || pSalaryMax !== null) {
      const salaryFilter: any = {};
      if (pSalaryMin !== null) salaryFilter.gte = pSalaryMin;
      if (pSalaryMax !== null) salaryFilter.lte = pSalaryMax;

      // If min is 0 and max is 0, we specifically want "No Salary" users
      if (pSalaryMin === 0 && pSalaryMax === 0) {
        salaryCondition = {
          user: {
            OR: [
              { employment: null },
              { employment: { salary: null } },
              { employment: { salary: { lte: 0 } } },
            ],
          },
        };
      } else {
        // STRICT RANGE: This ensures users MUST have a salary within the range
        salaryCondition = {
          user: {
            employment: {
              salary: salaryFilter,
            },
          },
        };
      }
    }

    // Add salaryCondition to whereConditions if it exists
    if (salaryCondition) {
      whereConditions.push(salaryCondition);
    }

    let searchFilter = null;
    if (search && search.length > 3) {
      searchFilter = {
        OR: [
          {
            user: { email: { contains: search, mode: "insensitive" as const } },
          },
          {
            user: {
              phoneNumber: { contains: search, mode: "insensitive" as const },
            },
          },
          {
            user: {
              documents: {
                some: {
                  documentNumber: {
                    contains: search,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          },
          { user: { id: { contains: search, mode: "insensitive" as const } } },
          {
            user: {
              formattedUserId: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          },
          {
            user: {
              userDetails: {
                OR: nameConditions || [
                  {
                    firstName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    middleName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                  {
                    lastName: {
                      contains: search,
                      mode: "insensitive" as const,
                    },
                  },
                ],
              },
            },
          },
          { id: { contains: search, mode: "insensitive" as const } },
          {
            formattedLoanId: { contains: search, mode: "insensitive" as const },
          },
          { oldLoanId: { contains: search, mode: "insensitive" as const } },
        ],
      };
    }

    if (searchFilter) whereConditions.push(searchFilter);

    // Add loan type filter based on loanType field and user's loan count
    if (loanTypeFilter === "fresh") {
      // Fresh loans: loanType = "LOAN-1" (first loan for the user)
      whereConditions.push({
        is_repeat_loan: false,
      });
    } else if (loanTypeFilter === "repeat") {
      // Repeat loans: loanType != "LOAN-1" (LOAN-2, LOAN-3, etc.)
      whereConditions.push({
        is_repeat_loan: true,
      });
    }

    // ─── BHD eligibility filters (DB stores amounts in INR; 1 BHD = 243 INR) ───
    // salary (INR) / 243 >= 500 BHD  →  salary >= 500 * 243 = 121,500 INR
    // amount (INR) / 243 >= 50 BHD   →  amount >= 50  * 243 = 12,150  INR
    // amount (INR) / 243 <= 1000 BHD →  amount <= 1000 * 243 = 243,000 INR
    const BHD_TO_INR = 243;
    whereConditions.push({
      AND: [
        {
          user: {
            employment: {
              salary: { gte: 500 * BHD_TO_INR }, // >= 500 BHD
            },
          },
        },
        {
          amount: {
            gte: 50 * BHD_TO_INR, // >= 50 BHD
            lte: 1000 * BHD_TO_INR, // <= 1000 BHD
          },
        },
      ],
    });
    // ─────────────────────────────────────────────────────────────────────────────

    const where = {
      brandId,
      isActive: true,
      user: { isActive: true },
      AND: whereConditions.filter(Boolean),
    };

    const [data, total, totalLoanAmountResult] = await Promise.all([
      this.prisma.loan.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phoneNumber: true,
              status_id: true,
              occupation_type_id: true,
              is_terms_accepted: true,
              userDetails: {
                select: {
                  userBlockAlert: true,
                  firstName: true,
                  middleName: true,
                  lastName: true,
                },
              },
              employment: {
                select: {
                  salary: true,
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
              loan_status_brand_reasons: {
                include: {
                  brandStatusReason: true,
                },
              },
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
          agreement: {
            select: {
              id: true,
              status: true,
              signedByUser: true,
              createdAt: true,
              signed: true,
              signedAt: true,
              aadhaarSuffix: true,
            },
          },
          paymentRequests: {
            include: {
              partialCollectionTransactions: {
                where: { status: TransactionStatusEnum.SUCCESS },
                include: {
                  receipt: true,
                },
              },
              collectionTransactions: {
                where: { status: TransactionStatusEnum.SUCCESS },
                include: {
                  receipt: true,
                },
              },
              disbursalTransactions: {
                where: { status: TransactionStatusEnum.SUCCESS },
              },
            },
          },
          loanDetails: true,
          disbursement: true,
          allottedPartners: {
            include: {
              partnerUser: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  reportsToId: true,
                },
              },
            },
          },
          loan_collection_allocated_partner: {
            where: {
              isActive: true,
              isDeallocated: false,
            },
            include: {
              partnerUser: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  reportsToId: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.loan.count({ where }),
      this.prisma.loan.aggregate({
        where,
        _sum: {
          amount: true,
        },
      }),
    ]);
    const totalLoanAmount = totalLoanAmountResult._sum.amount || 0;

    const result = {
      loans: data,
      meta: {
        total: total,
        currentPage: page,
        limit,
        totalPages: Math.ceil(total / limit),
        totalLoanAmount: totalLoanAmount,
      },
    };

    return result;
  }

  async getLoan(loanId: string, brandId: string) {
    if (!loanId) {
      throw new BadRequestException("LoanId is required");
    }
    if (!brandId) {
      throw new BadRequestException("BrandId is required");
    }

    const loan = await this.prisma.loan.findFirst({
      where: {
        brandId: brandId,
        OR: [
          {
            id: loanId,
          },
          {
            formattedLoanId: loanId,
          },
          {
            user: {
              email: { contains: loanId, mode: "insensitive" as const },
            },
          },
          {
            user: {
              phoneNumber: { contains: loanId, mode: "insensitive" as const },
            },
          },
          {
            user: {
              id: { contains: loanId, mode: "insensitive" as const },
            },
          },
          {
            user: {
              formattedUserId: {
                contains: loanId,
                mode: "insensitive" as const,
              },
            },
          },
          {
            user: {
              documents: {
                some: {
                  documentNumber: {
                    contains: loanId,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          },
        ],
      },

      include: {
        loanDetails: true,
        loan_collection_allocated_partner: {
          where: {
            isActive: true,
          },
          include: {
            partnerUser: {
              select: {
                id: true,
                email: true,
                name: true,
                reportsToId: true,
              },
            },
          },
        },
        paymentRequests: {
          include: {
            partialCollectionTransactions: {
              where: {
                status: {
                  in: [
                    TransactionStatusEnum.SUCCESS,
                    TransactionStatusEnum.PENDING,
                  ],
                },
              },
              include: {
                receipt: {
                  select: {
                    receiptKey: true,
                  },
                },
              },
            },
            collectionTransactions: {
              where: {
                status: {
                  in: [
                    TransactionStatusEnum.SUCCESS,
                    TransactionStatusEnum.PENDING,
                  ],
                },
              },
              include: {
                receipt: {
                  select: {
                    receiptKey: true,
                  },
                },
              },
            },
            disbursalTransactions: {
              where: { status: TransactionStatusEnum.SUCCESS },
            },
          },
        },
        repayment: {
          include: {
            feeBreakdowns: true,
          },
        },
      },
    });
    if (!loan) {
      throw new BadRequestException("Loan not found");
    }
    return loan;
  }

  async getLoanById(loanId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: {
        id: loanId,
      },
      include: {
        noDueCertificate: true,
        allottedPartners: true,
        paymentRequests: {
          include: {
            partialCollectionTransactions: {
              where: {
                status: {
                  in: [
                    TransactionStatusEnum.SUCCESS,
                    TransactionStatusEnum.PENDING,
                  ],
                },
              },
              include: {
                receipt: true,
              },
            },
            collectionTransactions: {
              where: {
                status: {
                  in: [
                    TransactionStatusEnum.SUCCESS,
                    TransactionStatusEnum.PENDING,
                  ],
                },
              },
              include: {
                receipt: true,
              },
            },
            disbursalTransactions: {
              where: { status: TransactionStatusEnum.SUCCESS },
            },
          },
        },
      },
    });
    return loan;
  }

  async getBrandBankAccount(brandId: string) {
    const brandBankAccount = await this.prisma.brandBankAccount.findMany({
      where: {
        brandId: brandId,
        isActive: true,
      },
    });
    return brandBankAccount;
  }

  async getLoanXlsx(brandId: string, loanId: string) {
    const loan = await this.prisma.loan.findUnique({
      where: {
        id: loanId,
        brandId: brandId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
        agreement: true,
      },
    });
    return loan;
  }
  async generateLoanCSV(
    brandId: string,
    loanIds: string[],
    brandBankAccountId: string,
    fileType: LoanXlsxFileType,
  ) {
    if (!brandId || !loanIds.length || !brandBankAccountId) {
      throw new BadRequestException(
        "BrandId, loanIds, and BrandBankAccountId are required",
      );
    }

    const [loans, brandBankAccount] = await Promise.all([
      this.prisma.loan.findMany({
        where: { id: { in: loanIds }, brandId },
        include: {
          disbursement: true,
          user: {
            include: {
              userDetails: true,
              user_bank_account: {
                where: { isPrimary: true },
              },
            },
          },
        },
      }),
      this.prisma.brandBankAccount.findFirst({
        where: { id: brandBankAccountId, brandId },
      }),
    ]);

    if (!loans.length) throw new BadRequestException("No loans found");
    if (!brandBankAccount)
      throw new BadRequestException("Brand bank account not found");

    const bank = brandBankAccount?.type;
    if (!bank) {
      throw new BadRequestException("type is required");
    }

    const headers: string[] = [];
    const data: any[] = [];

    const getFullName = (user) => {
      const {
        firstName = "",
        middleName = "",
        lastName = "",
      } = user?.userDetails || {};

      // Normalize values and remove null/undefined
      let parts = [firstName, middleName, lastName]
        .map((p) => (p ? p.trim() : "")) // Handle null/undefined
        .filter(Boolean) // Remove empty strings
        .filter((p) => !/brand(s)?/i.test(p)); // Remove "brand" or "brands" (case-insensitive)

      return parts.length > 0 ? parts.join(" ") : "N/A";
    };

    const getPrimaryBankAccount = (user) => user?.user_bank_account?.[0] || {};

    // ---------------------------- INDUSIND BANK ----------------------------

    if (
      fileType === LoanXlsxFileType.BENEFICIARY &&
      bank === BrandBankAccountType.INDUSIND_BANK
    ) {
      headers.push(
        "BenCode",
        "BenName",
        "Address1",
        "Address2",
        "City",
        "State",
        "Zip_Code",
        "Phone",
        "Email",
        "Beneficiary Account No.",
        "Input Only Internal Fund Transfer Account no.",
        "Delivery_Address1",
        "Delivery_Address2",
        "Delivery_City",
        "Delivery_State",
        "Delivery_Zip_Code",
        "PrintLocation",
        "CustomerID",
        "IFSC",
        "MailTo",
        "NEFT",
        "RTGS",
        "CHQ",
        "DD",
        "IFTO",
        "FirstLinePrint",
        "IMPS",
      );

      data.push(
        ...loans.map((loan, index) => {
          const user = loan.user;
          const userDetails = user?.userDetails;
          if (!userDetails) {
            throw new BadRequestException("User details not found");
          }
          const bankAccount = getPrimaryBankAccount(user);

          return {
            BenCode: `BEN${index + 1}`,
            BenName: getFullName(user),
            Address1: userDetails.address ?? "",
            Address2: "",
            City: userDetails.city ?? "",
            State: userDetails.state ?? "",
            Zip_Code: userDetails.pincode ?? "",
            Phone: user?.phoneNumber ?? "",
            Email: user?.email ?? "",
            "Beneficiary Account No.": `="${String(bankAccount.accountNumber ?? "")}"`,
            "Input Only Internal Fund Transfer Account no.": "",
            Delivery_Address1: userDetails.address ?? "",
            Delivery_Address2: "",
            Delivery_City: userDetails.city ?? "",
            Delivery_State: userDetails.state ?? "",
            Delivery_Zip_Code: userDetails.pincode ?? "",
            PrintLocation: "",
            CustomerID: `="${String(user?.id ?? "")}"`,
            IFSC: bankAccount.ifscCode ?? "",
            MailTo: user?.email ?? "",
            NEFT: "Y",
            RTGS: "Y",
            CHQ: "N",
            DD: "N",
            IFTO: "Y",
            FirstLinePrint: "Y",
            IMPS: "Y",
          };
        }),
      );
    }

    if (
      fileType === LoanXlsxFileType.PAYOUT &&
      bank === BrandBankAccountType.INDUSIND_BANK
    ) {
      headers.push(
        "Debit Account",
        "Value Date",
        "Transaction Type",
        "Customer Ref No",
        "Beneficiary Code",
        "Beneficiary Name",
        "Beneficiary A/c No.",
        "IFSC Code",
        "Transaction Amount",
        "Beneficiary Email ID",
        "Beneficiary Mobile No",
        "Payment Details 1",
        "Source Narration",
        "Target Narration",
        "Remitter LEI Information",
        "Beneficiary LEI Information",
      );

      const today = new Date().toISOString().split("T")[0];

      data.push(
        ...loans.map((loan, index) => {
          const user = loan.user;
          const bankAccount = getPrimaryBankAccount(user);

          return {
            "Debit Account": `="${String(brandBankAccount.accountNumber)}"`,
            "Value Date": today,
            "Transaction Type": "NEFT",
            "Customer Ref No": `CUST${loan.userId}`,
            "Beneficiary Code": `BEN${index + 1}`,
            "Beneficiary Name": getFullName(user),
            "Beneficiary A/c No.": `="${String(bankAccount.accountNumber ?? "")}"`,
            "IFSC Code": bankAccount.ifscCode ?? "",
            "Transaction Amount": loan.disbursement?.netAmount ?? 0,
            "Beneficiary Email ID": user?.email ?? "",
            "Beneficiary Mobile No": user?.phoneNumber ?? "",
            "Payment Details 1": "Loan Disbursement",
            "Source Narration": "Loan Disbursement",
            "Target Narration": "Loan Disbursement",
            "Remitter LEI Information": "",
            "Beneficiary LEI Information": "",
          };
        }),
      );
    }

    // ---------------------------- HDFC BANK ----------------------------

    if (
      fileType === LoanXlsxFileType.PAYOUT &&
      bank === BrandBankAccountType.HDFC_BANK
    ) {
      headers.push(
        "Beneficiary Name",
        "Beneficiary Account Number",
        "IFSC Code",
        "Amount",
        "Description/Purpose",
        "Mode of Payment",
      );
      data.push(
        ...loans.map((loan) => {
          const user = loan.user;
          const bankAccount = getPrimaryBankAccount(user);

          return {
            "Beneficiary Name": getFullName(user),
            "Beneficiary Account Number": `="${String(bankAccount.accountNumber ?? "")}"`,
            "IFSC Code": bankAccount.ifscCode ?? "",
            Amount: loan.disbursement?.netAmount ?? 0,
            "Description/Purpose": "Loan Disbursement",
            "Mode of Payment": "NEFT",
          };
        }),
      );
    }

    if (
      fileType === LoanXlsxFileType.BENEFICIARY &&
      bank === BrandBankAccountType.HDFC_BANK
    ) {
      headers.push(
        "Beneficiary Name",
        "Beneficiary Account Number",
        "IFSC Code",
        "Beneficiary Daily Payout limit",
      );
      data.push(
        ...loans.map((loan) => {
          const user = loan.user;
          const bankAccount = getPrimaryBankAccount(user);

          return {
            "Beneficiary Name": getFullName(user),
            "Beneficiary Account Number": `="${String(bankAccount.accountNumber ?? "")}"`,
            "IFSC Code": bankAccount.ifscCode ?? "",
            "Beneficiary Daily Payout limit": 0,
          };
        }),
      );
    }

    // ---------------------------- BANDHAN BANK ----------------------------

    if (
      fileType === LoanXlsxFileType.PAYOUT &&
      bank === BrandBankAccountType.BANDHAN_BANK
    ) {
      headers.push(
        "Payment Date",
        "Payment Type",
        "Cust Ref Number",
        "Source Account Number",
        "Source Narration",
        "Destination Account Number",
        "Currency",
        "Amount",
        "Destination Narration",
        "Destination bank",
        "Destination Bank Routing Code",
        "Beneficiary Name",
        "Beneficiary Code",
        "Beneficiary Account Type",
      );
      data.push(
        ...loans.map((loan, index) => {
          const user = loan.user;
          const bankAccount = getPrimaryBankAccount(user);

          return {
            "Payment Date": new Date().toISOString().split("T")[0],
            "Payment Type": "NEFT",
            "Cust Ref Number": `CUST${loan.userId}`,
            "Source Account Number": `="${String(brandBankAccount.accountNumber)}"`,
            "Source Narration": "Loan Disbursement",
            "Destination Account Number": `="${String(bankAccount.accountNumber ?? "")}"`,
            Currency: "INR",
            Amount: loan.disbursement?.netAmount ?? 0,
            "Destination Narration": "Loan Disbursement",
            "Destination bank": "",
            "Destination Bank Routing Code": bankAccount.ifscCode ?? "",
            "Beneficiary Name": getFullName(user),
            "Beneficiary Code": `BEN${index + 1}`,
            "Beneficiary Account Type": "",
          };
        }),
      );
    }

    if (
      fileType === LoanXlsxFileType.BENEFICIARY &&
      bank === BrandBankAccountType.BANDHAN_BANK
    ) {
      throw new BadRequestException(
        `Beneficiary file type is not supported for ${bank} bank`,
      );
    }

    // ---------------------------- ICICI BANK ----------------------------

    if (
      fileType === LoanXlsxFileType.PAYOUT &&
      bank === BrandBankAccountType.ICICI_BANK
    ) {
      // ICICI Bank expects CSV format
      const today = _dayjs().format("MM-DD-YYYY");

      // CSV Headers
      const csvHeaders = [
        "PYMT_PROD_TYPE_CODE",
        "PYMT_MODE",
        "DEBIT_ACC_NO",
        "BNF_NAME",
        "BENE_ACC_NO",
        "BENE_IFSC",
        "AMOUNT",
        "DEBIT_NARR",
        "CREDIT_NARR",
        "MOBILE_NUM",
        "EMAIL_ID",
        "REMARK",

        "PYMT_DATE",
        "REF_NO",
        "ADDL_INFO1",
        "ADDL_INFO2",
        "ADDL_INFO3",
        "ADDL_INFO4",
        "ADDL_INFO5",
      ];

      // CSV Rows
      const csvRows = loans.map((loan) => {
        const user = loan.user;
        const bankAccount = getPrimaryBankAccount(user);
        const amount = loan.disbursement?.netAmount ?? 0;

        // Determine payment mode based on amount
        // RTGS for amounts >= 2 lakhs, NEFT for less , if same bank then FT
        const paymentMode =
          amount >= 200000
            ? "RTGS"
            : user?.user_bank_account?.[0]?.bankName === "ICICI Bank"
              ? "FT"
              : "IMPS";
        const mobileNum = user.phoneNumber
          ? user.phoneNumber.replace(/^(\+91|91)/, "").replace(/\D/g, "")
          : "";

        const loanReference = loan.formattedLoanId || loan.id.slice(0, 8);

        return [
          "PAB_VENDOR",
          paymentMode,
          `="${String(brandBankAccount.accountNumber)}"`,
          getFullName(user),
          `="${String(bankAccount.accountNumber ?? "")}"`,
          bankAccount.ifscCode ?? "",
          amount,
          `${loanReference}`,
          `${loanReference}`,
          mobileNum,
          user?.email ?? "",
          `${loanReference}`,

          today,
          loanReference,
          "",
          "",
          "",
          "",
          "",
        ]
          .map((value) => {
            // Escape values containing commas, quotes, or newlines
            const strValue = String(value);
            if (
              strValue.includes(",") ||
              strValue.includes('"') ||
              strValue.includes("\n")
            ) {
              return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
          })
          .join(",");
      });

      // Combine headers and rows
      const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
      const csvBuffer = Buffer.from(csvContent, "utf-8");

      const uploadedFile = await this.awsS3Service.uploadBufferToS3(
        csvBuffer,
        brandId,
        "-all-users",
        "text/csv",
        {
          originalname: `loan_${fileType}_${brandId}_${Date.now()}.csv`,
        },
        "bank-statement",
      );

      for (const loan of loans) {
        await this.prisma.loanXlsxFile.create({
          data: {
            loanId: loan.id,
            brandId: brandId,
            fileType: fileType,
            filePrivateUrl: uploadedFile.key ?? "",
            fileName: `loan_${fileType}_${brandId}_${Date.now()}.csv`,
            uploadedAt: new Date(),
          },
        });
      }

      return uploadedFile;
    }

    if (
      fileType === LoanXlsxFileType.BENEFICIARY &&
      bank === BrandBankAccountType.ICICI_BANK
    ) {
      throw new BadRequestException(
        `Beneficiary file type is not supported for ${bank} bank`,
      );
    }

    // ---------------------------- IDFC BANK ----------------------------

    if (
      fileType === LoanXlsxFileType.PAYOUT &&
      bank === BrandBankAccountType.IDFC_BANK
    ) {
      headers.push(
        "Client Code",
        "Debit account no.",
        "Transaction type code",
        "Value date",
        "Amount",
        "Beneficary Name",
        "Beneficary Accunt no.",
        "IFSC code",
        "Customer Ref no.",
        "Beneficary email id",
        "Beneficiary mobile no.",
        "Remarks",
        "Payment Type",
        "Purpose code",
        "Bene a/c type",
        "Payable Location",
        "Print branch name",
        "Mode of delivery",
        "Transaction currency",
        "BENE_ADD1",
        "BENE_ADD2",
        "BENE_ADD3",
        "BENE_ADD4",
        "BENE_ID",
      );

      const today = _dayjs().format("DD-MM-YYYY");

      data.push(
        ...loans.map((loan, index) => {
          const user = loan.user;
          const bankAccount = getPrimaryBankAccount(user);
          const userDetails = user?.userDetails;
          const amount = loan.disbursement?.netAmount ?? 0;
          // Determine payment mode based on amount
          // RTGS for amounts >= 2 lakhs, NEFT for less , if same bank then FT
          const paymentMode =
            amount >= 200000
              ? "RTGS"
              : user?.user_bank_account?.[0]?.bankName === "ICICI Bank"
                ? "FT"
                : "IMPS";
          return {
            "Client Code": "IFSPL",
            "Debit account no.": `="${String(brandBankAccount.accountNumber)}"`,
            "Transaction type code": "LBT",
            "Value date": today,
            Amount: loan.disbursement?.netAmount ?? 0,
            "Beneficary Name": getFullName(user),
            "Beneficary Accunt no.": `="${String(bankAccount.accountNumber ?? "")}"`,
            "IFSC code": bankAccount.ifscCode ?? "",
            "Customer Ref no.": `${loan.formattedLoanId}`,
            "Beneficary email id": user?.email ?? "",
            "Beneficiary mobile no.": user?.phoneNumber
              ? user?.phoneNumber.replace(/^(\+91|91)/, "").replace(/\D/g, "")
              : "",
            Remarks: `${loan.formattedLoanId || loan.id.slice(0, 8)} - Loan Disbursement-${loan.disbursement?.netAmount ?? 0
              }`,
            "Payment Type": paymentMode,
            "Purpose code": "CMS",
            "Bene a/c type": "11",
            "Payable Location": "",
            "Print branch name": "",
            "Mode of delivery": "",
            "Transaction currency": "INR",
            BENE_ADD1: "",
            BENE_ADD2: "",
            BENE_ADD3: "",
            BENE_ADD4: "",
            BENE_ID: "",
          };
        }),
      );
    }

    if (
      fileType === LoanXlsxFileType.BENEFICIARY &&
      bank === BrandBankAccountType.IDFC_BANK
    ) {
      throw new BadRequestException(
        `Beneficiary file type is not supported for ${bank} bank`,
      );
    }

    // ---------------------------- Excel Generation ----------------------------

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Loan Sheet");

    worksheet.addRow(headers);
    data.forEach((row) => worksheet.addRow(Object.values(row)));

    const uint8Array = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(uint8Array);

    const excelFile: Express.Multer.File = {
      buffer,
      mimetype:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      originalname: `loan_${fileType}_${brandId}_${Date.now()}.xlsx`,
      fieldname: "",
      encoding: "7bit",
      size: buffer.length,
      stream: null,
      destination: "",
      filename: "",
      path: "",
    };

    const uploadedFile = await this.awsS3Service.uploadBufferToS3(
      excelFile.buffer,
      brandId,
      "-all-users",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      {
        originalname: excelFile.originalname,
      },
      "bank-statement",
    );

    for (const loan of loans) {
      await this.prisma.loanXlsxFile.create({
        data: {
          loanId: loan.id,
          brandId: brandId,
          fileType: fileType,
          filePrivateUrl: uploadedFile.key ?? "",
          fileName: excelFile.originalname,
          uploadedAt: new Date(),
        },
      });
    }

    return uploadedFile;
  }

  async generateLoanXlsx(
    brandId: string,
    loanIds: string[],
    brandBankAccountId: string,
    fileType: LoanXlsxFileType,
  ) {
    if (!brandId || !loanIds.length || !brandBankAccountId) {
      throw new BadRequestException(
        "BrandId, loanIds, and BrandBankAccountId are required",
      );
    }

    const [loans, brandBankAccount] = await Promise.all([
      this.prisma.loan.findMany({
        where: { id: { in: loanIds }, brandId },
        include: {
          disbursement: true,
          user: {
            include: {
              userDetails: true,
              user_bank_account: {
                where: { isPrimary: true },
              },
            },
          },
        },
      }),
      this.prisma.brandBankAccount.findFirst({
        where: { id: brandBankAccountId, brandId },
      }),
    ]);

    if (!loans.length) throw new BadRequestException("No loans found");
    if (!brandBankAccount)
      throw new BadRequestException("Brand bank account not found");

    const bank = brandBankAccount?.type;
    if (!bank) {
      throw new BadRequestException("type is required");
    }

    const headers: string[] = [];
    const data: any[] = [];

    const getFullName = (user) => {
      const {
        firstName = "",
        middleName = "",
        lastName = "",
      } = user?.userDetails || {};

      // Normalize values and remove null/undefined
      let parts = [firstName, middleName, lastName]
        .map((p) => (p ? p.trim() : "")) // Handle null/undefined
        .filter(Boolean) // Remove empty strings
        .filter((p) => !/brand(s)?/i.test(p)); // Remove "brand" or "brands" (case-insensitive)

      return parts.length > 0 ? parts.join(" ") : "N/A";
    };

    const getPrimaryBankAccount = (user) => user?.user_bank_account?.[0] || {};

    // ---------------------------- INDUSIND BANK ----------------------------

    if (
      fileType === LoanXlsxFileType.BENEFICIARY &&
      bank === BrandBankAccountType.INDUSIND_BANK
    ) {
      headers.push(
        "BenCode",
        "BenName",
        "Address1",
        "Address2",
        "City",
        "State",
        "Zip_Code",
        "Phone",
        "Email",
        "Beneficiary Account No.",
        "Input Only Internal Fund Transfer Account no.",
        "Delivery_Address1",
        "Delivery_Address2",
        "Delivery_City",
        "Delivery_State",
        "Delivery_Zip_Code",
        "PrintLocation",
        "CustomerID",
        "IFSC",
        "MailTo",
        "NEFT",
        "RTGS",
        "CHQ",
        "DD",
        "IFTO",
        "FirstLinePrint",
        "IMPS",
      );

      data.push(
        ...loans.map((loan, index) => {
          const user = loan.user;
          const userDetails = user?.userDetails;
          if (!userDetails) {
            throw new BadRequestException("User details not found");
          }
          const bankAccount = getPrimaryBankAccount(user);

          return {
            BenCode: `BEN${index + 1}`,
            BenName: getFullName(user),
            Address1: userDetails.address ?? "",
            Address2: "",
            City: userDetails.city ?? "",
            State: userDetails.state ?? "",
            Zip_Code: userDetails.pincode ?? "",
            Phone: user?.phoneNumber ?? "",
            Email: user?.email ?? "",
            "Beneficiary Account No.": `${bankAccount.accountNumber ?? ""}`,
            "Input Only Internal Fund Transfer Account no.": "",
            Delivery_Address1: userDetails.address ?? "",
            Delivery_Address2: "",
            Delivery_City: userDetails.city ?? "",
            Delivery_State: userDetails.state ?? "",
            Delivery_Zip_Code: userDetails.pincode ?? "",
            PrintLocation: "",
            CustomerID: `${user?.id ?? ""}`,
            IFSC: bankAccount.ifscCode ?? "",
            MailTo: user?.email ?? "",
            NEFT: "Y",
            RTGS: "Y",
            CHQ: "N",
            DD: "N",
            IFTO: "Y",
            FirstLinePrint: "Y",
            IMPS: "Y",
          };
        }),
      );
    }

    if (
      fileType === LoanXlsxFileType.PAYOUT &&
      bank === BrandBankAccountType.INDUSIND_BANK
    ) {
      headers.push(
        "Debit Account",
        "Value Date",
        "Transaction Type",
        "Customer Ref No",
        "Beneficiary Code",
        "Beneficiary Name",
        "Beneficiary A/c No.",
        "IFSC Code",
        "Transaction Amount",
        "Beneficiary Email ID",
        "Beneficiary Mobile No",
        "Payment Details 1",
        "Source Narration",
        "Target Narration",
        "Remitter LEI Information",
        "Beneficiary LEI Information",
      );

      const today = new Date().toISOString().split("T")[0];

      data.push(
        ...loans.map((loan, index) => {
          const user = loan.user;
          const bankAccount = getPrimaryBankAccount(user);

          return {
            "Debit Account": `${brandBankAccount.accountNumber}`,
            "Value Date": today,
            "Transaction Type": "NEFT",
            "Customer Ref No": `CUST${loan.userId}`,
            "Beneficiary Code": `BEN${index + 1}`,
            "Beneficiary Name": getFullName(user),
            "Beneficiary A/c No.": `${bankAccount.accountNumber ?? ""}`,
            "IFSC Code": bankAccount.ifscCode ?? "",
            "Transaction Amount": loan.disbursement?.netAmount ?? 0,
            "Beneficiary Email ID": user?.email ?? "",
            "Beneficiary Mobile No": user?.phoneNumber ?? "",
            "Payment Details 1": "Loan Disbursement",
            "Source Narration": "Loan Disbursement",
            "Target Narration": "Loan Disbursement",
            "Remitter LEI Information": "",
            "Beneficiary LEI Information": "",
          };
        }),
      );
    }

    // ---------------------------- HDFC BANK ----------------------------

    if (
      fileType === LoanXlsxFileType.PAYOUT &&
      bank === BrandBankAccountType.HDFC_BANK
    ) {
      headers.push(
        "Beneficiary Name",
        "Beneficiary Account Number",
        "IFSC Code",
        "Amount",
        "Description/Purpose",
        "Mode of Payment",
      );
      data.push(
        ...loans.map((loan) => {
          const user = loan.user;
          const bankAccount = getPrimaryBankAccount(user);

          return {
            "Beneficiary Name": getFullName(user),
            "Beneficiary Account Number": `${bankAccount.accountNumber ?? ""}`,
            "IFSC Code": bankAccount.ifscCode ?? "",
            Amount: loan.disbursement?.netAmount ?? 0,
            "Description/Purpose": "Loan Disbursement",
            "Mode of Payment": "NEFT",
          };
        }),
      );
    }

    if (
      fileType === LoanXlsxFileType.BENEFICIARY &&
      bank === BrandBankAccountType.HDFC_BANK
    ) {
      headers.push(
        "Beneficiary Name",
        "Beneficiary Account Number",
        "IFSC Code",
        "Beneficiary Daily Payout limit",
      );
      data.push(
        ...loans.map((loan) => {
          const user = loan.user;
          const bankAccount = getPrimaryBankAccount(user);

          return {
            "Beneficiary Name": getFullName(user),
            "Beneficiary Account Number": `${bankAccount.accountNumber ?? ""}`,
            "IFSC Code": bankAccount.ifscCode ?? "",
            "Beneficiary Daily Payout limit": 0,
          };
        }),
      );
    }

    // ---------------------------- BANDHAN BANK ----------------------------

    if (
      fileType === LoanXlsxFileType.PAYOUT &&
      bank === BrandBankAccountType.BANDHAN_BANK
    ) {
      headers.push(
        "Payment Date",
        "Payment Type",
        "Cust Ref Number",
        "Source Account Number",
        "Source Narration",
        "Destination Account Number",
        "Currency",
        "Amount",
        "Destination Narration",
        "Destination bank",
        "Destination Bank Routing Code",
        "Beneficiary Name",
        "Beneficiary Code",
        "Beneficiary Account Type",
      );
      data.push(
        ...loans.map((loan, index) => {
          const user = loan.user;
          const bankAccount = getPrimaryBankAccount(user);

          return {
            "Payment Date": new Date().toISOString().split("T")[0],
            "Payment Type": "NEFT",
            "Cust Ref Number": `CUST${loan.userId}`,
            "Source Account Number": `${brandBankAccount.accountNumber}`,
            "Source Narration": "Loan Disbursement",
            "Destination Account Number": `${bankAccount.accountNumber ?? ""}`,
            Currency: "INR",
            Amount: loan.disbursement?.netAmount ?? 0,
            "Destination Narration": "Loan Disbursement",
            "Destination bank": "",
            "Destination Bank Routing Code": bankAccount.ifscCode ?? "",
            "Beneficiary Name": getFullName(user),
            "Beneficiary Code": `BEN${index + 1}`,
            "Beneficiary Account Type": "",
          };
        }),
      );
    }

    if (
      fileType === LoanXlsxFileType.BENEFICIARY &&
      bank === BrandBankAccountType.BANDHAN_BANK
    ) {
      throw new BadRequestException(
        `Beneficiary file type is not supported for ${bank} bank`,
      );
    }

    // ---------------------------- ICICI BANK ----------------------------

    if (
      fileType === LoanXlsxFileType.PAYOUT &&
      bank === BrandBankAccountType.ICICI_BANK
    ) {
      headers.push(
        "PYMT_PROD_TYPE_CODE",
        "PYMT_MODE",
        "DEBIT_ACC_NO",
        "BNF_NAME",
        "BENE_ACC_NO",
        "BENE_IFSC",
        "AMOUNT",
        "DEBIT_NARR",
        "CREDIT_NARR",
        "MOBILE_NUM",
        "EMAIL_ID",
        "REMARK",
        "PYMT_DATE",
        "REF_NO",
        "ADDL_INFO1",
        "ADDL_INFO2",
        "ADDL_INFO3",
        "ADDL_INFO4",
        "ADDL_INFO5",
      );

      const today = _dayjs().format("MM-DD-YYYY");

      data.push(
        ...loans.map((loan) => {
          const user = loan.user;
          const bankAccount = getPrimaryBankAccount(user);
          const amount = loan.disbursement?.netAmount ?? 0;

          // Determine payment mode based on amount
          // RTGS for amounts >= 2 lakhs, NEFT for less , if same bank then FT
          const paymentMode =
            amount >= 200000
              ? "RTGS"
              : user?.user_bank_account?.[0]?.bankName === "ICICI Bank"
                ? "FT"
                : "IMPS";
          const mobileNum = user.phoneNumber
            ? user.phoneNumber.replace(/^(\+91|91)/, "").replace(/\D/g, "")
            : "";

          const loanReference = loan.formattedLoanId || loan.id.slice(0, 8);

          return {
            PYMT_PROD_TYPE_CODE: "PAB_VENDOR",
            PYMT_MODE: paymentMode,
            DEBIT_ACC_NO: `${brandBankAccount.accountNumber}`,
            BNF_NAME: getFullName(user),
            BENE_ACC_NO: `${bankAccount.accountNumber ?? ""}`,
            BENE_IFSC: bankAccount.ifscCode ?? "",
            AMOUNT: amount,
            DEBIT_NARR: loanReference,
            CREDIT_NARR: loanReference,
            MOBILE_NUM: mobileNum,
            EMAIL_ID: user?.email ?? "",
            REMARK: loanReference,
            PYMT_DATE: today,
            REF_NO: loanReference,
            ADDL_INFO1: "",
            ADDL_INFO2: "",
            ADDL_INFO3: "",
            ADDL_INFO4: "",
            ADDL_INFO5: "",
          };
        }),
      );
    }

    if (
      fileType === LoanXlsxFileType.BENEFICIARY &&
      bank === BrandBankAccountType.ICICI_BANK
    ) {
      throw new BadRequestException(
        `Beneficiary file type is not supported for ${bank} bank`,
      );
    }

    // ---------------------------- IDFC BANK ----------------------------

    if (
      fileType === LoanXlsxFileType.PAYOUT &&
      bank === BrandBankAccountType.IDFC_BANK
    ) {
      headers.push(
        "Client Code",
        "Debit account no.",
        "Transaction type code",
        "Value date",
        "Amount",
        "Beneficary Name",
        "Beneficary Accunt no.",
        "IFSC code",
        "Customer Ref no.",
        "Beneficary email id",
        "Beneficiary mobile no.",
        "Remarks",
        "Payment Type",
        "Purpose code",
        "Bene a/c type",
        "Payable Location",
        "Print branch name",
        "Mode of delivery",
        "Transaction currency",
        "BENE_ADD1",
        "BENE_ADD2",
        "BENE_ADD3",
        "BENE_ADD4",
        "BENE_ID",
      );

      const today = _dayjs().format("DD-MM-YYYY");

      data.push(
        ...loans.map((loan) => {
          const user = loan.user;
          const bankAccount = getPrimaryBankAccount(user);
          const userDetails = user?.userDetails;
          const amount = loan.disbursement?.netAmount ?? 0;
          // Determine payment mode based on amount
          // RTGS for amounts >= 2 lakhs, NEFT for less , if same bank then FT
          const paymentMode =
            amount >= 200000
              ? "RTGS"
              : user?.user_bank_account?.[0]?.bankName === "ICICI Bank"
                ? "FT"
                : "IMPS";
          return {
            "Client Code": "IFSPL",
            "Debit account no.": `${brandBankAccount.accountNumber}`,
            "Transaction type code": "LBT",
            "Value date": today,
            Amount: loan.disbursement?.netAmount ?? 0,
            "Beneficary Name": getFullName(user),
            "Beneficary Accunt no.": `${bankAccount.accountNumber ?? ""}`,
            "IFSC code": bankAccount.ifscCode ?? "",
            "Customer Ref no.": ``,
            "Beneficary email id": user?.email ?? "",
            "Beneficiary mobile no.": user?.phoneNumber
              ? user?.phoneNumber.replace(/^(\+91|91)/, "").replace(/\D/g, "")
              : "",

            Remarks: `${loan.formattedLoanId || loan.id.slice(0, 8)} - Loan Disbursement-${loan.disbursement?.netAmount ?? 0
              }`,
            "Payment Type": paymentMode,
            "Purpose code": "CMS",
            "Bene a/c type": "11",
            "Payable Location": "",
            "Print branch name": "",
            "Mode of delivery": "",
            "Transaction currency": "INR",
            BENE_ADD1: "",
            BENE_ADD2: "",
            BENE_ADD3: "",
            BENE_ADD4: "",
            BENE_ID: "",
          };
        }),
      );
    }

    if (
      fileType === LoanXlsxFileType.BENEFICIARY &&
      bank === BrandBankAccountType.IDFC_BANK
    ) {
      throw new BadRequestException(
        `Beneficiary file type is not supported for ${bank} bank`,
      );
    }

    // ---------------------------- Excel Generation ----------------------------

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("disbursement sheet");

    worksheet.addRow(headers);
    data.forEach((row) => worksheet.addRow(Object.values(row)));

    const uint8Array = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.from(uint8Array);

    const excelFile: Express.Multer.File = {
      buffer,
      mimetype:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      originalname: `loan_${fileType}_${brandId}_${Date.now()}.xlsx`,
      fieldname: "",
      encoding: "7bit",
      size: buffer.length,
      stream: null,
      destination: "",
      filename: "",
      path: "",
    };

    const uploadedFile = await this.awsS3Service.uploadBufferToS3(
      excelFile.buffer,
      brandId,
      "-all-users",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      {
        originalname: excelFile.originalname,
      },
      "bank-statement",
    );

    for (const loan of loans) {
      await this.prisma.loanXlsxFile.create({
        data: {
          loanId: loan.id,
          brandId: brandId,
          fileType: fileType,
          filePrivateUrl: uploadedFile.key ?? "",
          fileName: excelFile.originalname,
          uploadedAt: new Date(),
        },
      });
    }

    return uploadedFile;
  }

  async generateLoanNoDueCertificate(
    brandId: string,
    loanId: string,
    isAutoGenerate = false,
  ) {
    if (!brandId || !loanId) {
      throw new BadRequestException("brandId and loanId are required.");
    }
    const loan = await this.getLoanById(loanId);

    if (!loan) {
      throw new BadRequestException("Loan not found.");
    }
    if (
      loan.status !== loan_status_enum.COMPLETED &&
      loan.status !== loan_status_enum.SETTLED &&
      loan.status !== loan_status_enum.WRITE_OFF
    ) {
      throw new BadRequestException(
        `Loan is in ${loan.status} status. No dues certificate can be generated only for COMPLETED loans.`,
      );
    }
    let pdfType = "no-due-certificates-pdf";
    let certificateType: certificate_type_enum =
      certificate_type_enum.NO_DUE_LETTER;

    if (loan.status === loan_status_enum.WRITE_OFF) {
      certificateType = certificate_type_enum.WRITE_OFF_LETTER;
      pdfType = "write-off-certificates-pdf";
    } else if (loan.status === loan_status_enum.SETTLED) {
      pdfType = "settlement-certificates-pdf";
      certificateType = certificate_type_enum.SETTLEMENT_LETTER;
    } else {
      pdfType = "no-due-certificates-pdf";
      certificateType = certificate_type_enum.NO_DUE_LETTER;
    }

    if (loan.noDueCertificate) {
      return loan.noDueCertificate;
    }

    // Get brand details and config for dynamic values
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        brandDetails: {
          select: {
            lenderName: true,
            contactEmail: true,
            contactPhone: true,
          },
        },
        brandConfig: {
          select: {
            loanNoDueCertificateHeader: true,
            loanNoDueCertificateFooter: true,
            noDueCopyRecipients: true,
          },
        },
      },
    });

    if (!brand) {
      throw new BadRequestException("Brand not found.");
    }

    // Utility to build full name
    function getFullName(userDetails: {
      firstName: string;
      middleName?: string;
      lastName?: string;
    }): string {
      return [
        userDetails.firstName,
        userDetails.middleName,
        userDetails.lastName,
      ]
        .filter(Boolean)
        .join(" ");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: loan.userId },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        formattedUserId: true,
        userDetails: {
          select: {
            firstName: true,
            middleName: true,
            address: true,
            lastName: true,
          },
        },
      },
    });
    if (!user) {
      throw new BadRequestException("User not found.");
    }

    const fullName = getFullName(user.userDetails);

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

    const paymentDate =
      partialPayment?.status === TransactionStatusEnum.SUCCESS
        ? formatDate(
          successfulPartialTransactions.at(-1)?.completedAt || "",
          "DD/MM/YYYY",
        )
        : paymentRequests?.status === TransactionStatusEnum.SUCCESS
          ? formatDate(
            successfulTransactions.at(-1)?.completedAt || "",
            "DD/MM/YYYY",
          )
          : "#########";
    const paidAmount =
      (successfulTransactions || []).reduce(
        (sum, tx) => sum + (tx.amount?.toNumber?.() || 0),
        0,
      ) +
      (successfulPartialTransactions || []).reduce(
        (sum, tx) => sum + (tx.amount?.toNumber?.() || 0),
        0,
      );
    const certificateId = generateCertificateId(
      user.formattedUserId,
      certificateType,
    );

    // Use dynamic values from brand configuration
    const lenderName = brand.brandDetails?.lenderName || brand.name || "";
    const supportEmail = brand.brandDetails?.contactEmail || "";
    const supportPhone = brand.brandDetails?.contactPhone || "";

    const pdfUrl = await this.pdfService.generatePdfFromTemplate(
      {
        brandId: brandId,
        userId: user.id,
        lenderName: lenderName,
        customerAddress: user.userDetails.address || "N/A",
        customerName: fullName,
        loanId: loan.formattedLoanId || "N/A",
        loanAmount: loan.amount?.toLocaleString("en-IN") || "N/A",
        paidAmount: paidAmount.toLocaleString("en-IN") || "N/A",
        startDate: loan.disbursementDate
          ? loan.disbursementDate.toISOString().split("T")[0]
          : "N/A",
        closureDate: paymentDate ? paymentDate : "N/A",
        supportEmail: supportEmail,
        supportPhone: supportPhone,
        certificateId: certificateId,
        headerImageUrl: brand.brandConfig?.loanNoDueCertificateFooter || null,
        footerImageUrl: brand.brandConfig?.loanNoDueCertificateFooter || null,
      },

      pdfType,
      platform_type.PARTNER,
    );
    return this.prisma.loanNoDueCertificate.create({
      data: {
        loanId: loan.id,
        issuedDate: new Date(),
        issuedBy: "System (Auto)", // Update issuedBy
        recipientEmail: user.email,
        remarks: `This certificate was generated later for loan ${loan.formattedLoanId || loan.id} (type: ${certificateType}). 
        ${new Date().toISOString().split("T")[0]}`,
        certificateFileUrl: pdfUrl,
        updatedAt: new Date(),
        formattedNoDueId: certificateId,
        certificateType: certificateType,
      },
    });
  }

  async sendNoDueCertificateEmail(
    brandId: string,
    loanId: string,
    partnerUserId: string,
    isAutoSend: boolean = false,
  ) {
    if (!brandId || !loanId) {
      throw new BadRequestException("Both brandId and loanId are required.");
    }

    const loan = await this.getLoanById(loanId);
    if (!loan) {
      throw new BadRequestException("Loan not found.");
    }
    if (!loan.noDueCertificate) {
      const loanNoDueCertificate = await this.generateLoanNoDueCertificate(
        brandId,
        loanId,
        isAutoSend,
      );
      loan.noDueCertificate = loanNoDueCertificate;
    }

    if (loan?.noDueCertificate.sentAt) {
      throw new BadRequestException(
        "No Due Certificate has already been sent for this loan.",
      );
    }

    if (
      loan.status !== loan_status_enum.COMPLETED &&
      loan.status !== loan_status_enum.SETTLED &&
      loan.status !== loan_status_enum.WRITE_OFF
    ) {
      throw new BadRequestException(
        `Loan is in ${loan.status} status. No dues certificate can be generated only for COMPLETED loans.`,
      );
    }
    let emailType = "no-due-certificate";
    let certificateType: certificate_type_enum =
      certificate_type_enum.NO_DUE_LETTER;

    if (loan.status === loan_status_enum.WRITE_OFF) {
      certificateType = certificate_type_enum.WRITE_OFF_LETTER;
      emailType = "writeoff_letter_v1";
    } else if (loan.status === loan_status_enum.SETTLED) {
      emailType = "settlement_letter_v1";
      certificateType = certificate_type_enum.SETTLEMENT_LETTER;
    } else {
      emailType = "no-due-certificates-pdf";
      certificateType = certificate_type_enum.NO_DUE_LETTER;
    }

    if (!loan) {
      throw new BadRequestException("Loan not found.");
    }

    const brandConfig = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        id: true,
        name: true,
        brandDetails: {
          select: {
            lenderName: true,
            contactEmail: true,
            contactPhone: true,
          },
        },
        brandConfig: {
          select: {
            noDueCopyRecipients: true,
          },
        },
      },
    });

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

    const paymentDate =
      partialPayment?.status === TransactionStatusEnum.SUCCESS
        ? formatDate(
          successfulPartialTransactions.at(-1)?.completedAt || "",
          "DD/MM/YYYY",
        )
        : paymentRequests?.status === TransactionStatusEnum.SUCCESS
          ? formatDate(
            successfulTransactions.at(-1)?.completedAt || "",
            "DD/MM/YYYY",
          )
          : "#########";
    const paidAmount =
      (successfulTransactions || []).reduce(
        (sum, tx) => sum + (tx.amount?.toNumber?.() || 0),
        0,
      ) +
      (successfulPartialTransactions || []).reduce(
        (sum, tx) => sum + (tx.amount?.toNumber?.() || 0),
        0,
      );

    const user = await this.prisma.user.findUnique({
      where: { id: loan.userId },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        formattedUserId: true,
        userDetails: {
          select: {
            firstName: true,
            middleName: true,
            lastName: true,
            state: true,
            city: true,
            address: true,
            pincode: true,
          },
        },
      },
    });

    if (!user) {
      throw new BadRequestException("Associated user not found.");
    }
    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        brandDetails: {
          select: {
            lenderName: true,
            contactEmail: true,
            contactPhone: true,
          },
        },
        brandConfig: {
          select: {
            loanNoDueCertificateHeader: true,
            loanNoDueCertificateFooter: true,
            noDueCopyRecipients: true,
          },
        },
      },
    });
    if (!brand) {
      throw new BadRequestException("Brand not found.");
    }

    // Build full name safely
    const userDetails = user.userDetails;
    const fullName =
      [userDetails?.firstName, userDetails?.middleName, userDetails?.lastName]
        .filter(Boolean)
        .join(" ") || "User";

    // Use dynamic values from brand configuration
    const lenderName = brand.brandDetails?.lenderName || brand.name || "";
    const supportEmail = brand.brandDetails?.contactEmail || "";
    const supportPhone = brand.brandDetails?.contactPhone || "";

    // Prepare email data
    const data = {
      lenderName: lenderName,
      customerAddress: user.userDetails.address || "N/A",
      customerName: fullName,
      loanId: loan.formattedLoanId || "N/A",
      loanAmount: loan.amount?.toLocaleString("en-IN") || "N/A",
      paidAmount: paidAmount.toLocaleString("en-IN") || "N/A",
      startDate: loan.disbursementDate
        ? loan.disbursementDate.toISOString().split("T")[0]
        : "N/A",
      closureDate: paymentDate || "N/A",
      supportEmail: supportEmail,
      supportPhone: supportPhone,
      certificateId: loan.noDueCertificate.formattedNoDueId,
      headerImageUrl: brand.brandConfig?.loanNoDueCertificateHeader || null,
      footerImageUrl: brand.brandConfig?.loanNoDueCertificateFooter || null,
    };

    const templateName = emailType;
    const basePath = this.isDev
      ? path.join(process.cwd(), "src", "templates", "partner", "ejs")
      : path.join(process.cwd(), "src", "templates", "partner", "ejs");

    const templatePath = path.join(basePath, `${templateName}.ejs`);
    const htmlContent = await ejs.renderFile(templatePath, data);

    // Step 1: Download PDF
    const response = await axios.get(
      loan.noDueCertificate?.certificateFileUrl,
      { responseType: "arraybuffer" },
    );
    const pdfBase64 = Buffer.from(response.data).toString("base64");
    const attachments = loan.noDueCertificate?.certificateFileUrl
      ? [
        {
          filename: `${certificateType.replace(/_/g, "-").toLowerCase()}-${loan.formattedLoanId || loan.id}.pdf`,
          content: pdfBase64, // binary buffer
          contentType: "application/pdf",
        },
      ]
      : [];

    if (this.isDev) {
      return { status: true, message: "Email preview logged to console." };
    }

    const emailResult = await this.emailService.sendEmail({
      to: user.email,
      name: fullName,
      subject: `${certificateType.replace(/_/g, " ")} for Loan ${loan.formattedLoanId || loan.id}`,
      html: htmlContent,
      attachments,
    });
    if (
      loan.status !== loan_status_enum.WRITE_OFF &&
      loan.status !== loan_status_enum.SETTLED &&
      loan.status !== loan_status_enum.COMPLETED
    ) {
      throw new BadRequestException(
        `Loan is in ${loan.status} status. No dues certificate can be sent only for COMPLETED, SETTLED or WRITE_OFF loans.`,
      );
    }

    try {
      const noDueCopyRecipients = brandConfig.brandConfig.noDueCopyRecipients
        .split(",")
        .map((email) => email.trim());

      await Promise.all(
        noDueCopyRecipients
          .filter((email) => email) // skip empty ones
          .map((recipientEmail) =>
            this.emailService.sendEmail({
              to: recipientEmail,
              name: fullName,
              subject: `${certificateType.replace(/_/g, " ")} for Loan ${loan.formattedLoanId || loan.id}`,
              html: htmlContent,
              attachments,
            }),
          ),
      );
    } catch (error) {
      console.error("Error sending No Dues Certificate copy emails:", error);
    }

    if (!emailResult) {
      throw new BadRequestException(
        "Failed to send No Dues Certificate email.",
      );
    }

    await this.prisma.loanNoDueCertificate.update({
      where: { loanId: loan.id },
      data: {
        recipientEmail: user.email,
        sentAt: new Date(),
        remarks: `Sent to ${user.email} by ${isAutoSend ? "System (Auto)" : partnerUserId
          } on ${new Date().toISOString().split("T")[0]} 
        for loan ${loan.formattedLoanId || loan.id} (type: ${certificateType}).
       current status: ${loan.status}`,
      },
    });
    return {
      status: true,
    };
  }

  async getTenuresByRuleId(brandId: string, loanRuleId: string) {
    if (!brandId || !loanRuleId) {
      throw new BadRequestException("Brand ID and Loan Rule ID are required.");
    }
    const tenures = await this.prisma.tenure.findMany({
      where: {
        loanRuleId: loanRuleId,
      },
      include: {
        loanPenalty: true,
      },
    });
    return tenures;
  }

  async updateLoanStatus(
    partnerUserId: string | null,
    data: UpdateLoanStatusDto,
  ) {
    const loan = await this.prisma.loan.findUnique({
      where: {
        id: data.loanId,
      },
      include: {
        allottedPartners: {
          include: {
            partnerUser: true,
          },
        },
        user: {
          include: {
            userDetails: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            user_bank_account: {
              where: {
                isPrimary: true,
                verificationStatus: user_bank_verification_status.VERIFIED,
              },
            },
            userReloans: {
              where: {
                status: ReloanStatus.PENDING,
              },
            },
            documents: {
              where: {
                status: document_status_enum.APPROVED,
              },
              select: {
                documentNumber: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!loan) {
      throw new BadRequestException("Loan not found");
    }
    if (!loan?.id) {
      throw new BadRequestException("Invalid Loan ID");
    }

    const brandId = loan.brandId;
    if (!brandId) {
      throw new BadRequestException("Brand ID not found for the loan");
    }
    const brandConfig = await this.prisma.brandConfig.findUnique({
      where: {
        brandId: brandId,
      },
      select: {
        id: true,
        is_cam_calculation_required: true,
      },
    });
    if (!brandConfig) {
      throw new BadRequestException(
        "Brand configuration not found for the loan's brand",
      );
    }
    // get partner user details
    const partnerUser = partnerUserId
      ? await this.prisma.partnerUser.findUnique({
        where: {
          id: partnerUserId,
          reportsToId: {
            not: null,
          },
        },
      })
      : null;

    const newStatus: loan_status_enum = data.status;

    if (
      newStatus === loan_status_enum.CREDIT_EXECUTIVE_APPROVED ||
      newStatus === loan_status_enum.SANCTION_MANAGER_APPROVED ||
      newStatus === loan_status_enum.APPROVED ||
      newStatus === loan_status_enum.DISBURSED ||
      newStatus === loan_status_enum.ACTIVE
    ) {
      if (loan.user.user_bank_account.length === 0) {
        throw new BadRequestException(
          "User does not have a verified primary bank account.",
        );
      }
      if (loan.user.user_bank_account.length > 1) {
        throw new BadRequestException(
          "User has multiple verified primary bank accounts.",
        );
      }
    }
    const status_id = loan.user.status_id;
    if (
      (Number(status_id) === UserStatusEnum.BLOCKED ||
        Number(status_id) === UserStatusEnum.SUSPENDED) &&
      newStatus !== loan_status_enum.REJECTED &&
      newStatus !== loan_status_enum.PAID &&
      newStatus !== loan_status_enum.PARTIALLY_PAID &&
      newStatus !== loan_status_enum.COMPLETED &&
      newStatus !== loan_status_enum.SETTLED &&
      newStatus !== loan_status_enum.WRITE_OFF
    ) {
      throw new BadRequestException(
        "Cannot update loan status. The user is rejected. Please change the user status to active to proceed further.",
      );
    }
    if (
      newStatus === loan_status_enum.APPROVED ||
      newStatus === loan_status_enum.SANCTION_MANAGER_APPROVED ||
      newStatus === loan_status_enum.REJECTED
    ) {
      if (!data.reason) {
        throw new BadRequestException(
          "Reason is required for APPROVED or REJECTED status",
        );
      }
    }

    // if loan status is
    if (newStatus === loan_status_enum.CREDIT_EXECUTIVE_APPROVED) {
      if (partnerUser) {
        const validCreditExecutive = loan.allottedPartners.filter(
          (loan) => loan.partnerUserId === partnerUserId,
        );
        if (!validCreditExecutive.length) {
          throw new BadRequestException(
            `The loan is not under your bucket. Please request the sanction manager to reallocate it to you . currently allocated to ${loan.allottedPartners
              .map(
                (loan) =>
                  loan.partnerUser.name + " (" + loan.partnerUser.email + ")",
              )
              .join(", ")}`, // Use partnerUser.name for better clarity
          );
        }
      }
    }

    if (canUpdateLoanStatus(loan.status, newStatus)) {
      if (
        newStatus === loan_status_enum.CREDIT_EXECUTIVE_APPROVED ||
        newStatus === loan_status_enum.APPROVED ||
        newStatus === loan_status_enum.SANCTION_MANAGER_APPROVED ||
        newStatus === loan_status_enum.DISBURSED
      ) {
        if (newStatus === loan_status_enum.DISBURSED) {
          data.approvedLoanAmount = loan.amount;
        }
        const evaluation = await this.prisma.evaluation.findUnique({
          where: {
            userId_loanId: {
              userId: loan.userId,
              loanId: loan.id,
            },
          },
        });
        if (
          evaluation?.isBsaReportAvailable === false &&
          evaluation.isAaAvailable === false &&
          loan.forceBsaReportByPass !== true
        ) {
          throw new BadRequestException(
            "Loan cannot be approved as BSA report is not available",
          );
        }
        if (
          evaluation?.isCreditReportAvailable === false &&
          loan.forceCreditReportByPass !== true
        ) {
          throw new BadRequestException(
            "Loan cannot be approved as credit report is not available",
          );
        }
        if (
          evaluation?.is_cam_available === false &&
          loan.forceCreditReportByPass !== true &&
          loan.is_cam_calculation_required === true &&
          brandConfig.is_cam_calculation_required === true
        ) {
          throw new BadRequestException(
            "Loan cannot be approved as CAM report is not available",
          );
        }
        if (loan.user.documents.length < 2) {
          const requiredDocs = [DocumentTypeEnum.AADHAAR, DocumentTypeEnum.PAN];
          const userDocs = loan.user.documents.map((d) => d.type);

          const missingDocs = requiredDocs.filter(
            (doc) => !userDocs.includes(doc),
          );

          const message = [
            "Loan cannot be approved as user documents are not sufficient.",
            missingDocs.length > 0
              ? `Missing Documents: ${missingDocs.join(", ")}`
              : null,
          ]
            .filter(Boolean)
            .join(" ");
          throw new BadRequestException(message);
        }

        let evaluationInProgress = 0;
        if (evaluation?.id) {
          evaluationInProgress = await this.prisma.evaluation_item.count({
            where: {
              evaluationId: evaluation?.id,
              AND: {
                status: EligibilityStatusEnum.NOT_ELIGIBLE,
                override: false,
              },
            },
          });
        }

        if (evaluationInProgress > 0) {
          throw new BadRequestException(
            "Loan cannot be approved as evaluation is not completed or not eligible",
          );
        }
        if (!data.approvedLoanAmount) {
          throw new BadRequestException(
            "Approved loan amount is required when updating to APPROVED status",
          );
        }
        if (data.approvedLoanAmount && data.approvedLoanAmount <= 0) {
          throw new BadRequestException(
            "Approved loan amount must be greater than 0",
          );
        }
        if (
          data.approvedLoanAmount &&
          (newStatus === loan_status_enum.CREDIT_EXECUTIVE_APPROVED ||
            newStatus === loan_status_enum.SANCTION_MANAGER_APPROVED ||
            newStatus === loan_status_enum.APPROVED)
        ) {
          if (
            data.approvedDueDate &&
            new Date(data.approvedDueDate) < new Date()
          ) {
            throw new BadRequestException("Due date cannot be in the past");
          }
          // If rule type is changing, update it in the loan record
          if (loan.ruleType && loan.ruleType !== data?.ruleType) {
            await this.prisma.loan.update({
              where: {
                id: loan.id,
              },
              data: {
                ruleType: data.ruleType,
              },
            });
          }
          await this.loansService.updateLoanAmount(
            loan.userId,
            data.approvedLoanAmount,
            loan.id,
            data.approvedDueDate
              ? new Date(data.approvedDueDate).toISOString()
              : null,
          );
        }
      }

      if (newStatus === loan_status_enum.DISBURSED) {
        const disbursementDate = _dayjs(data.disbursementDate);

        // Today, yesterday, day before yesterday — all in the same timezone
        const today = _dayjs();
        const yesterday = today.subtract(1, "day");
        const dayBeforeYesterday = today.subtract(2, "day");

        // Normalize to YYYY-MM-DD for clean comparison
        const disbursedStr = disbursementDate.format("YYYY-MM-DD");
        const todayStr = today.format("YYYY-MM-DD");
        const yesterdayStr = yesterday.format("YYYY-MM-DD");
        const dayBeforeYesterdayStr = dayBeforeYesterday.format("YYYY-MM-DD");

        const isYesterdaySunday = yesterday.day() === 0; // Sunday = 0
        const isValidDisbursementDate =
          disbursedStr === todayStr ||
          disbursedStr === yesterdayStr ||
          (isYesterdaySunday && disbursedStr === dayBeforeYesterdayStr);

        if (!isValidDisbursementDate) {
          console.error("❌ Invalid disbursement date detected.");

          // throw new BadRequestException(
          //   `Disbursement date must be either today (${today.format("DD/MM/YYYY")})` +
          //     ` or yesterday (${yesterday.format("DD/MM/YYYY")})` +
          //     (isYesterdaySunday
          //       ? ` or day before yesterday (${dayBeforeYesterday.format("DD/MM/YYYY")})`
          //       : "")
          // );
        }
      }

      // Update the loan status and approval date
      await this.prisma.$transaction(async (tx) => {
        const updatedLoan = await tx.loan.update({
          where: {
            id: data.loanId,
          },
          data: {
            status: newStatus,
            approvalDate: (
              [
                loan_status_enum.APPROVED,
                loan_status_enum.SANCTION_MANAGER_APPROVED,
              ] as loan_status_enum[]
            ).includes(newStatus)
              ? new Date()
              : undefined,
            loan_cx_approved_amount:
              newStatus === loan_status_enum.CREDIT_EXECUTIVE_APPROVED
                ? data.approvedLoanAmount
                : undefined,
            loan_sm_sh_approved_amount:
              newStatus === loan_status_enum.SANCTION_MANAGER_APPROVED ||
                newStatus === loan_status_enum.APPROVED
                ? data.approvedLoanAmount
                : undefined,
            loan_cx_approved_by_partner_user_id:
              newStatus === loan_status_enum.CREDIT_EXECUTIVE_APPROVED
                ? partnerUserId
                : undefined,
            loan_sm_sh_approved_by_partner_user_id:
              newStatus === loan_status_enum.SANCTION_MANAGER_APPROVED
                ? partnerUserId
                : undefined,
            disbursementDate:
              newStatus === loan_status_enum.DISBURSED
                ? data.disbursementDate
                  ? new Date(data.disbursementDate)
                  : new Date()
                : undefined,
            closureDate: (
              [
                loan_status_enum.COMPLETED,
                loan_status_enum.SETTLED,
                loan_status_enum.WRITE_OFF,
              ] as readonly loan_status_enum[]
            ).includes(newStatus)
              ? new Date()
              : undefined,
          },
          include: {
            loanStatusHistory: {
              include: {
                loan_status_brand_reasons: {
                  include: {
                    brandStatusReason: true,
                  },
                },
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
          },
        });
        await tx.loanStatusHistory.create({
          data: {
            loanId: updatedLoan.id,
            status: newStatus,
            partnerUserId: partnerUserId,
            message: data.reason || "",
          },
        });
        if (this.awsAuditLogsSqsService) {
          await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
            userId: loan.userId,
            partnerUserId: partnerUserId,
            message: `Loan status updated from ${loan.status} to ${newStatus}${data.reason ? `. Reason: ${data.reason}` : ""}
           and due date: ${data.approvedDueDate ? data.approvedDueDate : "N/A"}
          `,
            type: "LoanApplication",
            brandId: loan.brandId,
            platformType: platform_type.PARTNER,
            context: {
              action: "LOAN_STATUS_UPDATE",
              loanId: loan.id,
              formattedLoanId: loan.formattedLoanId,
              previousStatus: loan.status,
              reason: data.reason || null,
              approvedLoanAmount: data.approvedLoanAmount || null,
              disbursementDate: data.disbursementDate
                ? typeof data.disbursementDate === "string"
                  ? data.disbursementDate
                  : data.disbursementDate instanceof Date
                    ? data.disbursementDate.toISOString()
                    : null
                : null,
              newStatus: newStatus,
              dueDate: data.approvedDueDate || null,
              partnerUserName: partnerUser?.name || null,
              partnerUserEmail: partnerUser?.email || null,
            },
          });
        }
        return updatedLoan;
      });
    } else {
      throw new BadRequestException(
        `Loan status cannot be updated from ${loan.status} to ${newStatus}`,
      );
    }

    // Create notification for loan status update
    try {
      const userDetails = loan.user;
      const userName =
        userDetails?.userDetails?.firstName &&
          userDetails?.userDetails?.lastName
          ? `${userDetails.userDetails.firstName} ${userDetails.userDetails.lastName}`
          : userDetails?.formattedUserId || "Unknown User";

      const contactInfo =
        userDetails?.phoneNumber || userDetails?.email || "No contact";
      const loanId_display = loan.formattedLoanId || loan.id;
      const statusReason = data.reason || "No reason provided";

      // Get notification targets based on the new status
      let targetPartnerIds: string[] = [];
      let notificationMessage = "";
      let notificationTitle = "";

      // Define notification targets and messages based on status change
      switch (newStatus) {
        case loan_status_enum.CREDIT_EXECUTIVE_APPROVED: {
          // Notify sanction managers and heads
          const sanctionManagers = await this.prisma.partnerUser.findMany({
            where: {
              AND: [
                { isActive: true },
                {
                  brandRoles: {
                    some: {
                      brandId: loan.brandId,
                    },
                  },
                },
                {
                  userPermissions: {
                    some: {
                      partnerPermission: {
                        name: "SANCTION_MANAGER",
                      },
                    },
                  },
                },
              ],
            },
            select: { id: true },
          });
          targetPartnerIds = sanctionManagers.map((sm) => sm.id);
          notificationTitle = "Loan Approved by Credit Executive";
          notificationMessage = `Loan ${loanId_display} approved by Credit Executive. Customer: ${userName} (${contactInfo}), Amount: ₹${loan.amount}. Reason: ${statusReason}`;
          break;
        }

        case loan_status_enum.SANCTION_MANAGER_APPROVED: {
          // Notify sanction heads
          const sanctionHeads = await this.prisma.partnerUser.findMany({
            where: {
              AND: [
                { isActive: true },
                {
                  brandRoles: {
                    some: {
                      brandId: loan.brandId,
                    },
                  },
                },
                {
                  userPermissions: {
                    some: {
                      partnerPermission: {
                        name: "SANCTION_HEAD",
                      },
                    },
                  },
                },
              ],
            },
            select: { id: true },
          });
          targetPartnerIds = sanctionHeads.map((sh) => sh.id);
          notificationTitle = "Loan Approved by Sanction Manager";
          notificationMessage = `Loan ${loanId_display} approved by Sanction Manager. Customer: ${userName} (${contactInfo}), Amount: ₹${loan.amount}. Reason: ${statusReason}`;
          break;
        }

        case loan_status_enum.APPROVED: {
          break;
        }

        case loan_status_enum.DISBURSED: {
          notificationTitle = "Loan Disbursed";
          notificationMessage = `Loan ${loanId_display} disbursed successfully. Customer: ${userName} (${contactInfo}), Amount: ₹${loan.amount}. Disbursement Date: ${data.disbursementDate || "Today"}`;
          break;
        }

        case loan_status_enum.REJECTED: {
          // Notify allocated partners and supervisors
          targetPartnerIds = loan.allottedPartners
            .map((ap) => [ap.partnerUserId, ap.partnerUser.reportsToId])
            .flat()
            .filter(Boolean);
          notificationTitle = "Loan Rejected";
          notificationMessage = `Loan ${loanId_display} has been rejected. Customer: ${userName} (${contactInfo}), Amount: ₹${loan.amount}. Reason: ${statusReason}`;
          break;
        }

        case loan_status_enum.COMPLETED: {
          // Notify allocated partners
          targetPartnerIds = loan.allottedPartners.map(
            (ap) => ap.partnerUserId,
          );
          notificationTitle = "Loan Completed";
          notificationMessage = `Loan ${loanId_display} has been completed successfully. Customer: ${userName} (${contactInfo}), Amount: ₹${loan.amount}`;
          break;
        }

        default: {
          // For other status changes, notify allocated partners
          targetPartnerIds = loan.allottedPartners.map(
            (ap) => ap.partnerUserId,
          );
          notificationTitle = `Loan Status Updated to ${newStatus}`;
          notificationMessage = `Loan ${loanId_display} status changed to ${newStatus}. Customer: ${userName} (${contactInfo}), Amount: ₹${loan.amount}. Reason: ${statusReason}`;
          break;
        }
      }

      // Send notification if there are targets
      if (targetPartnerIds.length > 0 && notificationMessage) {
        await this.notificationService.create({
          title: notificationTitle,
          message: notificationMessage,
          priority: [
            loan_status_enum.REJECTED as string,
            loan_status_enum.APPROVED as string,
            loan_status_enum.DISBURSED as string,
          ].includes(newStatus as string)
            ? notification_priority_enum.HIGH
            : notification_priority_enum.LOW,
          loanId: loan.id,
          userId: userDetails?.id,
          targets: targetPartnerIds.map((partnerId) => ({
            partnerUserId: partnerId,
            platform: platform_type.PARTNER,
          })),
        });
      }
    } catch (notificationError) {
      console.error(
        `Failed to send loan status update notification for loan ${loan.id}: ${notificationError.message}`,
        notificationError.stack,
      );
      // Don't fail the entire status update if notification fails
    }

    if (
      (
        [
          loan_status_enum.APPROVED,
          loan_status_enum.SANCTION_MANAGER_APPROVED,
          loan_status_enum.REJECTED,
        ] as loan_status_enum[]
      ).includes(newStatus)
    ) {
      try {
        await this.sendLoanEmailNotification(loan.brandId, loan.id);
      } catch (error) {
        console.error("Failed to send loan email notification:", error);
      }
      if (loan.user.userReloans.length > 0) {
        await this.prisma.userReloan.updateMany({
          where: {
            userId: loan.userId,
            status: ReloanStatus.PENDING,
          },
          data: {
            status: ReloanStatus.APPROVED,
            updatedAt: new Date(),
          },
        });
      }
    }
    if (newStatus === loan_status_enum.REJECTED) {
      await this.prisma.user.update({
        where: { id: loan.userId },
        data: {
          status_id: UserStatusEnum.BLOCKED,
        },
      });
      if (loan.user.userReloans.length > 0) {
        await this.prisma.userReloan.updateMany({
          where: {
            userId: loan.userId,
            status: ReloanStatus.PENDING,
          },
          data: {
            status: ReloanStatus.REJECTED,
            updatedAt: new Date(),
          },
        });
      }
      try {
        const pan = loan.user?.documents?.filter(
          (doc) => doc.type === DocumentTypeEnum.PAN,
        );
        const aAdhaar = loan.user?.documents?.filter(
          (doc) => doc.type === DocumentTypeEnum.AADHAAR,
        );
        if (data.isPermanentlyBlocked && pan.length > 0) {
          await this.prisma.brandBlocklistedPan.updateMany({
            where: {
              pancard: pan[0]?.documentNumber,
            },
            data: {
              pancard: pan[0]?.documentNumber,
              brandId: loan.brandId,
            },
          });
        }
        // add aadhaar to blocklist
        if (data.isPermanentlyBlocked && aAdhaar.length > 0) {
          await this.prisma.brandBlocklistedAadhar.updateMany({
            where: {
              aadharNumber: aAdhaar[0]?.documentNumber,
            },
            data: {
              aadharNumber: aAdhaar[0]?.documentNumber,
              brandId: loan.brandId,
            },
          });
        }
        // mobile number to blocklist
        if (data.isPermanentlyBlocked && loan.user?.phoneNumber) {
          await this.prisma.brandBlocklistedMobile.updateMany({
            where: {
              mobile:
                // if +91 remove from phone number
                loan.user.phoneNumber.startsWith("+91")
                  ? loan.user.phoneNumber.replace("+91", "")
                  : loan.user.phoneNumber,
            },
            data: {
              mobile:
                // if +91 remove from phone number
                loan.user.phoneNumber.startsWith("+91")
                  ? loan.user.phoneNumber.replace("+91", "")
                  : loan.user.phoneNumber,
              brandId: loan.brandId,
            },
          });
        }
      } catch (error) {
        console.error("Error updating blocklists:", error);
      }
    } else if (
      newStatus === loan_status_enum.APPROVED ||
      loan_status_enum.SANCTION_MANAGER_APPROVED
    ) {
      await this.prisma.user.update({
        where: { id: loan.userId },
        data: {
          status_id: UserStatusEnum.ACTIVE,
        },
      });
    }
    loan.status = newStatus;
    return loan;
  }

  async sendLoanEmailNotification(brandId: string, loanId: string) {
    if (!brandId || !loanId) {
      throw new BadRequestException("Both brandId and loanId are required.");
    }

    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        loanDetails: true,
        user: {
          select: {
            id: true,
            email: true,
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
        noDueCertificate: {
          select: {
            certificateFileUrl: true,
          },
        },
      },
    });

    const brand = await this.prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        name: true,
        logoUrl: true,
      },
    });

    if (!loan || !loan.user) {
      throw new BadRequestException("Loan or user not found.");
    }

    const { user } = loan;
    const { userDetails } = user;

    let data: any = {
      user: {
        firstName: userDetails?.firstName || "User",
        lastName: userDetails?.lastName || "",
      },
      brand: {
        name: brand?.name || "",
        logoUrl: brand?.logoUrl || "",
      },
      loan: {
        applicationId: loan.formattedLoanId || "N/A",
        amount:
          typeof loan.amount === "number"
            ? loan.amount.toLocaleString("en-IN")
            : "N/A",
        tenure: loan.loanDetails?.durationDays?.toString() || "N/A",
        appliedDate: formatDate(loan.applicationDate),
        purpose: loan.purpose || "N/A",
      },
    };
    let templateName: string = "loan-applied";
    if (loan_status_enum.REJECTED === loan.status) {
      templateName = "loan-rejection";
      data = {
        applicantName: `${userDetails?.firstName || ""} ${userDetails?.lastName || ""}`,
        brandName: brand?.name || "",
      };
    }
    const templatePath = path.join(
      process.cwd(),
      this.isDev ? "src" : "src",
      "templates",
      "web",
      "ejs",
      `${templateName}.ejs`,
    );

    let htmlContent: string;
    try {
      htmlContent = await ejs.renderFile(templatePath, data);
    } catch (err) {
      throw new BadRequestException(`Failed to render email template: ${err}`);
    }

    const emailResult = await this.emailService.sendEmail({
      to: user.email,
      name: `${userDetails?.firstName || ""} ${userDetails?.lastName || ""}`.trim(),
      subject: `Loan Application  ${loan.status === loan_status_enum.REJECTED
        ? "Rejection"
        : loan.status === loan_status_enum.APPROVED
          ? "Approval"
          : loan.status === loan_status_enum.CREDIT_EXECUTIVE_APPROVED
            ? "Credit Executive Approval"
            : ""
        }
       - ${loan.formattedLoanId || ""}`,
      html: htmlContent,
    });

    if (!emailResult) {
      throw new BadRequestException("Failed to send Loan Application email.");
    }

    return emailResult;
  }

  async getLoanDetailsEvaluations(
    formattedLoanId: string,
    brandId: string,
    userId: string,
  ) {
    if (!formattedLoanId || !brandId || !userId) {
      throw new BadRequestException("Loan ID is required.");
    }
    const loanDetails = await this.prisma.loan.findUnique({
      where: {
        formattedLoanId: formattedLoanId,
        brandId: brandId,
        userId: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
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
        evaluations: {
          include: {
            evaluation_item: true,
          },
        },
        allottedPartners: {
          include: {
            partnerUser: {
              select: {
                id: true,
                email: true,
                name: true,
                reportsTo: {
                  select: {
                    id: true,
                    email: true,
                    name: true,
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
      },
    });
    if (!loanDetails) {
      throw new BadRequestException("Loan not found.");
    }
    return loanDetails;
  }

  async sendBackToCreditExecutive(
    partnerUserId: string,
    brandId: string,
    data: SendBackToCeDto,
  ) {
    const allowedStatuses = [
      loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
      loan_status_enum.SANCTION_MANAGER_APPROVED,
      loan_status_enum.APPROVED,
    ];

    // Parallel validation: fetch loan and partner user together
    const [loan, partnerUser] = await Promise.all([
      this.prisma.loan.findFirst({
        where: {
          id: data.loanId,
          brandId: brandId,
        },
        select: {
          id: true,
          status: true,
          userId: true,
        },
      }),
      this.prisma.partnerUser.findUnique({
        where: { id: partnerUserId },
        select: { id: true },
      }),
    ]);

    if (!loan) {
      throw new BadRequestException("Loan not found");
    }

    if (!partnerUser) {
      throw new BadRequestException("Partner user not found");
    }

    if (!allowedStatuses.includes(loan.status as any)) {
      throw new BadRequestException(
        `Cannot send back to CE from current status: ${loan.status}`,
      );
    }

    const originalStatus = loan.status;

    try {
      // Single transaction with batch operations
      const updatedLoan = await this.prisma.$transaction(async (prisma) => {
        // Update loan status
        await prisma.loan.update({
          where: { id: data.loanId },
          data: {
            status: loan_status_enum.PENDING,
            updatedAt: new Date(),
          },
        });

        // Update loan agreement and references in parallel if agreement exists
        const existingAgreement = await prisma.loanAgreement.findUnique({
          where: { loanId: data.loanId },
          select: { id: true },
        });

        if (existingAgreement) {
          await prisma.loanAgreement.update({
            where: { loanId: data.loanId },
            data: {
              status: agreement_status_enum.NOT_SENT,
              updatedAt: new Date(),
            },
          });

          await prisma.loanAgreementReference.updateMany({
            where: { loanAgreementId: existingAgreement.id },
            data: {
              is_active: false,
              is_disabled: true,
            },
          });
        }

        // Create loan status history entry
        await prisma.loanStatusHistory.create({
          data: {
            loanId: data.loanId,
            status: loan_status_enum.PENDING,
            message: `Sent back to CE from ${originalStatus}: ${data.reason}`,
            partnerUserId: partnerUserId,
            createdAt: new Date(),
          },
        });

        return { success: true };
      });

      return {
        success: true,
        message: "Loan sent back to Credit Executive successfully",
      };
    } catch (error) {
      throw new BadRequestException(
        "Failed to send back loan to Credit Executive",
      );
    }
  }

  async skipAutopayConsent(brandId: string, loanId: string, reason?: string) {
    // Verify the loan exists and belongs to the brand
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        brandId: brandId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            userDetails: {
              select: {
                firstName: true,
                middleName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!loan) {
      throw new BadRequestException("Loan not found");
    }

    // Update skip_auto_pay_consent flag to true
    const updatedLoan = await this.prisma.loan.update({
      where: { id: loanId },
      data: {
        skip_auto_pay_consent: true,
      },
      include: {
        user: true,
        agreement: true,
        loanDetails: true,
      },
    });
    return {
      success: true,
      message: "Autopay consent skipped successfully",
      data: updatedLoan,
    };
  }

  async sendBackToCreditExecutiveAndSanctionManager(
    partnerUserId: string,
    brandId: string,
    data: SendBackToCeSmDto & { targetRole: "CREDIT_MANAGER" | "SM_SH" },
  ) {
    // Input validation
    if (!data.loanId || !data.reason) {
      throw new BadRequestException("loanId and reason are required");
    }

    // Define target configuration
    const targetConfig: Record<
      string,
      { status: loan_status_enum; message: string }
    > = {
      CREDIT_MANAGER: {
        status: loan_status_enum.PENDING,
        message: "Credit Manager",
      },
      SM_SH: {
        status: loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
        message: "Sanction Manager/Sanction Head",
      },
    };

    if (!targetConfig[data.targetRole]) {
      throw new BadRequestException("Invalid target role");
    }

    const { status: targetStatus, message: targetMessage } =
      targetConfig[data.targetRole];

    const allowedFromStatuses = [
      loan_status_enum.CREDIT_EXECUTIVE_APPROVED,
      loan_status_enum.SANCTION_MANAGER_APPROVED,
      loan_status_enum.APPROVED,
    ];

    // Parallel validation with minimal fields
    const [loan, partnerUser] = await Promise.all([
      this.prisma.loan.findFirst({
        where: { id: data.loanId, brandId },
        select: { id: true, status: true },
      }),
      this.prisma.partnerUser.findUnique({
        where: { id: partnerUserId },
        select: { id: true },
      }),
    ]);

    if (!loan) {
      throw new BadRequestException("Loan not found");
    }

    if (!partnerUser) {
      throw new BadRequestException("Partner user not found");
    }

    if (!allowedFromStatuses.includes(loan.status as any)) {
      throw new BadRequestException(
        `Cannot send back to ${targetMessage} from current status: ${loan.status}`,
      );
    }

    const originalStatus = loan.status;

    try {
      await this.prisma.$transaction(async (prisma) => {
        // Update loan status
        await prisma.loan.update({
          where: { id: data.loanId },
          data: { status: targetStatus, updatedAt: new Date() },
        });

        // Check and update agreement if exists
        const existingAgreement = await prisma.loanAgreement.findUnique({
          where: { loanId: data.loanId },
          select: { id: true },
        });

        if (existingAgreement) {
          await prisma.loanAgreement.update({
            where: { loanId: data.loanId },
            data: {
              status: agreement_status_enum.NOT_SENT,
              updatedAt: new Date(),
            },
          });

          await prisma.loanAgreementReference.updateMany({
            where: { loanAgreementId: existingAgreement.id },
            data: { is_active: false, is_disabled: true },
          });
        }

        // Create history entry
        await prisma.loanStatusHistory.create({
          data: {
            loanId: data.loanId,
            status: targetStatus,
            message: `Sent back to ${targetMessage} from ${originalStatus}: ${data.reason}`,
            partnerUserId: partnerUserId,
            createdAt: new Date(),
          },
        });
      });

      return {
        success: true,
        message: `Loan sent back to ${targetMessage} successfully`,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to send back loan to ${targetMessage}`,
      );
    }
  }

  async updateStatusLoanWithReasons(
    partnerUserId: string | null,
    data: UpdateLoanWithReasonsDto,
  ) {
    // First, call the existing updateStatusLoan method
    const loan = await this.updateLoanStatus(partnerUserId, data);

    // If we have rejection reasons and the status is REJECTED, create the reason associations
    if (
      data.brandStatusReasonIds &&
      data.brandStatusReasonIds.length > 0 &&
      data.status === loan_status_enum.REJECTED
    ) {
      // Find the most recent loan status history entry for this loan
      const latestStatusHistory = await this.prisma.loanStatusHistory.findFirst(
        {
          where: { loanId: data.loanId },
          orderBy: { createdAt: "desc" },
        },
      );

      if (latestStatusHistory) {
        // Create loan_status_brand_reasons entries for each selected reason
        const reasonAssociations = data.brandStatusReasonIds.map(
          (reasonId) => ({
            loanStatusHistoryId: latestStatusHistory.id,
            brandStatusReasonId: reasonId,
          }),
        );

        await this.prisma.loan_status_brand_reasons.createMany({
          data: reasonAssociations,
        });
      }
    }

    return loan;
  }

  async getSignedAgreementLoans(
    brandId: string,
    partnerRole: string,
    partnerUserId: string,
  ) {
    const loans = await this.prisma.loan.findMany({
      where: {
        brandId,
        isActive: true,
        status: {
          in: [
            loan_status_enum.SANCTION_MANAGER_APPROVED,
            loan_status_enum.APPROVED,
          ],
        },
        agreement: {
          status: agreement_status_enum.SIGNED,
        },
        user: {
          isActive: true,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        xlsxFiles: {
          select: {
            id: true,
            fileName: true,
            filePrivateUrl: true,
            fileType: true,
            uploadedAt: true,
          },
        },
      },
    });

    return {
      loans,
      meta: {
        total: loans?.length,
        currentPage: 1,
        limit: loans?.length,
        totalPages: 1,
      },
    };
  }

  async getNoDuePendingLoans(
    brandId: string,
    partnerUserId: string,
    paginationDto: {
      page: number;
      limit: number;
      dateFilter?: string;
      search?: string;
    },
  ) {
    const skip = (paginationDto.page - 1) * paginationDto.limit;
    const take = paginationDto.limit;
    const search = paginationDto.search?.trim() || "";

    // Build the where clause
    const baseWhere: any = {
      brandId,
      isActive: true,
      status: {
        in: [
          loan_status_enum.COMPLETED,
          loan_status_enum.SETTLED,
          loan_status_enum.WRITE_OFF,
        ],
      },
      paymentRequests: {
        some: {
          type: {
            in: ["COLLECTION", "PARTIAL_COLLECTION"],
          },
          status: TransactionStatusEnum.SUCCESS,
        },
      },
      user: {
        isActive: true,
      },
      OR: [
        {
          noDueCertificate: {
            is: null,
          },
        },
        {
          noDueCertificate: {
            is: {
              sentAt: null,
            },
          },
        },
      ],
    };

    // Add search filter if provided
    if (search) {
      baseWhere.AND = [
        {
          OR: [
            { formattedLoanId: { contains: search, mode: "insensitive" } },
            {
              user: { phoneNumber: { contains: search, mode: "insensitive" } },
            },
            { user: { email: { contains: search, mode: "insensitive" } } },
            {
              user: {
                userDetails: {
                  firstName: { contains: search, mode: "insensitive" },
                },
              },
            },
            {
              user: {
                userDetails: {
                  lastName: { contains: search, mode: "insensitive" },
                },
              },
            },
          ],
        },
      ];
    }

    const [loans, total] = await Promise.all([
      this.prisma.loan.findMany({
        where: baseWhere,
        select: {
          id: true,
          formattedLoanId: true,
          amount: true,
          status: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              phoneNumber: true,
              email: true,
              userDetails: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          loanDetails: {
            select: {
              durationDays: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take,
      }),
      this.prisma.loan.count({
        where: baseWhere,
      }),
    ]);

    return {
      data: loans,
      total,
      page: paginationDto.page,
      limit: paginationDto.limit,
      totalPages: Math.ceil(total / paginationDto.limit),
    };
  }

  async reactivateLoan(
    partnerUserId: string | null,
    loanId: string,
    reason: string,
  ) {
    // Find the loan and verify it's rejected
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: {
        user: {
          include: {
            userDetails: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!loan) {
      throw new BadRequestException("Loan not found");
    }

    // Only allow reactivation of rejected loans
    if (loan.status !== loan_status_enum.REJECTED) {
      throw new BadRequestException(
        `Cannot reactivate loan with status ${loan.status}. Only REJECTED loans can be reactivated.`,
      );
    }

    if (!reason) {
      throw new BadRequestException("Reason is required for loan reactivation");
    }

    // Update loan status to PENDING and create history entry
    return await this.prisma.$transaction(async (tx) => {
      // Update the loan status
      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          status: loan_status_enum.PENDING,
          updatedAt: new Date(),
        },
        include: {
          loanStatusHistory: {
            include: {
              loan_status_brand_reasons: {
                include: {
                  brandStatusReason: true,
                },
              },
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
        },
      });
      await tx.loanStatusHistory.create({
        data: {
          loanId: updatedLoan.id,
          status: loan_status_enum.PENDING,
          partnerUserId: partnerUserId,
          message: `Loan reactivated from REJECTED to PENDING. Reason: ${reason}`,
        },
      });
      return updatedLoan;
    });
  }

  async forceBypassReports(
    partnerUserId: string | null,
    loanId: string,
    reason: string,
  ) {
    if (!partnerUserId) {
      throw new BadRequestException("Partner user ID is required");
    }

    if (!loanId) {
      throw new BadRequestException("Loan ID is required");
    }

    if (!reason?.trim()) {
      throw new BadRequestException("Reason for bypassing reports is required");
    }
    return await this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: {
          allottedPartners: {
            include: {
              partnerUser: true,
            },
          },
          user: {
            include: {
              userDetails: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
              documents: true,
            },
          },
        },
      });

      if (!loan) {
        throw new BadRequestException("Loan not found");
      }

      if (loan.status !== loan_status_enum.PENDING) {
        throw new BadRequestException(
          `Cannot bypass reports for a ${loan.status} loan. Only PENDING loans are eligible.`,
        );
      }

      // ✅ 3. Update loan metadata
      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          updatedAt: new Date(),
          forceBsaReportByPass: true,
          forceCreditReportByPass: true,
        },
        include: {
          loanStatusHistory: {
            include: {
              loan_status_brand_reasons: {
                include: { brandStatusReason: true },
              },
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
        },
      });
      if (loan.user.documents.length > 0) {
        await this.prisma.document.update({
          where: {
            userId_type: {
              userId: loan.user.id,
              type: DocumentTypeEnum.AADHAAR,
            },
          },
          data: {
            isApprovedByAdmin: true,
            updatedAt: new Date(),
            status: document_status_enum.APPROVED,
          },
        });
      }
      // ✅ 4. Record an audit / loan status history entry
      await tx.loanStatusHistory.create({
        data: {
          loanId: updatedLoan.id,
          status: loan.status,
          partnerUserId,
          message: `Reports bypassed manually. Reason: ${reason}`,
          createdAt: new Date(),
        },
      });
      // notify executive team about the bypass
      try {
        const execUserIds = loan.allottedPartners.map(
          (partnerUser) => partnerUser.partnerUserId,
        );
        if (execUserIds.length > 0) {
          await this.notificationService.create({
            title: "Loan Reports Bypassed",
            message: `Reports for loan ${loan.formattedLoanId} have been bypassed manually by partner user ${partnerUserId}. Reason: ${reason}`,
            priority: notification_priority_enum.HIGH,
            loanId: loan.id,
            userId: loan.userId,
            targets: execUserIds.map((id) => ({
              partnerUserId: id,
              platform: platform_type.PARTNER,
            })),
          });
        }
      } catch (error) {
        console.error(
          `Failed to send reports bypass notification for loan ${loan.id}: ${error.message}`,
          error.stack,
        );
      }

      // ✅ 5. Return success response with updated loan details
      return {
        message: "Loan successfully updated to bypass reports.",
        loan: updatedLoan,
      };
    });
  }

  async changeRuleType(
    partnerUserId: string,
    loanId: string,
    brandId: string,
    ruleType: string,
    reason: string,
  ) {
    // ✅ 1. Validate input
    if (!partnerUserId || !loanId || !brandId || !ruleType || !reason) {
      throw new BadRequestException("All fields are required");
    }

    // ✅ 2. Parallel fetch: loan data + partnerUser validation
    const [loan, partnerUser] = await Promise.all([
      this.prisma.loan.findUnique({
        where: { id: loanId },
        select: {
          id: true,
          brandId: true,
          userId: true,
          status: true,
          ruleType: true,
          amount: true,
          formattedLoanId: true,
          agreement: {
            select: {
              status: true,
            },
          },
          loanDetails: {
            select: {
              dueDate: true,
            },
          },
          allottedPartners: {
            select: {
              partnerUserId: true,
            },
          },
        },
      }),
      this.prisma.partnerUser.findUnique({
        where: { id: partnerUserId },
        select: { id: true },
      }),
    ]);

    // ✅ 3. Validate loan exists and belongs to brand
    if (!loan) {
      throw new BadRequestException(`Loan with ID ${loanId} not found`);
    }

    if (loan.brandId !== brandId) {
      throw new BadRequestException(
        "Loan does not belong to the specified brand",
      );
    }

    // ✅ 4. Validate partner user exists
    if (!partnerUser) {
      throw new BadRequestException("Partner user not found");
    }

    // ✅ 5. Validate loan agreement status is NOT_SENT
    if (
      loan.agreement &&
      loan.agreement.status !== agreement_status_enum.NOT_SENT
    ) {
      throw new BadRequestException(
        `Loan rule type can only be updated when agreement status is NOT_SENT. Current status: ${loan.agreement.status}`,
      );
    }

    // ✅ 6. Validate loan status is PENDING or CREDIT_EXECUTIVE_APPROVED
    if (
      loan.status !== loan_status_enum.PENDING &&
      loan.status !== loan_status_enum.CREDIT_EXECUTIVE_APPROVED
    ) {
      throw new BadRequestException(
        `Loan rule type can only be updated when loan status is PENDING or CREDIT_EXECUTIVE_APPROVED. Current status: ${loan.status}`,
      );
    }

    // ✅ 7. Update loan and create audit history in single transaction (minimal work)
    const oldRuleType = loan.ruleType;
    const updatedLoan = await this.prisma.$transaction(
      async (tx) => {
        // Update loan
        const updated = await tx.loan.update({
          where: { id: loanId },
          data: {
            ruleType: ruleType as any,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            formattedLoanId: true,
            ruleType: true,
            status: true,
            amount: true,
            userId: true,
            updatedAt: true,
          },
        });

        // Create audit history entry
        await tx.loanStatusHistory.create({
          data: {
            loanId: updated.id,
            status: loan.status,
            partnerUserId,
            message: `Loan rule type changed from ${oldRuleType} to ${ruleType}. Reason: ${reason}`,
          },
        });

        return updated;
      },
      {
        timeout: 10000, // Increase timeout to 10 seconds for database operations only
      },
    );

    // ✅ 8. Execute async operations in parallel (outside transaction)
    await this.loansService.updateLoanAmount(
      loan.userId,
      loan.amount,
      loan.id,
      loan.loanDetails?.dueDate
        ? new Date(loan.loanDetails.dueDate).toISOString()
        : null,
    );
    await this.awsAuditLogsSqsService?.sendToAuditLogsQueue({
      userId: loan.userId,
      brandId,
      partnerUserId,
      message: `Changed loan rule type from ${oldRuleType} to ${ruleType}. Reason: ${reason}`,
      type: "LOAN_RULE_TYPE_CHANGE",
      platformType: platform_type.PARTNER,
      context: {
        loanId,
        oldRuleType: oldRuleType,
        newRuleType: ruleType,
        reason,
      },
    });

    const asyncTasks = [
      // Send notifications to allotted partners
      (async () => {
        try {
          const execUserIds = loan.allottedPartners.map(
            (partner) => partner.partnerUserId,
          );
          if (execUserIds.length > 0) {
            await this.notificationService.create({
              title: "Loan Rule Type Updated",
              message: `Rule type for loan ${loan.formattedLoanId} has been updated to ${ruleType}. Reason: ${reason}`,
              priority: notification_priority_enum.MEDIUM,
              loanId: loan.id,
              userId: loan.userId,
              targets: execUserIds.map((id) => ({
                partnerUserId: id,
                platform: platform_type.PARTNER,
              })),
            });
          }
        } catch (error) {
          console.error(
            `[changeRuleType] Failed to send notification for loan ${loanId}:`,
            error.message,
          );
        }
      })(),
    ];

    // Don't wait for async operations - let them execute in background
    // This prevents timeout issues
    Promise.allSettled(asyncTasks).catch((error) => {
      console.error(
        `[changeRuleType] Error in async operations for loan ${loanId}:`,
        error.message,
      );
    });

    return {
      message: "Loan rule type updated successfully",
      data: {
        loanId: updatedLoan.id,
        formattedLoanId: updatedLoan.formattedLoanId,
        ruleType: updatedLoan.ruleType,
        status: updatedLoan.status,
        updatedAt: updatedLoan.updatedAt,
      },
    };
  }

  /**
   * Add a comment to a loan using loan_status_history table
   */
  async addLoanStatusHistory(
    loanId: string,
    comment: string,
    partnerUserId: string,
    brandId: string,
  ): Promise<CreateCommentResponse> {
    // Verify the loan exists and belongs to the brand
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        user: { brandId },
      },
    });

    if (!loan) {
      throw new NotFoundException("Loan not found or access denied");
    }
    // Verify the partner user exists
    const partnerUser = await this.prisma.partnerUser.findUnique({
      where: { id: partnerUserId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!partnerUser) {
      throw new NotFoundException("Partner user not found");
    }

    // Create a comment entry in loan_status_history with a special status for comments
    const loanStatusHistory = await this.prisma.loanStatusHistory.create({
      data: {
        loanId,
        status: loan.status, // Keep the current loan status
        message: `COMMENT: ${comment}`, // Prefix with COMMENT to identify as comment
        partnerUserId,
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
    });

    const commentResponse: CommentResponse = {
      id: loanStatusHistory.id,
      loanId: loanStatusHistory.loanId,
      comment: comment,
      createdAt: loanStatusHistory.createdAt.toISOString(),
      partnerUser: loanStatusHistory.partnerUser!,
    };

    return {
      success: true,
      comment: commentResponse,
      message: "Comment added successfully",
    };
  }

  /**
   * Get all comments for a loan
   */
  async getLoanStatusHistory(
    loanId: string,
    brandId: string,
    pagination: { page: number; limit: number },
  ): Promise<CommentsListResponse> {
    // Verify the loan exists and belongs to the brand
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        user: { brandId },
      },
    });

    if (!loan) {
      throw new NotFoundException("Loan not found or access denied");
    }

    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Get only comment entries (messages starting with "COMMENT:")
    const [comments, total] = await Promise.all([
      this.prisma.loanStatusHistory.findMany({
        where: {
          loanId,
          message: {
            startsWith: "COMMENT:",
          },
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
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      this.prisma.loanStatusHistory.count({
        where: {
          loanId,
          message: {
            startsWith: "COMMENT:",
          },
        },
      }),
    ]);

    const commentResponses: CommentResponse[] = comments.map((comment) => ({
      id: comment.id,
      loanId: comment.loanId,
      comment: comment.message?.replace("COMMENT: ", "") || "",
      createdAt: comment.createdAt.toISOString(),
      partnerUser: comment.partnerUser!,
    }));

    return {
      success: true,
      comments: commentResponses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLoansByDueDateAndPartner(
    brandId: string,
    dueDateFrom?: string,
    dueDateTo?: string,
    sourcePartnerUserIds?: string[],
    loanCurrentStatus?: string,
  ) {
    try {
      const whereClause: any = {
        brandId,
        status: {
          in: [
            loan_status_enum.ACTIVE,
            loan_status_enum.POST_ACTIVE,
            loan_status_enum.PARTIALLY_PAID,
          ],
        },
      };

      // Only add date filter if both dates are provided
      if (dueDateFrom && dueDateTo) {
        const dueDateFromObj = new Date(dueDateFrom);
        const dueDateToObj = new Date(dueDateTo);

        // Validate date range
        if (dueDateFromObj > dueDateToObj) {
          throw new BadRequestException(
            "Start date must be before or equal to end date",
          );
        }

        whereClause.loanDetails = {
          dueDate: {
            gte: dueDateFromObj,
            lte: dueDateToObj,
          },
        };

        // Handle loan current status filter (overdue vs not overdue)
        if (loanCurrentStatus && loanCurrentStatus !== "both") {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (loanCurrentStatus === "overdue") {
            // Overdue: due date is before today
            whereClause.loanDetails.dueDate.lt = today;
          } else if (loanCurrentStatus === "not-overdue") {
            // Not overdue: due date is today or in the future
            whereClause.loanDetails.dueDate.gte = today;
          }
        }
      } else if (loanCurrentStatus && loanCurrentStatus !== "both") {
        // If no date range provided but loan current status filter is present
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        whereClause.loanDetails = {
          dueDate:
            loanCurrentStatus === "overdue" ? { lt: today } : { gte: today },
        };
      }

      // Handle source partner filter
      if (sourcePartnerUserIds && sourcePartnerUserIds.length > 0) {
        if (sourcePartnerUserIds.includes("unallocated")) {
          // Filter for loans that have no active collection partner allocation
          whereClause.loan_collection_allocated_partner = {
            none: {
              isDeallocated: false,
              isActive: true,
            },
          };
        } else {
          // Filter by specific partners
          whereClause.loan_collection_allocated_partner = {
            some: {
              partnerUserId: { in: sourcePartnerUserIds },
              isDeallocated: false,
            },
          };
        }
      }

      const loans = await this.prisma.loan.findMany({
        where: whereClause,
        select: {
          id: true,
          formattedLoanId: true,
          amount: true,
          status: true,
          user: {
            select: {
              userDetails: {
                select: {
                  firstName: true,
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
              isDeallocated: false,
            },
            select: {
              id: true,
              partnerUser: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return loans;
    } catch (error) {
      throw new BadRequestException("Failed to fetch loans");
    }
  }

  async getDisbursedAmountByDateAndBrand(
    brandId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<
    Array<{ date: string; totalDisbursedAmount: number; totalCases: number }>
  > {
    try {
      let whereClause: any = {
        brandId: brandId,
        status: {
          in: [
            loan_status_enum.ACTIVE,
            loan_status_enum.POST_ACTIVE,
            loan_status_enum.PARTIALLY_PAID,
            loan_status_enum.PAID,
          ],
        },
      };

      // Handle date filtering based on provided parameters
      if (startDate && endDate) {
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);

        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999);

        // Validate date range
        if (startDateObj > endDateObj) {
          throw new BadRequestException(
            "Start date must be before or equal to end date",
          );
        }

        whereClause.disbursementDate = {
          gte: startDateObj,
          lte: endDateObj,
        };
      } else if (startDate) {
        // If only start date is provided, treat it as a single date
        const startDateObj = new Date(startDate);
        startDateObj.setHours(0, 0, 0, 0);

        const endDateObj = new Date(startDate);
        endDateObj.setHours(23, 59, 59, 999);

        whereClause.disbursementDate = {
          gte: startDateObj,
          lte: endDateObj,
        };
      } else {
        throw new BadRequestException(
          "At least startDate parameter is required",
        );
      }

      // Query loans within the date range
      const loans = await this.prisma.loan.findMany({
        where: whereClause,
        select: {
          id: true,
          amount: true,
          disbursementDate: true,
          disbursement: {
            select: {
              netAmount: true,
            },
          },
        },
        orderBy: {
          disbursementDate: "asc",
        },
      });

      // Group by date and calculate totals
      const groupedByDate: Record<
        string,
        { totalAmount: number; count: number }
      > = {};

      loans.forEach((loan) => {
        if (!loan.disbursementDate) return;

        const dateKey = _dayjs(loan.disbursementDate).format("YYYY-MM-DD");

        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = { totalAmount: 0, count: 0 };
        }

        // Use netAmount from disbursement if available, otherwise use loan amount
        const disbursedAmount = loan.amount;
        groupedByDate[dateKey].totalAmount += disbursedAmount;
        groupedByDate[dateKey].count += 1;
      });

      // Convert to array format
      const result = Object.entries(groupedByDate).map(([date, data]) => ({
        date,
        totalDisbursedAmount: data.totalAmount,
        totalCases: data.count,
      }));

      return result;
    } catch (error) {
      console.error(
        `Failed to fetch disbursed amount for brand ${brandId}:`,
        error,
      );

      // Re-throw if it's already a BadRequestException
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException("Failed to fetch disbursed amount");
    }
  }

  async createOrUpdateFieldVisit(
    loanId: string,
    brandId: string,
    requireFieldVisit: boolean,
  ) {
    // Verify loan exists and belongs to the brand
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        brandId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!loan) {
      throw new NotFoundException("Loan not found");
    }

    // Check if field visit already exists
    const existingFieldVisit = await this.prisma.field_visit.findFirst({
      where: {
        loan_id: loanId,
      },
    });

    try {
      let fieldVisit;

      if (existingFieldVisit) {
        // Update existing field visit
        fieldVisit = await this.prisma.field_visit.update({
          where: {
            id: existingFieldVisit.id,
          },
          data: {
            require_field_visit: requireFieldVisit,
            updated_at: new Date(),
          },
        });
      } else {
        // Create new field visit
        fieldVisit = await this.prisma.field_visit.create({
          data: {
            loan_id: loanId,
            require_field_visit: requireFieldVisit,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }

      return {
        success: true,
        message: `Field visit requirement ${existingFieldVisit ? "updated" : "set"} successfully`,
        data: fieldVisit,
      };
    } catch (error) {
      console.error("Error creating/updating field visit:", error);
      throw new BadRequestException("Failed to set field visit requirement");
    }
  }

  async getFieldVisit(loanId: string, brandId: string) {
    // Verify loan exists and belongs to the brand
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        brandId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!loan) {
      throw new NotFoundException("Loan not found");
    }

    const fieldVisit = await this.prisma.field_visit.findFirst({
      where: {
        loan_id: loanId,
      },
    });

    return {
      success: true,
      data: fieldVisit || null,
    };
  }

  async getBulkFieldVisits(brandId: string, loanIds: string[]) {
    // Verify all loans belong to the brand
    const loans = await this.prisma.loan.findMany({
      where: {
        id: { in: loanIds },
        brandId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (loans.length === 0) {
      throw new NotFoundException("No loans found");
    }

    // Get field visits for all requested loans
    const fieldVisits = await this.prisma.field_visit.findMany({
      where: {
        loan_id: { in: loanIds },
      },
    });

    // Create a map for easy lookup
    const fieldVisitMap: Record<string, any> = {};
    fieldVisits.forEach((fv) => {
      fieldVisitMap[fv.loan_id] = fv;
    });

    // Return all field visits, including null for loans without field visits
    const result = loanIds.map((loanId) => ({
      loanId,
      fieldVisit: fieldVisitMap[loanId] || null,
    }));

    return {
      success: true,
      data: result,
    };
  }
}
