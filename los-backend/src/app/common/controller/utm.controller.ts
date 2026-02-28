import { Body, Controller, Injectable, Post } from "@nestjs/common";
import { UtmService } from "../services/utm.services";
import { AuthType } from "src/common/decorators/auth.decorator";

@AuthType("public")
@Controller("common/:brandId/utm")
export class UtmController {
  constructor(private readonly utmService: UtmService) {}
  @Post()
  async createUtmTracking(@Body() body: any) {
    return this.utmService.createUtmTracking(body);
  }
}
