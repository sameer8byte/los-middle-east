import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { AlternateAddressService } from "./alternate-address.service";
import { UpdateAlternateAddressDto } from "./dto/update-alternate-address.dto";
import { CreateAlternateAddressDto } from "./dto/alternate-address.dto";
import { AuthType } from "../../common/decorators/auth.decorator";

@AuthType("web")
@Controller("alternate-addresses")
export class AlternateAddressController {
  constructor(private readonly service: AlternateAddressService) {}

  @Post()
  create(@Body() dto: CreateAlternateAddressDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateAlternateAddressDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }

  @Get("by-userId/:userId")
  findByUserId(@Param("userId") userId: string) {
    return this.service.findByUserId(userId);
  }
}
