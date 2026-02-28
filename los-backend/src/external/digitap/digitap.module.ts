// src/profilex/profilex.module.ts
import { Module, DynamicModule } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { DigitapService } from "./digitap.service";
import { DigitapConfig } from "./interfaces/digitap-config.interface";
@Module({})
export class DigitapModule {
  static register(config: DigitapConfig): DynamicModule {
    return {
      module: DigitapModule,
      imports: [
        HttpModule.register({
          timeout: 20000,
          maxRedirects: 5,
        }),
      ],
      providers: [
        {
          provide: "DIGITAP_CONFIG",
          useValue: config,
        },
        DigitapService,
      ],
      exports: [DigitapService],
    };
  }
}
