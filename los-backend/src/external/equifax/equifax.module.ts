import { Module } from "@nestjs/common";
import { EquifaxService } from "./equifax.service";
import { EquifaxDataExtractorService } from "./services/equifax-data-extractor";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { HttpModule } from "@nestjs/axios";
import { PdfModule } from "src/core/pdf/pdf.module";

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000000,
      maxRedirects: 5,
    }),
    PdfModule,
  ],
  providers: [EquifaxService, EquifaxDataExtractorService, AwsPublicS3Service],
  exports: [EquifaxService, EquifaxDataExtractorService], // in case you want to use it in other modules
})
export class EquifaxModule {}
