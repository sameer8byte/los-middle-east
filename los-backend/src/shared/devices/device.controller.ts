// src/user-device/user-device.controller.ts
import { Controller, Post, Delete, Param, Body } from "@nestjs/common";
import { CreateUserDeviceDto } from "./dto/create-device.dto";

import { AuthType } from "../../common/decorators/auth.decorator";
import { DeviceService } from "./device.service";

@AuthType("public")
@Controller("users/:brandId/devices")
export class DeviceController {
  constructor(private readonly DeviceService: DeviceService) {}

  @Post()
  create(
    @Param("brandId") brandId: string,
    @Body() createUserDeviceDto: CreateUserDeviceDto,
  ) {
    return this.DeviceService.create(brandId, createUserDeviceDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.DeviceService.remove(id);
  }
}
