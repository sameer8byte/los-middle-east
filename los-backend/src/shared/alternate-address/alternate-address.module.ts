import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { AlternateAddressService } from "./alternate-address.service";
import { AlternateAddressController } from "./alternate-address.controller";

@Module({
  imports: [PrismaModule],
  controllers: [AlternateAddressController],
  providers: [AlternateAddressService],
  exports: [AlternateAddressService],
})
export class AlternateAddressModule {}
