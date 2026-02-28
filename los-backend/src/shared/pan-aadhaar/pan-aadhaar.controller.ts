import { Controller, Post, Get, Param, Body } from "@nestjs/common";

import { PanAadhaarService } from "./pan-aadhaar.service";
import { PanAadhaarVerification } from "@prisma/client";

@Controller("pan-aadhaar")
export class PanAadhaarController {
  constructor(private readonly panAadhaarService: PanAadhaarService) {}

  @Get(":documentId")
  async findOne(
    @Param("documentId") documentId: string,
  ): Promise<PanAadhaarVerification | null> {
    return this.panAadhaarService.findOne(documentId);
  }
}
