import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  StreamableFile,
} from "@nestjs/common";
import * as AWS from "aws-sdk";
import { PassThrough } from "node:stream";
import { Response } from "express";

interface FileMetadata {
  brandId: string;
  userId: string;
  documentId: string; // UUID
  type: "CIBIL" | "ACCOUNT_AGGREGATOR";
  originalName: string;
  uploadedAt: string;
  fileExtension: string;
}

interface DocumentKey {
  key: string;
  metadata: FileMetadata;
}

@Injectable()
export class AwsPrivateS3Service {
  private readonly s3: AWS.S3;
  private readonly logger = new Logger(AwsPrivateS3Service.name);
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
    "text/html",
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
  private readonly MAX_FILE_SIZE = 40 * 1024 * 1024; // 40MB
  private readonly BUCKET_NAME = process.env.AWS_PRIVATE_BUCKET_NAME;
  private readonly PRESIGNED_URL_EXPIRY = 3600; // 1 hour in seconds

  constructor() {
    // Support both IAM role-based auth (EC2) and explicit credentials
    const s3Config: AWS.S3.ClientConfiguration = {
      region: process.env.AWS_REGION,
    };

    // If credentials are provided, use them; otherwise rely on IAM role
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      s3Config.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      s3Config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    }

    this.s3 = new AWS.S3(s3Config);
  }

  validateFile(file: Express.Multer.File): void {
    if (!this.ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`Invalid file type: ${file.mimetype}`);
    }

    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds limit of 40MB`);
    }
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Extract file extension from filename
   */
  private getFileExtension(fileName: string): string {
    const parts = fileName.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  }

  /**
   * Generate a clean, organized S3 key for private documents
   * Format: private-docs/{brandId}/{userId}/{type}/{year-month}/{documentId}/{timestamp}_{filename}.{ext}
   * Example: private-docs/brand-123/user-456/cibil/2024-02/550e8400-e29b-41d4-a716-446655440000/1707123456_report.pdf
   *
   * Benefits:
   * - Organized by date for easier management and lifecycle policies
   * - Document ID (UUID) as folder for grouping related files
   * - Timestamp prevents name collisions for multiple uploads
   * - Original filename preserved for user recognition
   */
  private generateDocumentKey(
    brandId: string,
    userId: string,
    documentId: string,
    type: "CIBIL" | "ACCOUNT_AGGREGATOR",
    fileName: string,
  ): DocumentKey {
    // Validate document ID is UUID
    if (!this.isValidUUID(documentId)) {
      throw new BadRequestException(
        `Invalid document ID format. Expected UUID, got: ${documentId}`,
      );
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const timestamp = Math.floor(now.getTime() / 1000); // Unix timestamp
    const fileExtension = this.getFileExtension(fileName);

    // Clean the original filename (remove extension and special chars, limit length)
    const cleanFileName = fileName
      .replace(/\.[^/.]+$/, "") // Remove extension
      .replace(/[^a-zA-Z0-9-_]/g, "_") // Replace special chars
      .replace(/_+/g, "_") // Replace multiple underscores with single
      .substring(0, 50); // Limit length

    // Build the key
    const key = [
      brandId,
      userId,
      type.toLowerCase(),
      `${year}-${month}`,
      documentId, // UUID as folder
      `${timestamp}_${cleanFileName}${fileExtension ? "." + fileExtension : ""}`,
    ].join("/");

    const metadata: FileMetadata = {
      brandId,
      userId,
      documentId,
      type,
      originalName: fileName,
      uploadedAt: now.toISOString(),
      fileExtension,
    };

    return { key, metadata };
  }

  /**
   * Parse metadata from S3 key
   */
  private parseKeyMetadata(key: string): Partial<FileMetadata> {
    // Key format: private-docs/{brandId}/{userId}/{type}/{year-month}/{documentId}/{filename}
    const parts = key.split("/");
    if (parts.length < 7 || parts[0] !== "private-docs") {
      return {};
    }

    return {
      brandId: parts[1],
      userId: parts[2],
      type: parts[3].toUpperCase() as "CIBIL" | "ACCOUNT_AGGREGATOR",
      documentId: parts[5], // UUID
    };
  }

  /**
   * Generate prefix for listing files by document ID
   */
  private getDocumentPrefix(
    brandId: string,
    userId: string,
    type: "CIBIL" | "ACCOUNT_AGGREGATOR",
    documentId: string,
  ): string {
    if (!this.isValidUUID(documentId)) {
      throw new BadRequestException(
        `Invalid document ID format: ${documentId}`,
      );
    }
    return `private-docs/${brandId}/${userId}/${type.toLowerCase()}/${documentId}/`;
  }

  /**
   * Upload a private document to S3
   */
  async uploadPrivateDocument(
    file: Express.Multer.File,
    brandId: string,
    userId: string,
    documentId: string,
    type: "CIBIL" | "ACCOUNT_AGGREGATOR",
  ): Promise<{ key: string; metadata: FileMetadata }> {
    console.log("Uploading file:", {
      originalname: file.originalname,
      brandId,
      userId,
      documentId, // Unique identifier for the document
      type,
    });
    this.validateFile(file);
    const { key, metadata } = this.generateDocumentKey(
      brandId,
      userId,
      documentId,
      type,
      file.originalname,
    );

    try {
      await this.s3
        .putObject({
          Bucket: this.BUCKET_NAME,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ServerSideEncryption: "AES256",
          Metadata: {
            brandId: metadata.brandId,
            userId: metadata.userId,
            documentId: metadata.documentId,
            type: metadata.type,
            originalName: encodeURIComponent(metadata.originalName), // <-- encode this
            uploadedAt: metadata.uploadedAt,
            fileExtension: metadata.fileExtension,
          },
          ContentDisposition: `attachment; filename="${metadata.originalName}"`,
        })
        .promise();

      this.logger.log(
        `File uploaded successfully - Document: ${documentId}, Key: ${key}`,
      );
      return { key, metadata };
    } catch (error) {
      this.logger.error(
        `Error uploading file for document ${documentId}: ${error.message}`,
      );
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload multiple files for the same document
   */
  async uploadMultipleDocuments(
    files: Express.Multer.File[],
    brandId: string,
    userId: string,
    documentId: string,
    type: "CIBIL" | "ACCOUNT_AGGREGATOR",
  ): Promise<Array<{ key: string; metadata: FileMetadata }>> {
    if (!this.isValidUUID(documentId)) {
      throw new BadRequestException(
        `Invalid document ID format: ${documentId}`,
      );
    }

    const uploadPromises = files.map((file) =>
      this.uploadPrivateDocument(file, brandId, userId, documentId, type),
    );

    try {
      const results = await Promise.all(uploadPromises);
      this.logger.log(
        `Uploaded ${files.length} files for document ${documentId}`,
      );
      return results;
    } catch (error) {
      this.logger.error(
        `Error uploading multiple files for document ${documentId}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to upload one or more files: ${error.message}`,
      );
    }
  }

  /**
   * Get a file from S3 with full details
   */
  async getFile(key: string): Promise<{
    data: Buffer;
    contentType: string;
    metadata: AWS.S3.Metadata;
    size: number;
    lastModified: Date;
  }> {
    try {
      const result = await this.s3
        .getObject({
          Bucket: this.BUCKET_NAME,
          Key: key,
        })
        .promise();

      return {
        data: result.Body as Buffer,
        contentType: result.ContentType || "application/octet-stream",
        metadata: result.Metadata || {},
        size: result.ContentLength || 0,
        lastModified: result.LastModified || new Date(),
      };
    } catch (error) {
      this.logger.error(`Error getting file from S3: ${error.message}`);
      if (error.code === "NoSuchKey") {
        throw new NotFoundException(`File not found: ${key}`);
      }
      throw new BadRequestException(`Failed to get file: ${error.message}`);
    }
  }

  /**
   * Get file by document ID and filename pattern (useful when you don't have exact key)
   */
  async getFileByDocument(
    brandId: string,
    userId: string,
    documentId: string,
    type: "CIBIL" | "ACCOUNT_AGGREGATOR",
    filenamePattern?: string,
  ): Promise<{
    key: string;
    data: Buffer;
    contentType: string;
    metadata: AWS.S3.Metadata;
    size: number;
    lastModified: Date;
  }> {
    // List all files for this document
    const files = await this.listDocumentFiles(
      brandId,
      userId,
      documentId,
      type,
    );

    if (files.length === 0) {
      throw new NotFoundException(`No files found for document ${documentId}`);
    }

    // If pattern provided, find matching file
    let targetFile = files[0];
    if (filenamePattern) {
      const match = files.find((f) =>
        f.key.toLowerCase().includes(filenamePattern.toLowerCase()),
      );
      if (!match) {
        throw new NotFoundException(
          `No file matching pattern "${filenamePattern}" found for document ${documentId}`,
        );
      }
      targetFile = match;
    }

    // Get the file
    const fileData = await this.getFile(targetFile.key);
    return {
      key: targetFile.key,
      ...fileData,
    };
  }

  /**
   * Get file as buffer only
   */
  async getFileBuffer(key: string): Promise<Buffer> {
    const file = await this.getFile(key);
    return file.data;
  }

  /**
   * Get file as stream (better for large files)
   */
  getFileStream(key: string): PassThrough {
    const pass = new PassThrough();

    this.s3
      .getObject({
        Bucket: this.BUCKET_NAME,
        Key: key,
      })
      .createReadStream()
      .on("error", (err) => {
        this.logger.error(`Error streaming file from S3: ${err.message}`);
        pass.destroy(err);
      })
      .pipe(pass);

    return pass;
  }

  /**
   * Download file directly to HTTP response (for API endpoints)
   */
  async downloadFile(key: string, response: Response): Promise<void> {
    try {
      const fileData = await this.getFile(key);
      const originalName =
        fileData.metadata.originalname ||
        fileData.metadata.originalName ||
        key.split("/").pop() ||
        "download";

      response.set({
        "Content-Type": fileData.contentType,
        "Content-Length": fileData.size,
        "Content-Disposition": `attachment; filename="${originalName}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        Expires: "-1",
        Pragma: "no-cache",
      });

      response.send(fileData.data);
    } catch (error) {
      this.logger.error(`Error downloading file: ${error.message}`);
      throw error;
    }
  }

  /**
   * Download file by document ID (gets first file if multiple exist)
   */
  async downloadFileByDocument(
    brandId: string,
    userId: string,
    documentId: string,
    type: "CIBIL" | "ACCOUNT_AGGREGATOR",
    response: Response,
    filenamePattern?: string,
  ): Promise<void> {
    const fileData = await this.getFileByDocument(
      brandId,
      userId,
      documentId,
      type,
      filenamePattern,
    );

    const originalName =
      fileData.metadata.originalname ||
      fileData.metadata.originalName ||
      fileData.key.split("/").pop() ||
      "download";

    response.set({
      "Content-Type": fileData.contentType,
      "Content-Length": fileData.size,
      "Content-Disposition": `attachment; filename="${originalName}"`,
      "Cache-Control": "private, no-cache, no-store, must-revalidate",
      Expires: "-1",
      Pragma: "no-cache",
    });

    response.send(fileData.data);
  }

  /**
   * Download file as StreamableFile (NestJS way)
   */
  async downloadFileAsStream(key: string): Promise<{
    file: StreamableFile;
    contentType: string;
    fileName: string;
  }> {
    try {
      const metadata = await this.getFileMetadata(key);
      const stream = this.getFileStream(key);
      const fileName =
        metadata.Metadata?.originalname ||
        metadata.Metadata?.originalName ||
        key.split("/").pop() ||
        "download";

      return {
        file: new StreamableFile(stream),
        contentType: metadata.ContentType || "application/octet-stream",
        fileName,
      };
    } catch (error) {
      this.logger.error(`Error downloading file as stream: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate a presigned URL for temporary download access
   */
  async getPresignedDownloadUrl(
    key: string,
    expiresIn: number = this.PRESIGNED_URL_EXPIRY,
    customFileName?: string,
  ): Promise<string> {
    try {
      const params: AWS.S3.GetObjectRequest = {
        Bucket: this.BUCKET_NAME,
        Key: key,
      };

      if (customFileName) {
        params.ResponseContentDisposition = `attachment; filename="${customFileName}"`;
      }

      const url = await this.s3.getSignedUrlPromise("getObject", {
        ...params,
        Expires: expiresIn,
      });

      this.logger.log(`Generated presigned download URL for: ${key}`);
      return url;
    } catch (error) {
      this.logger.error(`Error generating presigned URL: ${error.message}`);
      throw new BadRequestException(
        `Failed to generate presigned URL: ${error.message}`,
      );
    }
  }

  /**
   * Generate presigned download URL by document ID
   */
  async getPresignedDownloadUrlByDocument(
    brandId: string,
    userId: string,
    documentId: string,
    type: "CIBIL" | "ACCOUNT_AGGREGATOR",
    expiresIn: number = this.PRESIGNED_URL_EXPIRY,
    filenamePattern?: string,
  ): Promise<{ url: string; key: string; fileName: string }> {
    const files = await this.listDocumentFiles(
      brandId,
      userId,
      documentId,
      type,
    );

    if (files.length === 0) {
      throw new NotFoundException(`No files found for document ${documentId}`);
    }

    let targetFile = files[0];
    if (filenamePattern) {
      const match = files.find((f) =>
        f.key.toLowerCase().includes(filenamePattern.toLowerCase()),
      );
      if (match) {
        targetFile = match;
      }
    }

    const metadata = await this.getFileMetadata(targetFile.key);
    const fileName =
      metadata.Metadata?.originalName ||
      targetFile.key.split("/").pop() ||
      "download";

    const url = await this.getPresignedDownloadUrl(
      targetFile.key,
      expiresIn,
      fileName,
    );

    return { url, key: targetFile.key, fileName };
  }

  /**
   * Generate a presigned URL for viewing (inline, not download)
   */
  async getPresignedViewUrl(
    key: string,
    expiresIn: number = this.PRESIGNED_URL_EXPIRY,
  ): Promise<string> {
    try {
      const url = await this.s3.getSignedUrlPromise("getObject", {
        Bucket: this.BUCKET_NAME,
        Key: key,
        Expires: expiresIn,
        ResponseContentDisposition: "inline",
      });

      this.logger.log(`Generated presigned view URL for: ${key}`);
      return url;
    } catch (error) {
      this.logger.error(
        `Error generating presigned view URL: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to generate presigned view URL: ${error.message}`,
      );
    }
  }

  /**
   * Generate a presigned URL for uploading
   */
  async getPresignedUploadUrl(
    brandId: string,
    userId: string,
    documentId: string,
    type: "CIBIL" | "ACCOUNT_AGGREGATOR",
    fileName: string,
    contentType: string,
    expiresIn: number = this.PRESIGNED_URL_EXPIRY,
  ): Promise<{ url: string; key: string; metadata: FileMetadata }> {
    if (!this.ALLOWED_FILE_TYPES.includes(contentType)) {
      throw new BadRequestException(`Invalid file type: ${contentType}`);
    }

    const { key, metadata } = this.generateDocumentKey(
      brandId,
      userId,
      documentId,
      type,
      fileName,
    );

    try {
      const url = await this.s3.getSignedUrlPromise("putObject", {
        Bucket: this.BUCKET_NAME,
        Key: key,
        ContentType: contentType,
        Expires: expiresIn,
        ServerSideEncryption: "AES256",
        Metadata: {
          brandId: metadata.brandId,
          userId: metadata.userId,
          documentId: metadata.documentId,
          type: metadata.type,
          originalName: metadata.originalName,
          uploadedAt: metadata.uploadedAt,
          fileExtension: metadata.fileExtension,
        },
      });

      this.logger.log(
        `Generated presigned upload URL for document: ${documentId}`,
      );
      return { url, key, metadata };
    } catch (error) {
      this.logger.error(
        `Error generating presigned upload URL: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to generate presigned upload URL: ${error.message}`,
      );
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      await this.s3
        .deleteObject({
          Bucket: this.BUCKET_NAME,
          Key: key,
        })
        .promise();

      this.logger.log(`File deleted successfully: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting file from S3: ${error.message}`);
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Delete all files for a specific document
   */
  async deleteDocumentFiles(
    brandId: string,
    userId: string,
    documentId: string,
    type: "CIBIL" | "ACCOUNT_AGGREGATOR",
  ): Promise<number> {
    const files = await this.listDocumentFiles(
      brandId,
      userId,
      documentId,
      type,
    );

    if (files.length === 0) {
      this.logger.log(`No files to delete for document ${documentId}`);
      return 0;
    }

    const keys = files.map((f) => f.key);
    await this.deleteMultipleFiles(keys);

    this.logger.log(`Deleted ${keys.length} files for document ${documentId}`);
    return keys.length;
  }

  /**
   * Delete multiple files from S3
   */
  async deleteMultipleFiles(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    try {
      // S3 deleteObjects supports max 1000 objects per request
      const chunkSize = 1000;
      for (let i = 0; i < keys.length; i += chunkSize) {
        const chunk = keys.slice(i, i + chunkSize);
        await this.s3
          .deleteObjects({
            Bucket: this.BUCKET_NAME,
            Delete: {
              Objects: chunk.map((key) => ({ Key: key })),
              Quiet: false,
            },
          })
          .promise();
      }

      this.logger.log(`Deleted ${keys.length} files successfully`);
    } catch (error) {
      this.logger.error(`Error deleting multiple files: ${error.message}`);
      throw new BadRequestException(`Failed to delete files: ${error.message}`);
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3
        .headObject({
          Bucket: this.BUCKET_NAME,
          Key: key,
        })
        .promise();
      return true;
    } catch (error) {
      if (error.code === "NotFound" || error.code === "NoSuchKey") {
        return false;
      }
      this.logger.error(`Error checking file existence: ${error.message}`);
      throw new BadRequestException(
        `Failed to check file existence: ${error.message}`,
      );
    }
  }

  /**
   * Check if document has any files
   */
  async documentHasFiles(
    brandId: string,
    userId: string,
    documentId: string,
    type: "CIBIL" | "ACCOUNT_AGGREGATOR",
  ): Promise<boolean> {
    const files = await this.listDocumentFiles(
      brandId,
      userId,
      documentId,
      type,
    );
    return files.length > 0;
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<AWS.S3.HeadObjectOutput> {
    try {
      const metadata = await this.s3
        .headObject({
          Bucket: this.BUCKET_NAME,
          Key: key,
        })
        .promise();

      return metadata;
    } catch (error) {
      this.logger.error(`Error getting file metadata: ${error.message}`);
      if (error.code === "NotFound" || error.code === "NoSuchKey") {
        throw new NotFoundException(`File not found: ${key}`);
      }
      throw new BadRequestException(
        `Failed to get file metadata: ${error.message}`,
      );
    }
  }

  /**
   * Get detailed file information
   */
  async getFileInfo(key: string): Promise<{
    key: string;
    size: number;
    contentType: string;
    lastModified: Date;
    metadata: AWS.S3.Metadata;
    etag: string;
    documentId?: string;
  }> {
    const metadata = await this.getFileMetadata(key);
    const parsedMetadata = this.parseKeyMetadata(key);

    return {
      key,
      size: metadata.ContentLength || 0,
      contentType: metadata.ContentType || "application/octet-stream",
      lastModified: metadata.LastModified || new Date(),
      metadata: metadata.Metadata || {},
      etag: metadata.ETag || "",
      documentId: parsedMetadata.documentId,
    };
  }

  /**
   * List files in a directory (prefix)
   */
  async listFiles(prefix: string): Promise<AWS.S3.ObjectList> {
    try {
      const result = await this.s3
        .listObjectsV2({
          Bucket: this.BUCKET_NAME,
          Prefix: prefix,
        })
        .promise();

      return result.Contents || [];
    } catch (error) {
      this.logger.error(`Error listing files: ${error.message}`);
      throw new BadRequestException(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * List all files for a specific document (by UUID)
   */
  async listDocumentFiles(
    brandId: string,
    userId: string,
    documentId: string,
    type: "CIBIL" | "ACCOUNT_AGGREGATOR",
  ): Promise<
    Array<{
      key: string;
      size: number;
      lastModified: Date;
      documentId: string;
      type: string;
      etag: string;
    }>
  > {
    if (!this.isValidUUID(documentId)) {
      throw new BadRequestException(
        `Invalid document ID format: ${documentId}`,
      );
    }

    // Since we don't know the year-month, we need to search the parent directory
    const basePrefix = `private-docs/${brandId}/${userId}/${type.toLowerCase()}/`;

    try {
      const allFiles = await this.listFiles(basePrefix);

      // Filter files that belong to this document UUID
      const documentFiles = allFiles.filter((file) => {
        const keyParts = (file.Key || "").split("/");
        // Check if the document ID (UUID) is in the correct position
        return keyParts.length >= 6 && keyParts[5] === documentId;
      });

      return documentFiles.map((file) => ({
        key: file.Key || "",
        size: file.Size || 0,
        lastModified: file.LastModified || new Date(),
        documentId,
        type,
        etag: file.ETag || "",
      }));
    } catch (error) {
      this.logger.error(
        `Error listing files for document ${documentId}: ${error.message}`,
      );
      throw new BadRequestException(
        `Failed to list document files: ${error.message}`,
      );
    }
  }

  /**
   * List all documents for a user
   */
  async listUserDocuments(
    brandId: string,
    userId: string,
    type?: "CIBIL" | "ACCOUNT_AGGREGATOR",
  ): Promise<
    Array<{
      key: string;
      size: number;
      lastModified: Date;
      documentId: string;
      type: string;
    }>
  > {
    const prefix = type
      ? `private-docs/${brandId}/${userId}/${type.toLowerCase()}/`
      : `private-docs/${brandId}/${userId}/`;

    const files = await this.listFiles(prefix);

    return files.map((file) => {
      const parsedMetadata = this.parseKeyMetadata(file.Key || "");
      return {
        key: file.Key || "",
        size: file.Size || 0,
        lastModified: file.LastModified || new Date(),
        documentId: parsedMetadata.documentId || "",
        type: parsedMetadata.type || "",
      };
    });
  }

  /**
   * Get unique document IDs for a user
   */
  async getUserDocumentIds(
    brandId: string,
    userId: string,
    type?: "CIBIL" | "ACCOUNT_AGGREGATOR",
  ): Promise<string[]> {
    const documents = await this.listUserDocuments(brandId, userId, type);
    const uniqueIds = [...new Set(documents.map((doc) => doc.documentId))];
    return uniqueIds.filter((id) => id && this.isValidUUID(id));
  }

  /**
   * Copy a file within S3
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      await this.s3
        .copyObject({
          Bucket: this.BUCKET_NAME,
          CopySource: `${this.BUCKET_NAME}/${sourceKey}`,
          Key: destinationKey,
          ServerSideEncryption: "AES256",
        })
        .promise();

      this.logger.log(`File copied from ${sourceKey} to ${destinationKey}`);
    } catch (error) {
      this.logger.error(`Error copying file: ${error.message}`);
      throw new BadRequestException(`Failed to copy file: ${error.message}`);
    }
  }

  /**
   * Move a file (copy then delete source)
   */
  async moveFile(sourceKey: string, destinationKey: string): Promise<void> {
    await this.copyFile(sourceKey, destinationKey);
    await this.deleteFile(sourceKey);
    this.logger.log(`File moved from ${sourceKey} to ${destinationKey}`);
  }

  /**
   * Get file size in bytes
   */
  async getFileSize(key: string): Promise<number> {
    const metadata = await this.getFileMetadata(key);
    return metadata.ContentLength || 0;
  }

  /**
   * Get total size of all files for a document
   */
  async getDocumentTotalSize(
    brandId: string,
    userId: string,
    documentId: string,
    type: "CIBIL" | "ACCOUNT_AGGREGATOR",
  ): Promise<number> {
    const files = await this.listDocumentFiles(
      brandId,
      userId,
      documentId,
      type,
    );
    return files.reduce((total, file) => total + file.size, 0);
  }

  /**
   * Update file metadata
   */
  async updateFileMetadata(
    key: string,
    metadata: Record<string, string>,
  ): Promise<void> {
    try {
      await this.s3
        .copyObject({
          Bucket: this.BUCKET_NAME,
          CopySource: `${this.BUCKET_NAME}/${key}`,
          Key: key,
          Metadata: metadata,
          MetadataDirective: "REPLACE",
          ServerSideEncryption: "AES256",
        })
        .promise();

      this.logger.log(`Metadata updated for: ${key}`);
    } catch (error) {
      this.logger.error(`Error updating file metadata: ${error.message}`);
      throw new BadRequestException(
        `Failed to update file metadata: ${error.message}`,
      );
    }
  }

  /**
   * Upload private PDF to S3 with KMS encryption
   */
  async uploadPrivatePdfToS3(
    pdfBuffer: Buffer,
    brandId: string,
    userId: string,
    documentId: string,
    type: "CIBIL" | "ACCOUNT_AGGREGATOR",
    fileName: string = "document.pdf",
  ): Promise<string> {
    const file: Express.Multer.File = {
      buffer: pdfBuffer,
      originalname: fileName,
      mimetype: "application/pdf",
      size: pdfBuffer.length,
      fieldname: "file",
      encoding: "7bit",
      stream: null,
      destination: "",
      filename: fileName,
      path: "",
    };

    const { key } = await this.uploadPrivateDocument(
      file,
      brandId,
      userId,
      documentId,
      type,
    );

    return key;
  }

  /**
   * Get presigned URL for private document
   */
  async getPrivateDocumentUrl(
    key: string,
    expiresIn: number = 900,
  ): Promise<string> {
    return this.getPresignedDownloadUrl(key, expiresIn);
  }

  /**
   * Count files for a document
   */
  async countDocumentFiles(
    brandId: string,
    userId: string,
    documentId: string,
    type: "CIBIL" | "ACCOUNT_AGGREGATOR",
  ): Promise<number> {
    const files = await this.listDocumentFiles(
      brandId,
      userId,
      documentId,
      type,
    );
    return files.length;
  }
}
