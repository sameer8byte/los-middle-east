import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger
} from "@nestjs/common";
import * as AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import { PassThrough } from "node:stream";

@Injectable()
export class AwsPublicS3Service {
  private readonly s3: AWS.S3;
  private readonly rekognition: AWS.Rekognition;
  private readonly logger = new Logger(AwsPublicS3Service.name);
  private readonly ALLOWED_FILE_TYPES = [
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/heic",
    "image/svg+xml",
    "image/bmp",
    "image/tiff",
    "image/x-icon",

    // Videos
    "video/webm",
    "video/mp4",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo", 
    "video/x-ms-wmv",

    // Audio
    "audio/mpeg", 
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/webm",
    "audio/flac",
    "audio/mp4",

    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-powerpoint", 
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
    "text/plain",
    "text/csv",
    "application/rtf",

    // Archives
    "application/zip",
    "application/x-7z-compressed",
    "application/x-rar-compressed",
    "application/x-tar",
    "application/gzip",

    // Others
    "application/json",
    "application/xml",
  ];
  private readonly MAX_FILE_SIZE = 40 * 1024 * 1024; // 20MB

  constructor() {
    // Support both IAM role-based auth (EC2) and explicit credentials
    const awsConfig: AWS.S3.ClientConfiguration = {
      region: process.env.AWS_REGION,
    };

    // If credentials are provided, use them; otherwise rely on IAM role
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      awsConfig.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      awsConfig.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    }

    this.s3 = new AWS.S3(awsConfig);
    this.rekognition = new AWS.Rekognition(awsConfig);
  }

  validateFile(file: Express.Multer.File): void {
    if (!this.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type: ${file.mimetype}`);
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds limit of 20MB`);
    }
  }

  //uuidv4
  async uuidv4(): Promise<string> {
    return uuidv4();
  }

  async uploadPrivateDocument(
    file: Express.Multer.File,
    brandId: string,
    userId: string,
    resourceType:
      | "user_profile"
      | "documents"
      | "bank-statement"
      | "payslip"
      | "other-documents"
      | "address-proof",
  ): Promise<{ key: string; url: string }> {
    try {
      this.validateFile(file);

      const fileExtension = file.originalname.split(".").pop() || "bin";
      const uuid = await this.uuidv4();

      // ---- Customize these based on your project setup ----
      const environment = process.env.NODE_ENV ?? "dev";
      const projectOrTenant = brandId;

      const sanitizedFileName = file.originalname.replace(/[^\w.-]/gi, "_");
      const finalFileName = `${uuid}-${Date.now()}.${fileExtension}`;
      const key = `${environment}/${projectOrTenant}/${userId}/${resourceType}/${finalFileName}`;

      const uploadResult = await this.s3
        .upload({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: "private",
          Metadata: {
            originalname: sanitizedFileName,
          },
        })
        .promise();

      const url = await this.getSignedUrl(uploadResult.Key);
      return { key: uploadResult.Key, url };
    } catch (error) {
      console.error("Error uploading file to S3:", error);
      throw new BadRequestException("Failed to upload file");
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    return this.s3.getSignedUrlPromise("getObject", {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Expires: 300,
    });
  }

  async deleteDocument(key: string): Promise<void> {
    try {
      await this.s3
        .deleteObject({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
        })
        .promise();
    } catch (error) {
      if (error.code === "NoSuchKey") {
        throw new NotFoundException(`File with key ${key} not found`);
      }
      throw error;
    }
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const data = await this.s3
      .getObject({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: key,
      })
      .promise();

    if (!data.Body) throw new NotFoundException(`File ${key} has no content`);
    return data.Body as Buffer;
  }

  async uploadPublicFile(
    file: Express.Multer.File,
    brandId: string,
    userId: string,
    resourceType:
      | "user_profile"
      | "documents"
      | "bank-statement"
      | "payslip"
      | "other-documents"
      | "address-proof",
  ): Promise<string> {
    try {
      this.validateFile(file);

      const fileExtension = file.originalname.split(".").pop() || "bin";
      const uuid = await this.uuidv4();

      // ---- Customize these based on your project setup ----
      const environment = process.env.NODE_ENV ?? "dev";
      const projectOrTenant = brandId;

      const sanitizedFileName = file.originalname.replace(/[^\w.-]/gi, "_");
      const finalFileName = `${uuid}-${Date.now()}.${fileExtension}`;
      const key = `${environment}/${projectOrTenant}/${userId}/${resourceType}/${finalFileName}`;
      await this.s3
        .upload({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            originalname: sanitizedFileName,
          },
        })
        .promise();

      return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      console.error("Error uploading file to S3:", error);
      throw new BadRequestException("Failed to upload file");
    }
  }

  async uploadBufferToS3(
    data: Buffer,
    brandId: string,

    userId: string,
    contentType: string,
    file: { originalname: string },
    resourceType:
      | "user_profile"
      | "documents"
      | "bank-statement"
      | "payslip"
      | "other-documents"
      | "address-proof",
  ): Promise<{ key: string; url: string }> {
    try {
      const fileExtension = file.originalname.split(".").pop() || "bin";
      const uuid = await this.uuidv4();

      // ---- Customize these based on your project setup ----
      const environment = process.env.NODE_ENV ?? "dev";
      const projectOrTenant = brandId;

      const sanitizedFileName = file.originalname.replace(/[^\w.-]/gi, "_");
      const finalFileName = `${uuid}-${Date.now()}.${fileExtension}`;
      const key = `${environment}/${projectOrTenant}/${userId}/${resourceType}/${finalFileName}`;
      const uploadResult = await this.s3
        .upload({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: key,
          Body: data,
          ContentType: contentType,
          ACL: "private",
          Metadata: {
            originalname: sanitizedFileName,
          },
        })
        .promise();

      const url = await this.getSignedUrl(uploadResult.Key);
      return { key: uploadResult.Key, url };
    } catch (error) {
      console.error("Error uploading buffer to S3:", error);
      throw new BadRequestException("Failed to upload file buffer");
    }
  }

  async uploadStreamToS3(
    stream: PassThrough,
    destinationKey: string,
    contentType: string,
  ): Promise<{ key: string; url: string }> {
    try {
      await this.s3
        .upload({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: destinationKey,
          Body: stream,
          ContentType: contentType || "application/octet-stream",
          ACL: "private",
        })
        .promise();

      const signedUrl = await this.getSignedUrl(destinationKey);
      return { key: destinationKey, url: signedUrl };
    } catch (error) {
      console.error("Error uploading stream to S3:", error);
      throw new BadRequestException("Failed to upload file stream");
    }
  }
}