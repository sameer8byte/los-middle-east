// src/bcrypt/bcrypt.module.ts
import { DynamicModule, Module } from "@nestjs/common";
import { BcryptService } from "./bcrypt.service";
import { BCRYPT_MODULE_OPTIONS } from "./constants/bcrypt.constants";
import { BcryptModuleOptions } from "./interface/bcrypt.interface";

@Module({})
export class BcryptModule {
  static register(options: BcryptModuleOptions): DynamicModule {
    return {
      module: BcryptModule,
      providers: [
        BcryptService,
        {
          provide: BCRYPT_MODULE_OPTIONS,
          useValue: options,
        },
      ],
      exports: [BcryptService],
    };
  }
}
