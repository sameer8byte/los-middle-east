import { Module } from "@nestjs/common";
import { WebBlogsController } from "./web.blogs.controller";
import { WebBlogsService } from "./web.blogs.service";
import { PrismaService } from "src/prisma/prisma.service";

@Module({
  controllers: [WebBlogsController],
  providers: [WebBlogsService, PrismaService],
  exports: [WebBlogsService],
})
export class WebBlogsModule {}

