import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { PdfService } from "./pdf.service";

@Module({
  imports: [PrismaModule],
  providers: [PdfService, AwsPublicS3Service],
  exports: [PdfService],
})
export class PdfModule {}
