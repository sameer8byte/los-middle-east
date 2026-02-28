// src/user-details/user-details.module.ts
import { Module } from "@nestjs/common";
import { UserDetailsService } from "./user-details.service";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
  providers: [UserDetailsService, PrismaService],
  exports: [UserDetailsService],
})
export class UserDetailsModule {}
