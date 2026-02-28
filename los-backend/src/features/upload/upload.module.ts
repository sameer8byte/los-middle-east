// src/upload/upload.module.ts
import { Module } from "@nestjs/common";
import { DocumentsController } from "./upload.controller";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";

@Module({
  controllers: [DocumentsController],
  providers: [AwsPublicS3Service],
})
export class UploadModule {}
