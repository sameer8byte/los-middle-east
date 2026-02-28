import { Module, DynamicModule } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { PrismaModule } from "src/prisma/prisma.module";
import { DigiLocker20Config } from "./interfaces/digiLocker2.0-config.interface";
import { DigiLocker20Service } from "./digiLocker2.0.service";
import { DigiLocker20Controller } from "./digiLocker2.0.controller";

@Module({})
export class DigiLocker20Module {
  static register(config: DigiLocker20Config): DynamicModule {
    return {
      module: DigiLocker20Module,
      imports: [
        HttpModule.register({
          timeout: 30000,
          maxRedirects: 5,
        }),
        PrismaModule,
      ],
      controllers: [DigiLocker20Controller],
      providers: [
        {
          provide: "DIGILOCKER20_CONFIG",
          useValue: config,
        },
        DigiLocker20Service,
      ],
      exports: [DigiLocker20Service],
    };
  }
}

