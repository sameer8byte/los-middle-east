import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
} from "@nestjs/common";
import { AlternatePhoneNumberService } from "./alternate-phone-number.service";
import { CreateAlternatePhoneNumberDto } from "./dto/create-alternate-phone-number.dto";
import { UpdateAlternatePhoneNumberDto } from "./dto/update-alternate-phone-number.dto";

@Controller("alternate-phone-numbers")
export class AlternatePhoneNumberController {
  constructor(private readonly service: AlternatePhoneNumberService) {}

  @Post()
  create(@Body() dto: CreateAlternatePhoneNumberDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get("user/:userId")
  findByUser(@Param("userId") userId: string) {
    return this.service.findByUser(userId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateAlternatePhoneNumberDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
