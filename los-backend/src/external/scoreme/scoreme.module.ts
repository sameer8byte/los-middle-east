import { Module, DynamicModule } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ScoreMeConfig } from "./interfaces/scoreMe-config.interface";
import { ScoreMeService } from "./scoreme.service";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { DocumentsModule } from "src/shared/documents/documents.module";
import { UserBankAccountModule } from "src/shared/user-bank-account/user-bank-account.module";
import { UserDetailsModule } from "src/shared/user-details/user-details.module";
import { UsersModule } from "src/shared/user/user.module";

@Module({})
export class ScoreMeModule {
  static register(config: ScoreMeConfig): DynamicModule {
    return {
      module: ScoreMeModule,
      imports: [
        HttpModule.register({
          timeout: 100000,
          maxRedirects: 5,
        }),
        UserBankAccountModule,
        UsersModule,
        DocumentsModule,
        UserDetailsModule,
      ],
      providers: [
        {
          provide: "SCOREME_CONFIG",
          useValue: config,
        },
        ScoreMeService,
        AwsPublicS3Service,
      ],
      exports: [ScoreMeService],
    };
  }
}
