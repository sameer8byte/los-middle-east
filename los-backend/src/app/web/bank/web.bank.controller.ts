import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";

import { AuthType } from "src/common/decorators/auth.decorator";
import { WebBankService } from "./web.bank.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { CreateBankAccountStatementDto } from "./dto/create-bank-statement";
import { UpdateUserBankAccountDto } from "src/shared/user-bank-account/dto/update-user-bank-account.dto";

@AuthType("web")
@Controller("web/bank")
export class WebBankController {
  constructor(private readonly webBankService: WebBankService) {}

  // get user bank account

  @Get(":id")
  async getBankAccount(@Param("id") id: string) {
    return this.webBankService.getBankAccount(id);
  }

  // opdate and verify user bank account
  @Post(":id")
  async updateBankAccount(
    @Param("id") id: string,
    @Body() data: UpdateUserBankAccountDto,
  ) {
    return this.webBankService.updateBankAccount(id, data);
  }

  // get user bank account statement
  @Get(":bankAccountId/statement")
  async getBankAccountStatement(@Param("bankAccountId") bankAccountId: string) {
    return this.webBankService.getBankAccountStatement(bankAccountId);
  }

  @Post(":bankAccountId/statement")
  @UseInterceptors(FileInterceptor("file")) // 'file' is the name of the form field
  async uploadBankAccountStatement(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: CreateBankAccountStatementDto,
  ) {
    return this.webBankService.createBankStatement({ ...data, file });
  }
  // delete bank account statement
  @Delete(":bankAccountId/statement/:id")
  async deleteBankAccountStatement(@Param("id") id: string) {
    return this.webBankService.deleteBankStatement(id);
  }
}
