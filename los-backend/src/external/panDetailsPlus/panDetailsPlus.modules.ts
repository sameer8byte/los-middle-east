import { Module, DynamicModule } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { PrismaModule } from "src/prisma/prisma.module";
import { PanDetailsPlusConfig } from "./interfaces/panDetailsPlus-config.interface";
import { PanDetailsPlusService } from "./panDetailsPlus.service";
import { PanDetailsPlusController } from "./panDetailsPlus.controller";

@Module({})
export class PanDetailsPlusModule {
  static register(config: PanDetailsPlusConfig): DynamicModule {
    return {
      module: PanDetailsPlusModule,
      imports: [
        HttpModule.register({
          timeout: 20000,
          maxRedirects: 5,
        }),
        PrismaModule,
      ],
      controllers: [PanDetailsPlusController],
      providers: [
        {
          provide: "PANDETAILSPLUS_CONFIG",
          useValue: config,
        },
        PanDetailsPlusService
      ],
      exports: [PanDetailsPlusService],
    };
  }
}

