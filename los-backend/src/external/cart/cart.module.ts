import { Module, DynamicModule } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AwsPublicS3Service } from "src/core/aws/s3/aws-public-s3.service";
import { CardConfig } from "./interfaces/cart-config.interface";
import { CardService } from "./services/cart.service";
import { CartDataExtractorService } from "./services/cart-data-extractor.service";
import { DocumentsModule } from "src/shared/documents/documents.module";
import { UserBankAccountModule } from "src/shared/user-bank-account/user-bank-account.module";
import { UserDetailsModule } from "src/shared/user-details/user-details.module";
import { UsersModule } from "src/shared/user/user.module";

@Module({})
export class CardModule {
  static register(config: CardConfig): DynamicModule {
    return {
      module: CardModule,
      imports: [
        HttpModule.register({
          timeout: 100000,
          maxRedirects: 5,
          maxContentLength: 50 * 1024 * 1024, // 50MB
          maxBodyLength: 50 * 1024 * 1024, // 50MB
          headers: {
            'Connection': 'keep-alive',
            'Keep-Alive': 'timeout=30, max=100'
          }
        }),
        UserBankAccountModule,
        UsersModule,
        DocumentsModule,
        UserDetailsModule,
      ],
      providers: [
        {
          provide: "CARD_CONFIG",
          useValue: config,
        },
        CardService,
        CartDataExtractorService,
        AwsPublicS3Service,
      ],
      exports: [CardService, CartDataExtractorService],
    };
  }
}
