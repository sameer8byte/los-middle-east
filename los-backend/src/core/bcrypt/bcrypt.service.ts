// src/bcrypt/bcrypt.service.ts
import { Inject, Injectable } from "@nestjs/common";
import { BCRYPT_MODULE_OPTIONS } from "./constants/bcrypt.constants";
import { BcryptModuleOptions } from "./interface/bcrypt.interface";
import * as bcrypt from "bcrypt";

@Injectable()
export class BcryptService {
  constructor(
    @Inject(BCRYPT_MODULE_OPTIONS)
    private readonly options: BcryptModuleOptions,
  ) {}

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.options.saltRounds);
  }

  async compare(raw: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(raw, hashed);
  }
}
