import {
  Injectable,
  Inject,
  HttpException,
  HttpStatus,
  BadRequestException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { AxiosError } from "axios";
import { PrismaService } from "src/prisma/prisma.service";
import * as FormData from "form-data";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { CardConfig } from "../interfaces/cart-config.interface";

@Injectable()
export class CardService {
  private readonly UPLOAD_URL = "/api/upload";
  private readonly DOWNLOAD_URL = "/api/downloadFile";
  private readonly DOWNLOAD_EXEL_URL = "/api/downloadFileAsExcel";

  constructor(
    private readonly httpService: HttpService,
    @Inject("CARD_CONFIG") private readonly config: CardConfig,
    private readonly prisma: PrismaService,
    private readonly awsS3Service: AwsPublicS3Service
  ) {}

  private getHeaders(extraHeaders?: Record<string, string>) {
    return {
      "auth-Token": this.config.authToken,
      ...(extraHeaders || {}),
    };
  }

  private handleAxiosError(error: any, defaultMsg: string) {
    if (error instanceof AxiosError) {
      throw new HttpException(
        error.response?.data || defaultMsg,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
    throw new HttpException(defaultMsg, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private async validateEntities(
    userBankAccountId: string,
    bankAccountStatementId: string
  ) {
    const [bankAccount, statement] = await Promise.all([
      this.prisma.userBankAccount.findUnique({
        where: { id: userBankAccountId },
      }),
      this.prisma.bankAccountStatement.findUnique({
        where: { id: bankAccountStatementId },
      }),
    ]);

    if (!bankAccount) {
      throw new HttpException(
        `User Bank Account not found`,
        HttpStatus.NOT_FOUND
      );
    }

    if (!statement) {
      throw new HttpException(
        `Bank Account Statement not found`,
        HttpStatus.NOT_FOUND
      );
    }

    return statement;
  }

  async uploadStatementSession(
    userId: string,
    bankAccountStatementId: string,
    userBankAccountId: string,
    file: Express.Multer.File
  ) {
    await this.validateEntities(userBankAccountId, bankAccountStatementId);

    const bankAccount = await this.prisma.userBankAccount.findUnique({
      where: { id: userBankAccountId },
    });

    const statement = await this.prisma.bankAccountStatement.findUnique({
      where: { id: bankAccountStatementId },
    });

    if (!bankAccount) {
      throw new HttpException(
        "User bank account not found",
        HttpStatus.NOT_FOUND
      );
    }

    const formData = new FormData.default();

    // Match `curl` metadata field
    const metadata = {
      password: statement.filePassword || "",
      bank: "Other", // You can dynamically derive this from `bankAccount.bankName` or similar
    };

    formData.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    formData.append("metadata", JSON.stringify(metadata));
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.config.baseUrl}${this.UPLOAD_URL}`,
          formData,
          {
            headers: {
              ...this.getHeaders({
                ...formData.getHeaders(),
                "Content-Type": `multipart/form-data`,
                Accept: "application/json",
              }),
            },
          }
        )
      );
      if (data?.status === "Rejected") {
        throw new BadRequestException(
          data?.message || "Upload failed: No referenceId"
        );
      }
      if (data?.status === "Submitted") {
        await this.prisma.cartSomeTable.create({
          data: {
            userId,
            bankAccountStatementId,
            userBankAccountId,
            referenceId: data.docId,
            uploadedAt: new Date(),
            uploadJson: JSON.stringify(data),
          },
        });
        return data;
      }

      throw new HttpException(
        data?.responseMessage || "Upload failed: No referenceId",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    } catch (error) {
      this.handleAxiosError(error, "Error uploading session");
    }
  }

  async downloadReport(
    brandId: string,
    userId: string,
    referenceId: string,
    type: "xlsx" | "json"
  ) {
    if (!["xlsx", "json"].includes(type) || !referenceId) {
      throw new HttpException("Invalid input", HttpStatus.BAD_REQUEST);
    }

    const url =
      type === "xlsx"
        ? `${this.config.baseUrl}${this.DOWNLOAD_EXEL_URL}`
        : `${this.config.baseUrl}${this.DOWNLOAD_URL}`;
    const headers = this.getHeaders({
      "Content-Type": type === "xlsx" ? "text/plain" : "text/plain",
      Accept: type === "xlsx" ? "application/octet-stream" : "application/json",
    });

    const { data } = await firstValueFrom(
      this.httpService.post(url, referenceId, {
        headers,
        responseType: type === "xlsx" ? "arraybuffer" : "json",
      })
    );

    if (type === "json" && data) {
      if (data?.status !== "Processed" && data?.status !== "Downloaded") {
        throw new BadRequestException(
          data?.message ||
            "we are processing your request, please try again later"
        );
      }
      await this.prisma.cartSomeTable.update({
        where: { referenceId: referenceId },
        data: { bsaReportDownloadJson: JSON.stringify(data) },
      });
    }
    if (type === "xlsx" && data) {
      const uploadResult = await this.awsS3Service.uploadBufferToS3(
        Buffer.from(data),
        brandId,
        userId,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        {
          originalname: `${referenceId}.xlsx`,
        },
        "documents"
      );
      if (!uploadResult) {
        throw new HttpException(
          "Failed to upload to S3",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      await this.prisma.cartSomeTable.update({
        where: { userId, referenceId },
        data: { bsaReportXlsxPrivateKey: uploadResult.key },
      });
    }

    return true;
  }
}
