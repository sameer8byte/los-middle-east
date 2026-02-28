// src/profilex/profilex.module.ts
import { Module, DynamicModule } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { FinboxConfig } from "./interfaces/finbox-config.interface";
import { FinboxService } from "./finbox.service";
import { DocumentsModule } from "src/shared/documents/documents.module";
import { UserBankAccountModule } from "src/shared/user-bank-account/user-bank-account.module";
import { UserDetailsModule } from "src/shared/user-details/user-details.module";
import { UsersModule } from "src/shared/user/user.module";

@Module({})
export class FinboxModule {
  static register(config: FinboxConfig): DynamicModule {
    return {
      module: FinboxModule,
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
          provide: "FINBOX_CONFIG",
          useValue: config,
        },
        FinboxService,
      ],
      exports: [FinboxService],
    };
  }
}
