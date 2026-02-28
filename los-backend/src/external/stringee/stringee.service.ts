import { HttpService } from "@nestjs/axios";
import { Injectable, Inject, HttpException, HttpStatus } from "@nestjs/common";
import { AxiosError } from "axios";
import { PrismaService } from "src/prisma/prisma.service";
import { StringeeConfig } from "./interface/stringee-config.interface";
import * as jwt from "jsonwebtoken"; // You might've forgotten to import this
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { PassThrough } from "stream";
import { v4 as uuidv4 } from "uuid";
import { firstValueFrom } from "rxjs";
@Injectable()
export class StringeeService {
  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
    private readonly awsS3Service: AwsPublicS3Service,
    @Inject("STRINGEE_CONFIG") private readonly config: StringeeConfig,
  ) {}
  private handleAxiosError(error: unknown, defaultMsg: string): never {
    if (error instanceof AxiosError) {
      throw new HttpException(
        error.response?.data || defaultMsg,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    throw new HttpException(defaultMsg, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  /**
   * Generate a JWT access token to authenticate with Stringee API
   */
  async generateAccessToken(userId: string): Promise<string> {
    try {
      if (!userId) {
        throw new HttpException("User ID is required", HttpStatus.BAD_REQUEST);
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const expiryTime = currentTime + 3600; // 1 hour expiration
      const now = Math.floor(Date.now() / 1000);

      const header = { cty: "stringee-api;v=1", alg: "HS256" };
      const payload = {
        jti: this.config.apiKeySid + "-" + now,
        iss: this.config.apiKeySid,
        exp: expiryTime,
        userId: userId,
      };

      var token = jwt.sign(payload, this.config.apiKeySecret, {
        algorithm: "HS256",
        header: header,
      });

      return token;
    } catch (error) {
      this.handleAxiosError(error, "Failed to generate access token");
    }
  }
  getPhoneNumber(): string {
    try {
      if (!this.config.phoneNumber) {
        throw new HttpException(
          "Phone number is not configured",
          HttpStatus.BAD_REQUEST,
        );
      }
      return this.config.phoneNumber;
    } catch (error) {
      this.handleAxiosError(error, "Failed to retrieve phone number");
    }
  }

  async getRecordings(recordingUrl: string) {
    try {
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        jti: `${this.config.apiKeySid}-${now}`,
        iss: this.config.apiKeySid,
        exp: now + 3600, // 1 hour expiration
        rest_api: true,
      };

      const token = jwt.sign(payload, this.config.apiKeySecret, {
        header: {
          alg: "HS256",
          typ: "JWT",
          cty: "stringee-api;v=1",
        },
      });

      // Fetch the recording as a stream
      const response = await firstValueFrom(
        this.httpService.get(recordingUrl, {
          headers: {
            "X-STRINGEE-AUTH": token,
          },
          responseType: "stream", // Crucial for binary data
        }),
      );

      const dataStream = response.data;

      // Determine content type from headers
      const contentType = "audio/mpeg";
      const fileExtension = contentType.split("/")[1] || "mp3";
      const fileName = `recording-${uuidv4()}.${fileExtension}`;

      // Create a PassThrough stream and pipe the response stream into it
      const passThrough = new PassThrough();
      dataStream.pipe(passThrough);

      // Upload the stream to S3
      const uploadResult = await this.awsS3Service.uploadStreamToS3(
        passThrough,
        fileName,
        contentType,
      );

      return uploadResult;
    } catch (error) {
      throw new HttpException(
        error?.response?.data?.message ||
          "Failed to retrieve or upload recording",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
