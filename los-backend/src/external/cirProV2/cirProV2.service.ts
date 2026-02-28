import { HttpService } from "@nestjs/axios";
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import * as fs from "fs";
import * as path from "path";
import { CirProV2Config } from "./interface/cirProV2-config.modules";
import { PrismaService } from "src/prisma/prisma.service";
import { v4 as uuidV4 } from "uuid";
import { PdfService } from "src/core/pdf/pdf.service";
import { AwsPrivateS3Service } from "src/core/aws/s3/aws-private-s3.service";
import { searchState } from "src/constant/stateCode";
import {
  extractCreditScore,
  SCORE_EXTRACTION_PATTERNS,
} from "src/utils/creditScore.utils";
import { v4 as uuidv4 } from "uuid";
import { gzip } from "zlib";
import { promisify } from "util";

@Injectable()
export class CirProV2Service {
  private readonly logger = new Logger(CirProV2Service.name);
  private readonly gzipAsync = promisify(gzip);

  // Postgres text/jsonb cannot contain \u0000. Some vendors occasionally return it.
  private sanitizeForPostgres<T>(input: T): T {
    try {
      // Fast path: stringify + strip null bytes + parse back.
      // This removes \u0000 anywhere inside nested strings.
      return JSON.parse(JSON.stringify(input).replace(/\u0000/g, "")) as T;
    } catch {
      // If anything goes wrong, don't block the flow; return input as-is.
      return input;
    }
  }

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    @Inject("CIR_PRO_V2_CONFIG") private readonly config: CirProV2Config,
    private readonly awsPrivateS3Service: AwsPrivateS3Service,
  ) {}

  async fetchCreditReport(brandId: string, userId: string): Promise<any> {
    try {
      // Validate configuration
      this.validateConfig();

      if (!userId) {
        // this.logger.error("User ID is required to fetch CIR PRO V2 report");
        throw new BadRequestException(
          "User ID is required to fetch CIR PRO V2 report",
        );
      }

      if (!brandId) {
        // this.logger.error("Brand ID is required to fetch CIR PRO V2 report");
        throw new BadRequestException(
          "Brand ID is required to fetch CIR PRO V2 report",
        );
      }
      const existingReport = await this.getExistingCirProV2Report(userId);
      if (existingReport) {
        // this.logger.log(
        //   `Returning existing CIR PRO V2 report for user ${userId} from last month`
        // );
        // update score in user details
        const creditScore = extractCreditScore(
          existingReport.rawReportJson,
          SCORE_EXTRACTION_PATTERNS.CIR_PRO_V2,
        );
        if (creditScore !== null) {
          await this.prisma.userDetails.update({
            where: { userId },
            data: { creditScore },
          });
        }
        return existingReport;
      }
      const url = this.config.baseUrl;

      if (!url) {
        throw new BadRequestException(
          "CIR PRO V2 service is not properly configured",
        );
      }

      const headers: Record<string, string> = {
        "USER-ID": this.config.userId,
        PASSWORD: this.config.password,
        "CUSTOMER-ID": this.config.customerId,
        "Content-Type": "application/json",
        "PRODUCT-TYPE": "CIR PRO V2",
        "PRODUCT-VER": "2.0",
      };

      const payload = await this.buildPayload(userId);
      const { data } = await firstValueFrom(
        this.httpService.post(url, payload, { headers }),
      );
      const sanitizedData = this.sanitizeForPostgres(data);
      if (sanitizedData?.["RESULT"] === "ERROR") {
        throw new BadRequestException(
          `CIR PRO V2 Error: ${sanitizedData?.["MESSAGE"] || "Unknown error"}`,
        );
      }
      const statusList = sanitizedData?.["CIR-REPORT-FILE"]?.["REQUEST-STATUS"];
      if (Array.isArray(statusList)) {
        const cirStatus = statusList.find((s) => s.TYPE === "CIR");

        if (cirStatus?.STATUS === "ERROR") {
          const errorMessages = (cirStatus.ERRORS || [])
            .map((err) => `${err.ERROR}: ${err.INFO}`)
            .join(", ");
          // this.logger.error(
          //   `CRIF CIR PRO V2 API-Level Error: ${JSON.stringify(errorMessages)}`
          // );
          throw new BadRequestException(
            `CIR PRO V2 Error: ${errorMessages || "Unknown error"}`,
          );
        }
      }

      const printableReport =
        sanitizedData?.["CIR-REPORT-FILE"]?.["PRINTABLE-REPORT"];
      if (!printableReport || !printableReport.CONTENT) {
        // this.logger.error(
        //   `Printable report is missing in response for user: ${userId}`
        // );
        throw new BadRequestException(
          "Printable report is missing in CIR PRO V2 response",
        );
      }
      const awsUrl = await this.htmlToPdf(printableReport, brandId, userId);
      if (!awsUrl?.success) {
        throw new BadRequestException(
          `Failed to generate PDF report: ${awsUrl?.error}`,
        );
      }

      const creditScore = extractCreditScore(
        sanitizedData,
        SCORE_EXTRACTION_PATTERNS.CIR_PRO_V2,
      );
      if (creditScore !== null) {
        await this.prisma.userDetails.update({
          where: { userId },
          data: { creditScore },
        });
      }

      const [cibil_html_key, cibil_json_gz_key] = await Promise.all([
        // HTML upload
        (async () => {
          if (!data?.htmlContent) return null;
          try {
            const htmlBuffer = Buffer.from(data.htmlContent, "utf-8");
            const result = await this.awsPrivateS3Service.uploadPrivateDocument(
              {
                buffer: htmlBuffer,
                originalname: `cirprov2-cibil-report-${userId}.html`,
                mimetype: "text/html",
                size: htmlBuffer.length,
                fieldname: "file",
                encoding: "7bit",
                stream: null,
                destination: "",
                filename: `cirprov2-cibil-report-${userId}.html`,
                path: "",
              } as Express.Multer.File,
              brandId,
              userId,
              uuidv4(),
              "CIBIL",
            );
            this.logger.log(
              `CIR PRO V2 HTML uploaded for user ${userId}. Key: ${result.key}`,
            );
            return result.key;
          } catch (err) {
            this.logger.error(
              `Failed to upload CIR PRO V2 HTML for user ${userId}: ${err.message}`,
            );
            return null;
          }
        })(),

        // JSON.GZ upload (without htmlContent)
        (async () => {
          try {
            const { htmlContent, ...responseWithoutHtml } = data;
            const gzipBuffer = await this.gzipAsync(
              JSON.stringify(responseWithoutHtml),
            );
            const result = await this.awsPrivateS3Service.uploadPrivateDocument(
              {
                buffer: gzipBuffer,
                originalname: `cirprov2-cibil-report-${userId}.json.gz`,
                mimetype: "application/gzip",
                size: gzipBuffer.length,
                fieldname: "file",
                encoding: "7bit",
                stream: null,
                destination: "",
                filename: `cirprov2-cibil-report-${userId}.json.gz`,
                path: "",
              } as Express.Multer.File,
              brandId,
              userId,
              uuidv4(),
              "CIBIL",
            );
            this.logger.log(
              `CIR PRO V2 JSON.GZ uploaded for user ${userId}. Key: ${result.key}`,
            );
            return result.key;
          } catch (err) {
            this.logger.error(
              `Failed to upload CIR PRO V2 JSON.GZ for user ${userId}: ${err.message}`,
            );
            return null;
          }
        })(),
      ]);
      // Generate HTML report from response JSON
      const [generated_cibil_report_html_key] = await Promise.all([
        (async () => {
          try {
            const htmlReport = this.generateCibilReportHtml(sanitizedData);
            const htmlBuffer = Buffer.from(htmlReport, "utf-8");
            const result = await this.awsPrivateS3Service.uploadPrivateDocument(
              {
                buffer: htmlBuffer,
                originalname: `cirprov2-generated-report-${userId}.html`,
                mimetype: "text/html",
                size: htmlBuffer.length,
                fieldname: "file",
                encoding: "7bit",
                stream: null,
                destination: "",
                filename: `cirprov2-generated-report-${userId}.html`,
                path: "",
              } as Express.Multer.File,
              brandId,
              userId,
              uuidv4(),
              "CIBIL",
            );
            this.logger.log(
              `CIR PRO V2 generated HTML report uploaded for user ${userId}. Key: ${result.key}`,
            );
            return result.key;
          } catch (err) {
            this.logger.error(
              `Failed to generate and upload CIR PRO V2 HTML report for user ${userId}: ${err.message}`,
            );
            return null;
          }
        })(),
      ]);

      let cirProV2 = await this.prisma.cirProV2SomeTable.create({
        data: {
          userId,
          reportDocumentUrl: awsUrl?.url || "",
          cibil_html_key: cibil_html_key || null,
          cibil_json_gz_key: cibil_json_gz_key || null, //
          generated_cibil_report_html_key: generated_cibil_report_html_key || null,
          uploadedAt: new Date(),
        },
      });

      try {
        // Save CIR PRO V2 response to file
        cirProV2 = await this.prisma.cirProV2SomeTable.update({
          where: { id: cirProV2.id },
          data: {
            rawReportJson: sanitizedData,
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to save raw CIR PRO V2 report JSON for user ${userId}: ${error?.message}`,
        );
      }

      return cirProV2;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error?.response?.status) {
        throw new BadRequestException(
          `API Error (${error.response.status}): ${
            error.response.data?.message ||
            error.response.data?.error ||
            error.message
          }`,
        );
      }
      throw new BadRequestException(
        `Failed to fetch CIR PRO V2 report: ${error?.message || "Unknown error"}`,
      );
    }
  }

  private async buildPayload(userId: string): Promise<any> {
    try {
      if (!userId) {
        // this.logger.error("User ID is missing");
        throw new BadRequestException("User ID is required");
      }

      const loan = await this.prisma.loan.findFirst({
        where: {
          userId,
        },
        include: {
          loanDetails: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!loan) {
        // this.logger.error(
        //   `No pending loan found for user: ${userId}. CIR PRO V2 report requires an active loan.`
        // );
        throw new BadRequestException(
          "No pending loan found for the user. A pending loan is required to fetch the CIR PRO V2 report.",
        );
      }

      if (!loan.loanDetails) {
        // this.logger.error(`Loan details missing for loan: ${loan.id}`);
        throw new BadRequestException("Loan details are missing");
      }

      if (!loan.amount) {
        // this.logger.error(`Loan amount is missing for loan: ${loan.id}`);
        throw new BadRequestException("Loan amount is required");
      }

      const now = new Date();
      const formattedDateTime = this.formatDateTime(now);

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          userDetails: true,
          documents: {
            where: { type: "PAN" },
            select: { documentNumber: true },
          },
        },
      });

      if (!user) {
        // this.logger.error(`User not found: ${userId}`);
        throw new BadRequestException("User not found");
      }

      if (!user.userDetails) {
        // this.logger.error(`User details not found for user: ${userId}`);
        throw new BadRequestException("User details not found");
      }

      if (!user.phoneNumber) {
        // this.logger.error(`Phone number missing for user: ${userId}`);
        throw new BadRequestException("User phone number is required");
      }

      const panNumber = user.documents?.[0]?.documentNumber;
      if (!panNumber) {
        // this.logger.error(`PAN not found for user: ${userId}`);
        throw new BadRequestException(
          "PAN document is required to fetch CIR PRO V2 report",
        );
      }

      if (!user.userDetails.firstName) {
        // this.logger.error(`First name missing for user: ${userId}`);
        throw new BadRequestException("User first name is required");
      }

      if (!user.userDetails.lastName) {
        // this.logger.error(`Last name missing for user: ${userId}`);
        throw new BadRequestException("User last name is required");
      }

      if (!user.userDetails.dateOfBirth) {
        // this.logger.error(`Date of birth missing for user: ${userId}`);
        throw new BadRequestException("User date of birth is required");
      }

      if (!user.userDetails.address) {
        // this.logger.error(`Address missing for user: ${userId}`);
        throw new BadRequestException("User address is required");
      }

      if (!user.userDetails.pincode) {
        // this.logger.error(`PIN code missing for user: ${userId}`);
        throw new BadRequestException("User PIN code is required");
      }

      const stateCode = searchState(user.userDetails.state)?.code;
      if (!stateCode) {
        // this.logger.error(`Invalid state code for user: ${userId}`);
        throw new BadRequestException("Invalid user state");
      }

      const formattedAddress = user.userDetails.address
        .replace(/\r\n/g, " ") // Replace Windows line endings (\r\n) with space
        .replace(/\r/g, " ") // Replace carriage returns (\r) with space
        .replace(/\n/g, " ") // Replace newlines (\n) with space
        .replace(/\s+/g, " ") // Replace multiple spaces with single space
        .replace(/[,\s]*,[,\s]*/g, ", ") // Normalize commas with spaces around them
        .trim();

      return {
        "REQUEST-FILE": {
          "HEADER-SEGMENT": {
            "PRODUCT-TYPE": "CIR PRO V2",
            "PRODUCT-VER": "2.0",
            "USER-ID": this.config.userId,
            "USER-PWD": this.config.password,
            "REQ-MBR": this.config.customerId,
            "INQ-DT-TM": formattedDateTime,
            "REQ-VOL-TYPE": "C04",
            "REQ-ACTN-TYPE": "AT01",
            "AUTH-FLG": "Y",
            "AUTH-TITLE": "USER",
            "RES-FRMT-EMBD": "Y",
            "RES-FRMT": "HTML",
            "MEMBER-PREF-OVERRIDE": "N",
            "LOS-NAME": "INHOUSE",
            "LOS-VENDOR": "",
            "LOS-VERSION": "",
            "REQ-SERVICES-TYPE": "CIR",
          },
          INQUIRY: {
            "APPLICANT-SEGMENT": {
              "APPLICANT-ID": user.id,
              "FIRST-NAME": user.userDetails.firstName,
              "MIDDLE-NAME": user.userDetails.middleName || "",
              "LAST-NAME": user.userDetails.lastName,
              DOB: {
                "DOB-DT": this.formatDate(user.userDetails.dateOfBirth),
                AGE: "",
                "AGE-AS-ON": "",
              },
              IDS: [
                {
                  TYPE: "ID07",
                  VALUE: panNumber,
                },
              ],
              ADDRESSES: [
                {
                  TYPE: "D01",
                  "ADDRESS-TEXT": formattedAddress,
                  CITY: user.userDetails.city || "",
                  STATE: stateCode,
                  LOCALITY: "",
                  PIN: user.userDetails.pincode,
                  COUNTRY: "INDIA",
                },
              ],
              PHONES: [
                {
                  TYPE: "P03",
                  VALUE: user.phoneNumber,
                },
              ],
            },
            "APPLICATION-SEGMENT": {
              "INQUIRY-UNIQUE-REF-NO": uuidV4(),
              "CREDIT-RPT-ID": "",
              "CREDIT-RPT-TRN-DT-TM": formattedDateTime,
              "CREDIT-INQ-PURPS-TYPE": "CP01",
              "CREDIT-INQUIRY-STAGE": "PRE-SCREEN",
              "APPLICATION-ID": uuidV4(),
              "LOAN-AMT": loan.amount.toString(),
              TERM: loan.loanDetails.durationDays?.toString() || "0",
              "LOAN-TYPE": "A01",
            },
          },
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // this.logger.error(
      //   `Error building payload for user ${userId}: ${error?.message}`
      // );
      throw new BadRequestException(
        `Failed to prepare request: ${error?.message || "Unknown error"}`,
      );
    }
  }

  async htmlToPdf(apiResponse: any, brandId: string, userId: string) {
    try {
      if (!apiResponse) {
        const errorMsg = "API response is null or undefined";
        // this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      if (!apiResponse.CONTENT) {
        const errorMsg = "PDF content is missing in API response";
        // this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      let base64Content = Array.isArray(apiResponse.CONTENT)
        ? apiResponse.CONTENT[0]
        : apiResponse.CONTENT;

      if (!base64Content) {
        const errorMsg = "Base64 content is empty";
        // this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Log the type and first 100 chars for debugging
      // this.logger.debug(
      //   `CONTENT type: ${typeof base64Content}, length: ${
      //     typeof base64Content === "string" ? base64Content.length : "N/A"
      //   }, first 100 chars: ${
      //     typeof base64Content === "string"
      //       ? base64Content.substring(0, 100)
      //       : JSON.stringify(base64Content).substring(0, 100)
      //   }`
      // );

      let htmlContent: string;
      try {
        let decodedString: string;

        // The API returns HTML as a raw string, not base64
        if (typeof base64Content === "string") {
          decodedString = base64Content;

          // Check if it looks like base64 (long alphanumeric string without HTML tags)
          const isLikelyBase64 =
            !base64Content.includes("<") &&
            !base64Content.includes(">") &&
            base64Content.length > 100;

          if (isLikelyBase64) {
            // this.logger.debug("Content appears to be base64 encoded, attempting decode...");
            try {
              const buffer = Buffer.from(base64Content, "base64");
              const decodedTest = buffer.toString("utf-8");
              if (
                decodedTest &&
                decodedTest.trim().length > 0 &&
                (decodedTest.includes("<") || decodedTest.includes(">"))
              ) {
                decodedString = decodedTest;
              }
            } catch (e) {
              this.logger.debug("Base64 decode failed, using original content");
            }
          } else {
            this.logger.debug("Content is already HTML (not base64 encoded)");
          }
        } else if (Buffer.isBuffer(base64Content)) {
          decodedString = base64Content.toString("utf-8");
        } else {
          decodedString = JSON.stringify(base64Content);
        }

        htmlContent = decodedString;

        // Validate that decoded content is valid HTML
        if (!htmlContent || htmlContent.trim().length === 0) {
          const errorMsg = "Decoded HTML content is empty";
          // this.logger.error(errorMsg);
          throw new Error(errorMsg);
        }

        // Basic validation that it looks like HTML
        if (!htmlContent.includes("<") && !htmlContent.includes(">")) {
          const errorMsg = "Decoded content does not appear to be HTML";
          // this.logger.error(
          //   `${errorMsg}. First 200 chars: ${htmlContent.substring(0, 200)}`
          // );
          throw new Error(errorMsg);
        }

        // this.logger.debug(
        //   `Successfully decoded HTML content (${htmlContent.length} characters) for user: ${userId}`
        // );

        // Save HTML to file for verification
        // await this.saveHtmlToFile(htmlContent, userId);
      } catch (decodeError) {
        this.logger.error(
          `Failed to process PDF content for user: ${userId}. Error: ${decodeError?.message}`,
          decodeError,
        );
        throw new Error(
          `Failed to process PDF content: ${decodeError?.message || "Unknown error"}`,
        );
      }

      // Generate PDF from HTML
      const url = await this.pdfService.generatePdfFromHtml(
        htmlContent,
        brandId,
        userId,
      );

      if (!url || typeof url !== "string") {
        const errorMsg = `PDF generation returned invalid URL: ${url}`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Validate that the URL is a proper S3 URL
      if (!url.startsWith("https://")) {
        const errorMsg = `PDF URL is not HTTPS: ${url}`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }

      // Upload HTML file to private S3
      let htmlDocumentUrl = "";
      try {
        const htmlBuffer = Buffer.from(htmlContent, "utf-8");
        const documentId = uuidv4();

        const uploadResult =
          await this.awsPrivateS3Service.uploadPrivateDocument(
            {
              buffer: htmlBuffer,
              originalname: `cirprov2-report-${userId}.html`,
              mimetype: "text/html",
              size: htmlBuffer.length,
              fieldname: "file",
              encoding: "7bit",
              stream: null,
              destination: "",
              filename: `cirprov2-report-${userId}.html`,
              path: "",
            } as Express.Multer.File,
            brandId,
            userId,
            documentId,
            "CIBIL",
          );

        htmlDocumentUrl = uploadResult.key;

        this.logger.log(
          `CIR PRO V2 HTML report uploaded successfully for user ${userId}. Key: ${uploadResult.key}`,
        );
      } catch (uploadError) {
        this.logger.error(
          `Failed to upload CIR PRO V2 HTML report for user ${userId}: ${uploadError.message}`,
        );
        // Continue without the HTML upload - don't fail the entire operation
      }

      // this.logger.log(
      //   `PDF generated successfully for user: ${userId}. URL: ${url}`
      // );
      return { success: true, url, htmlDocumentUrl };
    } catch (error) {
      const errorMessage =
        error?.message || "Unknown error during PDF generation";
      // this.logger.error(
      //   `PDF generation failed for user: ${userId}. Error: ${errorMessage}`,
      //   error
      // );
      return {
        success: false,
        error: errorMessage,
        details: error?.stack,
      };
    }
  }

  private formatDate(date: string | Date): string {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  private getExistingCirProV2Report(userId: string) {
    try {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      return this.prisma.cirProV2SomeTable.findFirst({
        where: {
          userId,
          uploadedAt: {
            gte: oneMonthAgo,
          },
        },
        orderBy: {
          uploadedAt: "desc",
        },
      });
    } catch (error) {
      this.logger.error(
        `Error fetching existing CIR PRO V2 report for user ${userId}: ${error?.message}`,
      );
      return null;
    }
  }

  private validateConfig(): void {
    if (!this.config.baseUrl) {
      throw new BadRequestException("CIR PRO V2 base URL is not configured");
    }
    if (!this.config.userId) {
      throw new BadRequestException("CIR PRO V2 user ID is not configured");
    }
    if (!this.config.password) {
      throw new BadRequestException("CIR PRO V2 password is not configured");
    }
    if (!this.config.customerId) {
      throw new BadRequestException("CIR PRO V2 customer ID is not configured");
    }
  }
  private formatDateTime(date: Date): string {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  }

  private async saveResponseToFile(data: any, userId: string): Promise<void> {
    try {
      const crifFolderPath = path.join(process.cwd(), "crif");

      // Create crif folder if it doesn't exist
      if (!fs.existsSync(crifFolderPath)) {
        fs.mkdirSync(crifFolderPath, { recursive: true });
      }

      const timestamp = Date.now();
      const fileName = `${userId}_${timestamp}.json`;
      const filePath = path.join(crifFolderPath, fileName);

      // Write response data to file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

      // this.logger.log(`CIR PRO V2 response saved to file: ${filePath}`);
    } catch (error) {
      this.logger.error(
        `Failed to save CIR PRO V2 response to file for user ${userId}: ${error?.message}`,
      );
      // Don't throw - log only to prevent blocking the main flow
    }
  }

  private async saveHtmlToFile(
    htmlContent: string,
    userId: string,
  ): Promise<void> {
    try {
      const htmlFolderPath = path.join(process.cwd(), "crif", "html");

      // Create html folder if it doesn't exist
      if (!fs.existsSync(htmlFolderPath)) {
        fs.mkdirSync(htmlFolderPath, { recursive: true });
      }

      const timestamp = Date.now();
      const fileName = `${userId}_${timestamp}.html`;
      const filePath = path.join(htmlFolderPath, fileName);

      // Write HTML content to file
      fs.writeFileSync(filePath, htmlContent, "utf-8");

      // this.logger.log(`HTML content saved to file for verification: ${filePath}`);
    } catch (error) {
      this.logger.error(
        `Failed to save HTML content to file for user ${userId}: ${error?.message}`,
      );
      // Don't throw - log only to prevent blocking the main flow
    }
  }

  private async savePrintableReportToFile(
    printableReport: any,
    userId: string,
  ): Promise<void> {
    try {
      const reportFolderPath = path.join(
        process.cwd(),
        "crif",
        "printable-reports",
      );

      // Create folder if it doesn't exist
      if (!fs.existsSync(reportFolderPath)) {
        fs.mkdirSync(reportFolderPath, { recursive: true });
      }

      const timestamp = Date.now();
      const fileName = `${userId}_${timestamp}.json`;
      const filePath = path.join(reportFolderPath, fileName);

      // Write printable report to file
      fs.writeFileSync(
        filePath,
        JSON.stringify(printableReport, null, 2),
        "utf-8",
      );

      // this.logger.log(`Printable report saved to file for inspection: ${filePath}`);
    } catch (error) {
      this.logger.error(
        `Failed to save printable report to file for user ${userId}: ${error?.message}`,
      );
      // Don't throw - log only to prevent blocking the main flow
    }
  }

  private generateCibilReportHtml(reportJson: any): string {
    try {
      const cirReportFile = reportJson?.["CIR-REPORT-FILE"] || {};
      const requestData = cirReportFile?.["REQUEST-DATA"] || {};
      const reportData = cirReportFile?.["REPORT-DATA"] || {};
      const standardData = reportData?.["STANDARD-DATA"] || {};

      // Extract applicant details
      const applicant = requestData?.["APPLICANT-SEGMENT"] || {};
      const application = requestData?.["APPLICATION-SEGMENT"] || {};
      const accountsSummary = reportData?.["ACCOUNTS-SUMMARY"]?.["PRIMARY-ACCOUNTS-SUMMARY"] || {};
      const tradelines = standardData?.["TRADELINES"] || [];
      const inquiryHistory = standardData?.["INQUIRY-HISTORY"] || [];
      const scores = standardData?.["SCORE"] || [];
      const requestStatus = cirReportFile?.["REQUEST-STATUS"] || [];

      // Helper functions
      const extractId = (type: string): string => {
        const id = applicant?.["IDS"]?.find((i: any) => i["TYPE"] === type);
        return id?.["VALUE"] || "N/A";
      };

      const extractPhone = (): string => {
        const phone = applicant?.["PHONES"]?.[0];
        return phone?.["VALUE"] || "N/A";
      };

      const extractAddress = (): string => {
        const address = applicant?.["ADDRESSES"]?.[0];
        if (!address) return "N/A";
        const parts = [
          address["ADDRESS-TEXT"],
          address["CITY"],
          address["STATE"],
          address["PIN"],
        ].filter(Boolean);
        return parts.join(", ");
      };

      const formatCurrency = (value: any): string => {
        if (!value) return "₹0";
        const num = parseFloat(value.toString().replace(/,/g, ""));
        return isNaN(num) ? "₹0" : `₹${num.toLocaleString("en-IN")}`;
      };

      const formatDate = (dateStr: string): string => {
        if (!dateStr) return "N/A";
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          return `${parts[0]}-${parts[1]}-${parts[2]}`;
        }
        return dateStr;
      };

      const getScoreValue = (): string => {
        if (scores.length > 0) {
          return scores[0]["VALUE"] || "N/A";
        }
        return "N/A";
      };

      const getCirStatus = (): string => {
        const cirStatus = requestStatus.find((s: any) => s["TYPE"] === "CIR");
        return cirStatus?.["STATUS"] || "Unknown";
      };

      // Generate HTML
      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CIR PRO V2 Credit Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: white;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #1e40af;
        }

        .report-title {
            font-size: 24px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 10px;
        }

        .report-subtitle {
            font-size: 14px;
            color: #666;
        }

        .section {
            margin-bottom: 30px;
        }

        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 15px;
        }

        .info-item {
            padding: 12px;
            background: #f9fafb;
            border-left: 3px solid #1e40af;
            border-radius: 4px;
        }

        .info-label {
            font-size: 12px;
            color: #666;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 4px;
        }

        .info-value {
            font-size: 14px;
            color: #333;
            font-weight: 500;
        }

        .highlight {
            color: #1e40af;
            font-weight: bold;
        }

        .score-box {
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
        }

        .score-label {
            font-size: 14px;
            opacity: 0.9;
            margin-bottom: 8px;
        }

        .score-value {
            font-size: 36px;
            font-weight: bold;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 13px;
        }

        table thead {
            background: #1e40af;
            color: white;
        }

        table th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }

        table td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }

        table tbody tr:hover {
            background: #f9fafb;
        }

        table tbody tr:nth-child(even) {
            background: #f9fafb;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }

        .status-active {
            background: #d1fae5;
            color: #065f46;
        }

        .status-closed {
            background: #f3f4f6;
            color: #374151;
        }

        .status-error {
            background: #fee2e2;
            color: #991b1b;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin: 20px 0;
        }

        .summary-card {
            background: linear-gradient(135deg, #f0f4ff, #e0e7ff);
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #1e40af;
        }

        .summary-card-label {
            font-size: 12px;
            color: #666;
            font-weight: 600;
            margin-bottom: 8px;
            text-transform: uppercase;
        }

        .summary-card-value {
            font-size: 20px;
            font-weight: bold;
            color: #1e40af;
        }

        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            font-size: 12px;
            color: #666;
            text-align: center;
        }

        .risk-warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
            color: #92400e;
        }

        @media print {
            body {
                background: white;
            }
            .container {
                max-width: 100%;
                margin: 0;
                padding: 0;
            }
        }

        @media (max-width: 768px) {
            .info-grid {
                grid-template-columns: 1fr;
            }
            .summary-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            table {
                font-size: 12px;
            }
            table th, table td {
                padding: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="report-title">CIR PRO V2 – Credit Information Report</div>
            <div class="report-subtitle">Comprehensive Credit Analysis Report</div>
        </div>

        <!-- Applicant Details Section -->
        <div class="section">
            <div class="section-title">📋 Applicant Details</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Full Name</div>
                    <div class="info-value">
                        ${applicant?.["FIRST-NAME"] || ""} 
                        ${applicant?.["MIDDLE-NAME"] || ""} 
                        ${applicant?.["LAST-NAME"] || ""}
                    </div>
                </div>
                <div class="info-item">
                    <div class="info-label">Date of Birth</div>
                    <div class="info-value">${formatDate(applicant?.["DOB"]?.["DOB-DT"] || "")}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">PAN</div>
                    <div class="info-value">${extractId("ID07")}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Phone</div>
                    <div class="info-value">${extractPhone()}</div>
                </div>
                <div class="info-item" style="grid-column: 1 / -1;">
                    <div class="info-label">Address</div>
                    <div class="info-value">${extractAddress()}</div>
                </div>
            </div>
        </div>

        <!-- Credit Score Section -->
        <div class="section">
            <div class="section-title">🎯 Credit Score</div>
            <div class="score-box">
                <div class="score-label">Your CIBIL Score</div>
                <div class="score-value">${getScoreValue()}</div>
            </div>
        </div>

        <!-- Loan/Application Details -->
        <div class="section">
            <div class="section-title">💼 Loan Application Details</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Loan Amount Applied</div>
                    <div class="info-value highlight">${formatCurrency(application?.["LOAN-AMT"])}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Loan Term (Days)</div>
                    <div class="info-value">${application?.["TERM"] || "N/A"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Loan Type</div>
                    <div class="info-value">${application?.["LOAN-TYPE"] || "N/A"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Inquiry Stage</div>
                    <div class="info-value">${application?.["CREDIT-INQUIRY-STAGE"] || "N/A"}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Inquiry Date</div>
                    <div class="info-value">${formatDate(application?.["CREDIT-RPT-TRN-DT-TM"]?.split(" ")?.[0] || "")}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Inquiry Purpose</div>
                    <div class="info-value">${application?.["CREDIT-INQ-PURPS-TYPE"] || "N/A"}</div>
                </div>
            </div>
        </div>

        <!-- Accounts Summary -->
        <div class="section">
            <div class="section-title">📊 Accounts Summary</div>
            <div class="summary-grid">
                <div class="summary-card">
                    <div class="summary-card-label">Active Accounts</div>
                    <div class="summary-card-value">${accountsSummary?.["ACTIVE-ACCOUNTS"] || "0"}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Overdue Accounts</div>
                    <div class="summary-card-value" style="${parseInt(accountsSummary?.["OVERDUE-ACCOUNTS"] || "0") > 0 ? "color: #dc2626;" : ""}">${accountsSummary?.["OVERDUE-ACCOUNTS"] || "0"}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Total Disbursed</div>
                    <div class="summary-card-value">${formatCurrency(accountsSummary?.["TOTAL-DISBURSED-AMT"])}</div>
                </div>
                <div class="summary-card">
                    <div class="summary-card-label">Current Balance</div>
                    <div class="summary-card-value">${formatCurrency(accountsSummary?.["TOTAL-CURRENT-BALANCE"])}</div>
                </div>
            </div>
            ${parseInt(accountsSummary?.["TOTAL-AMT-OVERDUE"] || "0") > 0 ? `
            <div class="risk-warning">
                <strong>⚠️ Alert:</strong> Outstanding overdue amount of ${formatCurrency(accountsSummary?.["TOTAL-AMT-OVERDUE"])} detected. Please clear pending dues.
            </div>
            ` : ""}
        </div>

        <!-- Trade Lines / Accounts Table -->
        ${tradelines.length > 0 ? `
        <div class="section">
            <div class="section-title">💳 Active Trade Lines</div>
            <table>
                <thead>
                    <tr>
                        <th>Account Type</th>
                        <th>Institution</th>
                        <th>Sanctioned Amount</th>
                        <th>Current Balance</th>
                        <th>Status</th>
                        <th>Account Holder</th>
                    </tr>
                </thead>
                <tbody>
                    ${tradelines.slice(0, 10).map((tl: any) => `
                    <tr>
                        <td>${tl["ACCT-TYPE"] || "N/A"}</td>
                        <td>${tl["BRANCH-NAME"] || tl["MEMBER-NAME"] || "N/A"}</td>
                        <td style="text-align: right;">${formatCurrency(tl["SANCTIONED-AMT"])}</td>
                        <td style="text-align: right;">${formatCurrency(tl["CURRENT-BAL"])}</td>
                        <td>
                            <span class="status-badge ${tl["ACCOUNT-STATUS"] === "Active" ? "status-active" : tl["ACCOUNT-STATUS"] === "Closed" ? "status-closed" : "status-error"}">
                                ${tl["ACCOUNT-STATUS"] || "Unknown"}
                            </span>
                        </td>
                        <td>${tl["ACCOUNT-HOLDER"] || "N/A"}</td>
                    </tr>
                    `).join("")}
                </tbody>
            </table>
            ${tradelines.length > 10 ? `<p style="color: #666; font-size: 12px; margin-top: 10px;">Showing 10 of ${tradelines.length} accounts</p>` : ""}
        </div>
        ` : ""}

        <!-- Inquiry History -->
        ${inquiryHistory.length > 0 ? `
        <div class="section">
            <div class="section-title">🔎 Recent Credit Inquiries</div>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Institution</th>
                        <th>Amount</th>
                        <th>Purpose</th>
                        <th>Ownership Type</th>
                    </tr>
                </thead>
                <tbody>
                    ${inquiryHistory.slice(0, 10).map((inq: any) => `
                    <tr>
                        <td>${formatDate(inq["INQUIRY-DT"])}</td>
                        <td>${inq["LENDER-NAME"] || "N/A"}</td>
                        <td style="text-align: right;">${formatCurrency(inq["AMOUNT"])}</td>
                        <td>${inq["PURPOSE"] || "N/A"}</td>
                        <td>${inq["OWNERSHIP-TYPE"] || "N/A"}</td>
                    </tr>
                    `).join("")}
                </tbody>
            </table>
            ${inquiryHistory.length > 10 ? `<p style="color: #666; font-size: 12px; margin-top: 10px;">Showing 10 of ${inquiryHistory.length} inquiries</p>` : ""}
        </div>
        ` : ""}

        <!-- Report Status -->
        <div class="section">
            <div class="section-title">✅ Report Status</div>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">CIR Status</div>
                    <div class="info-value">${getCirStatus()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Report Generated</div>
                    <div class="info-value">${new Date().toLocaleDateString()}</div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>This is a computer-generated report and is accurate as of ${new Date().toLocaleString()}.</p>
            <p style="margin-top: 10px; font-size: 11px; color: #999;">
                This report contains confidential information. If you have received this report in error, please contact support immediately.
            </p>
        </div>
    </div>
</body>
</html>
      `;

      return html;
    } catch (error) {
      this.logger.error(
        `Error generating CIBIL report HTML: ${error?.message}`,
        error,
      );
      throw new BadRequestException(
        `Failed to generate report: ${error?.message || "Unknown error"}`,
      );
    }
  }
}
