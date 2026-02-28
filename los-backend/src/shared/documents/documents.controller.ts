import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from "@nestjs/common";
import { DocumentsService } from "./documents.service";
import { CreateDocumentDto, UpdateDocumentDto } from "./dto";
import { AuthType } from "../../common/decorators/auth.decorator";

@AuthType("web")
@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  async create(@Body() createDocumentDto: CreateDocumentDto) {
    return this.documentsService.create(
      createDocumentDto.userId,
      createDocumentDto,
    );
  }

  x;
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.documentsService.findOne(id);
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, userId, updateDocumentDto);
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @Param("userId") userId: string) {
    return this.documentsService.remove(id);
  }

  @Get("by-user/:userId")
  async findAllByUserId(@Param("userId") userId: string) {
    return this.documentsService.findAllByUserId(userId);
  }
}
