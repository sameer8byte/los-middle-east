import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  document_status_enum,
  DocumentTypeEnum,
  User,
  UserDetails,
} from "@prisma/client";
import * as dayjs from "dayjs";

// Access the default function from the namespace import
const _dayjs = dayjs.default;
import { EquifaxService } from "src/external/equifax/equifax.service";
import { PrismaService } from "src/prisma/prisma.service";
import {
  extractCreditScore,
  SCORE_EXTRACTION_PATTERNS,
} from "src/utils/creditScore.utils";
import { AwsPrivateS3Service } from "src/core/aws/s3/aws-private-s3.service";
import { v4 as uuidv4 } from "uuid";
import { gzip } from "zlib";
import { promisify } from "util";

@Injectable()
export class EquifixBreService {
  private readonly logger = new Logger(EquifixBreService.name);
  private readonly currentMonthStart = _dayjs().startOf("month").toDate();
  private readonly currentMonthEnd = _dayjs().endOf("month").toDate();
  private readonly gzipAsync = promisify(gzip);

  constructor(
    private readonly equifaxService: EquifaxService,
    private readonly prisma: PrismaService,
    private readonly awsPrivateS3Service: AwsPrivateS3Service,
  ) {}

  async cibilReport(userId: string) {
    const [user, panDocument] = await Promise.all([
      this.getUserWithDetails(userId),
      this.getValidPanDocument(userId),
    ]);

    let cibilReport = await this.findExistingReport(userId);

    if (!cibilReport?.braReportJson) {
      cibilReport = await this.fetchAndStoreNewReport(user, panDocument);
    }
    return this.validateAndFormatResponse(cibilReport, user.email);
  }

  private async getUserWithDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { userDetails: true },
    });

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    if (!user.userDetails) {
      throw new NotFoundException(`User details not complete`);
    }

    return user;
  }

  private async getValidPanDocument(userId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        userId,
        type: DocumentTypeEnum.PAN,
        status: document_status_enum.APPROVED,
      },
    });

    if (!document) {
      throw new NotFoundException(`Valid PAN document not found`);
    }

    return document;
  }

  private async findExistingReport(userId: string) {
    const cibilReport = await this.prisma.equifaxSomeTable.findFirst({
      where: {
        userId,
        createdAt: {
          gte: this.currentMonthStart,
          lte: this.currentMonthEnd,
        },
      },
    });

    if (cibilReport?.braReportJson) {
      const creditScore = extractCreditScore(
        cibilReport.braReportJson,
        SCORE_EXTRACTION_PATTERNS.EQUIFAX,
      );

      // this.logger.log(
      //   `Existing Equifax report found for user ${userId}. Score: ${creditScore}`
      // );

      if (creditScore !== null) {
        await this.prisma.userDetails.update({
          where: {
            userId: userId,
          },
          data: { creditScore },
        });
      }
    }

    return cibilReport;
  }

  private async fetchAndStoreNewReport(
    user: User & { userDetails: UserDetails },
    panDocument: any,
  ) {
    try {
      const cibilReportStatus = await this.equifaxService.fetchCibil({
        fName: user.userDetails.firstName,
        mName: user.userDetails.middleName || "",
        lName: user.userDetails.lastName,
        dob: _dayjs(user.userDetails.dateOfBirth).format("YYYY-MM-DD"),
        mobile: user.phoneNumber,
        pan: panDocument.documentNumber,
        pinCode: user.userDetails.pincode,
        city: user.userDetails.city,
        leadState: user.userDetails.state,
      });

      if (!cibilReportStatus) {
        throw new NotFoundException(`Credit report not available`);
      }

      const [, [cibil_pdf_key, cibil_json_gz_key, generated_cibil_report_html_key]] = await Promise.all([
        // 1. Update credit score
        (async () => {
          const creditScore = extractCreditScore(
            cibilReportStatus,
            SCORE_EXTRACTION_PATTERNS.EQUIFAX,
          );
          if (creditScore !== null) {
            await this.prisma.userDetails.update({
              where: { userId: user.id },
              data: { creditScore },
            });
          }
        })(),

        // 2. All S3 uploads in parallel
        Promise.all([
          // PDF upload
          (async () => {
            if (!cibilReportStatus?.EncodedPdf) return null;
            try {
              const pdfBuffer = Buffer.from(
                cibilReportStatus.EncodedPdf,
                "base64",
              );
              const result =
                await this.awsPrivateS3Service.uploadPrivateDocument(
                  {
                    buffer: pdfBuffer,
                    originalname: `equifax-cibil-report-${user.id}.pdf`,
                    mimetype: "application/pdf",
                    size: pdfBuffer.length,
                    fieldname: "file",
                    encoding: "7bit",
                    stream: null,
                    destination: "",
                    filename: `equifax-cibil-report-${user.id}.pdf`,
                    path: "",
                  } as Express.Multer.File,
                  user.brandId,
                  user.id,
                  uuidv4(),
                  "CIBIL",
                );
              this.logger.log(
                `CIBIL PDF uploaded for user ${user.id}. Key: ${result.key}`,
              );
              return result.key;
            } catch (err) {
              this.logger.error(
                `Failed to upload CIBIL PDF for user ${user.id}: ${err.message}`,
              );
              return null;
            }
          })(),

          // JSON.GZ upload (without EncodedPdf)
          (async () => {
            try {
              const { EncodedPdf, ...cibilReportWithoutPdf } =
                cibilReportStatus;
              const gzipBuffer = await this.gzipAsync(
                JSON.stringify(cibilReportWithoutPdf),
              );
              const result =
                await this.awsPrivateS3Service.uploadPrivateDocument(
                  {
                    buffer: gzipBuffer,
                    originalname: `equifax-cibil-report-${user.id}.json.gz`,
                    mimetype: "application/gzip",
                    size: gzipBuffer.length,
                    fieldname: "file",
                    encoding: "7bit",
                    stream: null,
                    destination: "",
                    filename: `equifax-cibil-report-${user.id}.json.gz`,
                    path: "",
                  } as Express.Multer.File,
                  user.brandId,
                  user.id,
                  uuidv4(),
                  "CIBIL",
                );
              this.logger.log(
                `CIBIL JSON.GZ uploaded for user ${user.id}. Key: ${result.key}`,
              );
              return result.key;
            } catch (err) {
              this.logger.error(
                `Failed to upload CIBIL JSON.GZ for user ${user.id}: ${err.message}`,
              );
              return null;
            }
          })(),

          // Generated HTML report upload
          (async () => {
            try {
              const htmlReport = this.generateEquifaxReportHtml(
                cibilReportStatus,
                user,
              );
              const htmlBuffer = Buffer.from(htmlReport, "utf-8");
              const result =
                await this.awsPrivateS3Service.uploadPrivateDocument(
                  {
                    buffer: htmlBuffer,
                    originalname: `equifax-generated-report-${user.id}.html`,
                    mimetype: "text/html",
                    size: htmlBuffer.length,
                    fieldname: "file",
                    encoding: "7bit",
                    stream: null,
                    destination: "",
                    filename: `equifax-generated-report-${user.id}.html`,
                    path: "",
                  } as Express.Multer.File,
                  user.brandId,
                  user.id,
                  uuidv4(),
                  "CIBIL",
                );
              this.logger.log(
                `Equifax generated HTML report uploaded for user ${user.id}. Key: ${result.key}`,
              );
              return result.key;
            } catch (err) {
              this.logger.error(
                `Failed to generate and upload Equifax HTML report for user ${user.id}: ${err.message}`,
              );
              return null;
            }
          })(),
        ]),
      ]);

      return this.prisma.equifaxSomeTable.create({
        data: {
          id: uuidv4(),
          braReportJson: cibilReportStatus,
          uploadedAt: new Date(),
          documentUrl: null,
          cibil_pdf_key,
          cibil_json_gz_key,
          generated_cibil_report_html_key: generated_cibil_report_html_key || null,
          encodedPdf: cibilReportStatus?.EncodedPdf ?? null,
          userId: user.id,
        },
      });
    } catch (error) {
      this.logger.error(`CIBIL fetch failed for ${user.id}`, error.stack);
      throw new InternalServerErrorException(`Credit report generation failed`);
    }
  }
  private validateAndFormatResponse(cibilReport: any, email: string) {
    const scoreDetails =
      cibilReport.braReportJson?.CCRResponse?.CIRReportDataLst?.[0]
        ?.CIRReportData?.ScoreDetails?.[0];

    if (!scoreDetails) {
      this.logger.error(`Score details missing for ${email}`);
      throw new NotFoundException(`Credit score information not available`);
    }
    return {
      braReportJson: {
        ...cibilReport.braReportJson,
        EncodedPdf: null,
      },
      EncodedPdf: cibilReport.braReportJson?.EncodedPdf || null,
      documentUrl: cibilReport.documentUrl,
      password: cibilReport.password || null,
    };
  }

  private generateEquifaxReportHtml(
    reportJson: any,
    user: User & { userDetails: UserDetails },
  ): string {
    try {
      const cirReportDataLst =
        reportJson?.CCRResponse?.CIRReportDataLst || [];
      const cirReportData = cirReportDataLst[0]?.CIRReportData || {};
      const scoreDetails = cirReportData?.ScoreDetails || [];
      const accountSummary = cirReportData?.ReportSummary || {};
      const accountDetails = cirReportData?.AccountsDetails || [];
      const inquiriesDetails = cirReportData?.InquiriesDetails || [];

      const score = scoreDetails[0]?.Score || "N/A";
      const scoreGrade = scoreDetails[0]?.ScoreGrade || "N/A";
      const totalAccounts = accountSummary?.NoOfAccounts || 0;
      const activeAccounts = accountSummary?.NoOfActiveAccounts || 0;
      const closedAccounts = accountSummary?.NoOfClosedAccounts || 0;
      const writeOffs = accountSummary?.NoOfWriteOffs || 0;
      const settlements = accountSummary?.NoOfSettlements || 0;
      const totalDisbursed =
        accountSummary?.TotalSanctionAmount ||
        accountSummary?.TotalDisbursedAmount ||
        0;
      const totalBalance =
        accountSummary?.TotalCurrentBalance ||
        accountSummary?.TotalBalance ||
        0;
      const overDueAmount = accountSummary?.TotalAmountOverdue || 0;

      const formatCurrency = (value: any): string => {
        if (!value) return "₹0";
        const num = Number.parseFloat(
          value.toString().replaceAll(",", ""),
        );
        return Number.isNaN(num)
          ? "₹0"
          : `₹${num.toLocaleString("en-IN")}`;
      };

      const formatDate = (dateStr: any): string => {
        if (!dateStr) return "N/A";
        try {
          return new Date(dateStr).toLocaleDateString("en-IN");
        } catch {
          return dateStr;
        }
      };

      const accountsTableHtml = this.generateAccountsTable(
        accountDetails,
        formatCurrency,
      );
      const inquiriesTableHtml = this.generateInquiriesTable(
        inquiriesDetails,
        formatCurrency,
        formatDate,
      );

      return this.buildEquifaxReportHtml({
        user,
        formatDate,
        score,
        scoreGrade,
        totalAccounts,
        activeAccounts,
        closedAccounts,
        writeOffs,
        settlements,
        formatCurrency,
        totalDisbursed,
        totalBalance,
        overDueAmount,
        accountsTableHtml,
        inquiriesTableHtml,
      });
    } catch (error) {
      this.logger.error(
        `Error generating Equifax report HTML: ${error?.message}`,
        error,
      );
      throw new InternalServerErrorException(
        `Failed to generate report: ${error?.message || "Unknown error"}`,
      );
    }
  }

  private buildEquifaxReportHtml(data: {
    user: User & { userDetails: UserDetails };
    formatDate: (value: any) => string;
    score: string;
    scoreGrade: string;
    totalAccounts: number;
    activeAccounts: number;
    closedAccounts: number;
    writeOffs: number;
    settlements: number;
    formatCurrency: (value: any) => string;
    totalDisbursed: number;
    totalBalance: number;
    overDueAmount: number;
    accountsTableHtml: string;
    inquiriesTableHtml: string;
  }): string {
    const {
      user,
      formatDate,
      score,
      scoreGrade,
      totalAccounts,
      activeAccounts,
      closedAccounts,
      writeOffs,
      settlements,
      formatCurrency,
      totalDisbursed,
      totalBalance,
      overDueAmount,
      accountsTableHtml,
      inquiriesTableHtml,
    } = data;
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Equifax Credit Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; background: #f5f5f5; color: #333; line-height: 1.6; }
        .container { max-width: 900px; margin: 0 auto; padding: 20px; background: white; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #c41e3a; }
        .report-title { font-size: 24px; font-weight: bold; color: #c41e3a; margin-bottom: 10px; }
        .report-subtitle { font-size: 14px; color: #666; }
        .section { margin-bottom: 30px; }
        .section-title { font-size: 16px; font-weight: bold; color: #c41e3a; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px; }
        .info-item { padding: 12px; background: #f9fafb; border-left: 3px solid #c41e3a; border-radius: 4px; }
        .info-label { font-size: 12px; color: #666; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 4px; }
        .info-value { font-size: 14px; color: #333; font-weight: 500; }
        .score-box { background: linear-gradient(135deg, #c41e3a, #e63946); color: white; padding: 30px; border-radius: 8px; text-align: center; margin: 20px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: center; }
        .score-item { text-align: center; }
        .score-label { font-size: 14px; opacity: 0.9; margin-bottom: 8px; }
        .score-value { font-size: 36px; font-weight: bold; }
        .score-grade { font-size: 28px; font-weight: bold; margin-top: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 13px; }
        table thead { background: #c41e3a; color: white; }
        table th { padding: 12px; text-align: left; font-weight: 600; }
        table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
        table tbody tr:hover { background: #f9fafb; }
        table tbody tr:nth-child(even) { background: #f9fafb; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status-active { background: #d1fae5; color: #065f46; }
        .status-closed { background: #f3f4f6; color: #374151; }
        .status-error { background: #fee2e2; color: #991b1b; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
        .summary-card { background: linear-gradient(135deg, #ffe5e5, #ffcccc); padding: 15px; border-radius: 8px; border-left: 4px solid #c41e3a; }
        .summary-card-label { font-size: 12px; color: #666; font-weight: 600; margin-bottom: 8px; text-transform: uppercase; }
        .summary-card-value { font-size: 20px; font-weight: bold; color: #c41e3a; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; font-size: 12px; color: #666; text-align: center; }
        .risk-warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; border-radius: 4px; color: #92400e; }
        .user-info { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
        .user-info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; font-size: 13px; }
        .user-info-item { display: flex; flex-direction: column; }
        .user-info-label { font-weight: 600; color: #666; margin-bottom: 4px; }
        .user-info-value { color: #333; }
        @media (max-width: 768px) { .info-grid { grid-template-columns: 1fr; } .summary-grid { grid-template-columns: repeat(2, 1fr); } .score-box { grid-template-columns: 1fr; } .user-info-grid { grid-template-columns: 1fr; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="report-title">Equifax – Credit Information Report</div>
            <div class="report-subtitle">Bureau Report for Credit Decision</div>
        </div>

        <div class="user-info">
            <div class="user-info-grid">
                <div class="user-info-item">
                    <div class="user-info-label">Name</div>
                    <div class="user-info-value">${user.userDetails.firstName} ${user.userDetails.middleName || ""} ${user.userDetails.lastName}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Date of Birth</div>
                    <div class="user-info-value">${formatDate(user.userDetails.dateOfBirth)}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Phone</div>
                    <div class="user-info-value">${user.phoneNumber}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Email</div>
                    <div class="user-info-value">${user.email}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">City</div>
                    <div class="user-info-value">${user.userDetails.city || "N/A"}</div>
                </div>
                <div class="user-info-item">
                    <div class="user-info-label">Address</div>
                    <div class="user-info-value">${user.userDetails.address || "N/A"}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">🎯 Credit Score</div>
            <div class="score-box">
                <div class="score-item">
                    <div class="score-label">Your CIBIL Score</div>
                    <div class="score-value">${score}</div>
                </div>
                <div class="score-item">
                    <div class="score-label">Score Grade</div>
                    <div class="score-grade">${scoreGrade}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">📊 Account Summary</div>
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-card-label">Total Accounts</div>
                    <div class="summary-card-value">${totalAccounts}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Active Accounts</div>
                    <div class="summary-card-value">${activeAccounts}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Closed Accounts</div>
                    <div class="summary-card-value">${closedAccounts}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Write-offs</div>
                    <div class="summary-card-value">${writeOffs}</div>
                </div>
            </div>

            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-card-label">Total Disbursed</div>
                    <div class="summary-card-value">${formatCurrency(totalDisbursed)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Current Balance</div>
                    <div class="summary-card-value">${formatCurrency(totalBalance)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Overdue Amount</div>
                    <div class="summary-card-value">${formatCurrency(overDueAmount)}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Settlements</div>
                    <div class="summary-card-value">${settlements}</div>
                </div>
            </div>

            ${this.getRiskWarningHtml(overDueAmount, formatCurrency)}
        </div>

        ${accountsTableHtml}
        ${inquiriesTableHtml}

        <div class="section">
            <div class="section-title">✅ Report Status</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Report Generated</div>
                    <div class="info-value">${formatDate(new Date())}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Bureau</div>
                    <div class="info-value">Equifax</div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>This is a computer-generated report and is accurate as of ${new Date().toLocaleString()}.</p>
            <p style="margin-top: 10px; font-size: 11px; color: #999;">
                This report contains confidential information. If you have received this report in error, please contact support immediately.
            </p>
        </div>
    </div>
</body>
</html>`;
  }

  private getAccountStatusClass(status: any): string {
    const isActive = status === "Active" || status === "11";
    if (isActive) {
      return "status-active";
    }
    const isClosed = status === "Closed" || status === "12";
    if (isClosed) {
      return "status-closed";
    }
    return "status-error";
  }

  private getRiskWarningHtml(
    overDueAmount: number,
    formatCurrency: (value: any) => string,
  ): string {
    if (overDueAmount <= 0) {
      return "";
    }
    return `<div class="risk-warning">
        <strong>⚠️ Alert:</strong> Outstanding overdue amount of ${formatCurrency(overDueAmount)} detected. Please clear pending dues.
    </div>`;
  }

  private generateAccountsTable(
    accountDetails: any[],
    formatCurrency: (value: any) => string,
  ): string {
    if (accountDetails.length === 0) {
      return "";
    }
    const accountRows = accountDetails
      .slice(0, 15)
      .map((account: any) => this.generateAccountRow(account, formatCurrency))
      .join("");
    const noteText =
      accountDetails.length > 15
        ? `Showing 15 of ${accountDetails.length} accounts`
        : "";
    return `<div class="section">
        <div class="section-title">💳 Account Details</div>
        <table>
            <thead>
                <tr>
                    <th>Account Type</th>
                    <th>Institution</th>
                    <th>Ownership</th>
                    <th>Sanctioned Amount</th>
                    <th>Current Balance</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${accountRows}
            </tbody>
        </table>
        ${noteText ? `<p style="color: #666; font-size: 12px; margin-top: 10px;">${noteText}</p>` : ""}
    </div>`;
  }

  private generateAccountRow(
    account: any,
    formatCurrency: (value: any) => string,
  ): string {
    const statusClass = this.getAccountStatusClass(account.AccountStatus);
    return `<tr>
        <td>${account.AccountType || "N/A"}</td>
        <td>${account.Institution || "N/A"}</td>
        <td>${account.OwnershipType || "N/A"}</td>
        <td style="text-align: right;">${formatCurrency(account.HighCredit)}</td>
        <td style="text-align: right;">${formatCurrency(account.CurrentBalance)}</td>
        <td><span class="status-badge ${statusClass}">${account.AccountStatus || "Unknown"}</span></td>
    </tr>`;
  }

  private generateInquiriesTable(
    inquiriesDetails: any[],
    formatCurrency: (value: any) => string,
    formatDate: (value: any) => string,
  ): string {
    if (inquiriesDetails.length === 0) {
      return "";
    }
    const inquiryRows = inquiriesDetails
      .slice(0, 10)
      .map((inquiry: any) =>
        this.generateInquiryRow(inquiry, formatCurrency, formatDate),
      )
      .join("");
    const noteText =
      inquiriesDetails.length > 10
        ? `Showing 10 of ${inquiriesDetails.length} inquiries`
        : "";
    return `<div class="section">
        <div class="section-title">🔎 Recent Credit Inquiries</div>
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Institution</th>
                    <th>Amount</th>
                    <th>Purpose</th>
                    <th>Type</th>
                </tr>
            </thead>
            <tbody>
                ${inquiryRows}
            </tbody>
        </table>
        ${noteText ? `<p style="color: #666; font-size: 12px; margin-top: 10px;">${noteText}</p>` : ""}
    </div>`;
  }

  private generateInquiryRow(
    inquiry: any,
    formatCurrency: (value: any) => string,
    formatDate: (value: any) => string,
  ): string {
    return `<tr>
        <td>${formatDate(inquiry.Date)}</td>
        <td>${inquiry.Institution || "N/A"}</td>
        <td style="text-align: right;">${formatCurrency(inquiry.Amount)}</td>
        <td>${inquiry.Purpose || "N/A"}</td>
        <td>${inquiry.InquiryType || "N/A"}</td>
    </tr>`;
  }
}
