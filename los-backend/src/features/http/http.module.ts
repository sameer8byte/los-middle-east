// shared/http/http.module.ts
import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { HttpServiceWrapper } from "./http.service";

@Module({
  imports: [HttpModule],
  providers: [HttpServiceWrapper],
  exports: [HttpServiceWrapper],
})
export class SharedHttpModule {}
