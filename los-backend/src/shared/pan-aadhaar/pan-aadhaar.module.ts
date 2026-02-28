import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { PanAadhaarService } from "./pan-aadhaar.service";
import { PanAadhaarController } from "./pan-aadhaar.controller";

@Module({
  imports: [PrismaModule],
  controllers: [PanAadhaarController],
  providers: [PanAadhaarService],
  exports: [PanAadhaarService],
})
export class PanAadhaarModule {}
