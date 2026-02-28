import { Module, DynamicModule } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { SignDeskService } from "./signdesk.service";
import { SignDeskConfig } from "./interface/signDesk-config.interface";
import { PdfModule } from "src/core/pdf/pdf.module";

@Module({})
export class SignDeskModule {
  static register(config: SignDeskConfig): DynamicModule {
    return {
      module: SignDeskModule,
      imports: [
        PdfModule,
        HttpModule.register({
          timeout: 2147483647,
          maxRedirects: 5,
        }),
      ],
      providers: [
        {
          provide: "SIGNDESK_CONFIG",
          useValue: config,
        },
        SignDeskService,
        AwsPublicS3Service,
      ],
      exports: [SignDeskService],
    };
  }
}
