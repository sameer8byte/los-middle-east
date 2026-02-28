// src/profilex/profilex.module.ts
import { Module, DynamicModule } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { GeoCodingConfig } from "./interfaces/geocoding-config.interface";
import { GeoCodingService } from "./geocoding.service";

@Module({})
export class GeoCodingModule {
  static register(config: GeoCodingConfig): DynamicModule {
    return {
      module: GeoCodingModule,
      imports: [
        HttpModule.register({
          timeout: 100000,
          maxRedirects: 5,
        }),
      ],
      providers: [
        {
          provide: "GEOCODING_CONFIG",
          useValue: config,
        },
        GeoCodingService,
      ],
      exports: [GeoCodingService],
    };
  }
}
