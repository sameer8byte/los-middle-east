// src/upload/upload.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  Get,
  Param,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UploadDocumentDto, UploadPublicDocumentDto } from "./dto/upload.dto";
import { AuthType } from "src/common/decorators/auth.decorator";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";

@Controller("aws-s3")
@AuthType("web")
export class DocumentsController {
  constructor(private readonly awsS3Service: AwsPublicS3Service) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDocumentDto: UploadDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    try {
      const s3Key = await this.awsS3Service.uploadPrivateDocument(
        file,
        uploadDocumentDto.brandId,
        uploadDocumentDto.userId,
        "documents",
      );

      return s3Key;
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload document: ${error.message}`,
      );
    }
  }

  @Get(":key/access")
  async getDocumentAccessUrl(@Param("key") key: string) {
    try {
      const signedUrl = await this.awsS3Service.getSignedUrl(key);
      return {
        success: true,
        accessUrl: signedUrl,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to generate access URL: ${error.message}`,
      );
    }
  }

  @Post("upload-public")
  @UseInterceptors(FileInterceptor("file"))
  async uploadPublicDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadPublicDocumentDto: UploadPublicDocumentDto,
  ) {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    try {
      const s3Key = await this.awsS3Service.uploadPublicFile(
        file,
        uploadPublicDocumentDto.brandId,
        uploadPublicDocumentDto.userId,
        "documents",
      );

      return {
        url: s3Key,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to upload document: ${error.message}`,
      );
    }
  }
}
