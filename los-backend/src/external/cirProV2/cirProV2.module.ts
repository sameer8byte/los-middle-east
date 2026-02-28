import { Module, DynamicModule } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { CirProV2Service } from "./cirProV2.service";
import { CirProV2DataExtractorService } from "./services/cirProV2-data-extractor";
import { CirProV2Config } from "./interface/cirProV2-config.modules";
import { PdfModule } from "src/core/pdf/pdf.module";
import { AwsModule } from "src/core/aws/aws.module";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { AwsPrivateS3Service } from "src/core/aws/s3/aws-private-s3.service";

@Module({})
export class CirProV2Module {
  static register(config: CirProV2Config): DynamicModule {
    return {
      module: CirProV2Module,
      imports: [
        HttpModule.register({
          timeout: 120000,
          maxRedirects: 1,
        }),
        PdfModule,
        AwsModule,
      ],
      providers: [
        {
          provide: "CIR_PRO_V2_CONFIG",
          useValue: config,
        },
        CirProV2Service,
        CirProV2DataExtractorService,
        AwsPublicS3Service,
        AwsPrivateS3Service,
      ],
      exports: [CirProV2Service, CirProV2DataExtractorService],
    };
  }
}
