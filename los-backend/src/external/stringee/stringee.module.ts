import { Module, DynamicModule } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { StringeeConfig } from "./interface/stringee-config.interface";
import { StringeeService } from "./stringee.service";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";

@Module({})
export class StringeeModule {
  static register(config: StringeeConfig): DynamicModule {
    return {
      module: StringeeModule,
      imports: [
        HttpModule.register({
          timeout: 15000,
          maxRedirects: 5,
        }),
      ],
      providers: [
        {
          provide: "STRINGEE_CONFIG",
          useValue: config,
        },
        StringeeService,
        AwsPublicS3Service,
      ],
      exports: [StringeeService],
    };
  }
}
