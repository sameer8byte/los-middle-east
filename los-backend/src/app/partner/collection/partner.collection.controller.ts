import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { PartnerCollectionService } from "./partner.collection.service";
import { GetCollectionDto } from "./dto/get-collection.dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { CreateRepaymentTimelineDto } from "./dto/repayment-timeline.dto";
import { RequireRoleOrPermission } from "src/common/decorators/role-permission.decorator";
import { PermissionType } from "@prisma/client";

@AuthType("partner")
@Controller("partner/brand/:brandId/collection")
export class PartnerCollectionController {
  constructor(
    private readonly partnerCollectionService: PartnerCollectionService
  ) {}

  @Get()
  @RequireRoleOrPermission({
    roles: [
      "COLLECTION_EXECUTIVE",
      "COLLECTION_HEAD",
      "COLLECTION_MANAGER",
      "ADMIN",
      "SUPER_ADMIN",
    ],
    permissions: [
      { permission: "ALL", type: PermissionType.ALL },
      {
        permission: "COLLECTIONS",
        type: PermissionType.ALL,
      },
    ],
    operator: "OR",
  })
  async getCollections(
    @Param("brandId") brandId: string,
    @Query() query: GetCollectionDto
  ) {
    return this.partnerCollectionService.getCollections(
      brandId,
      {
        page: query.page || 1,
        limit: query.limit || 10,
        dateFilter: query.dateFilter || "[]",
      },
      {
        status: query.status || "[]",
        search: query.search || "",
        assignedCollectionExecutive: query.assignedCollectionExecutive || "",
        assignedCollectionSupervisor: query.assignedCollectionSupervisor || "",
      }
    );
  }

  @Get("pre")
  @RequireRoleOrPermission({
    roles: [
      "COLLECTION_EXECUTIVE",
      "COLLECTION_HEAD",
      "COLLECTION_MANAGER",
      "ADMIN",
      "SUPER_ADMIN",
    ],
    permissions: [
      { permission: "ALL", type: PermissionType.ALL },
      {
        permission: "PRE_COLLECTIONS",
        type: PermissionType.ALL,
      },
    ],
    operator: "OR",
  })
  async getPreCollections(
    @Param("brandId") brandId: string,
    @Query() query: GetCollectionDto
  ) {
    return this.partnerCollectionService.getPreCollections(
      brandId,
      {
        page: query.page || 1,
        limit: query.limit || 10,
        dateFilter: query.dateFilter || "[]",
      },
      {
        search: query.search || "",
        assignedCollectionExecutive: query.assignedCollectionExecutive || "",
        assignedCollectionSupervisor: query.assignedCollectionSupervisor || "",
      }
    );
  }

  @Get("post")
  @RequireRoleOrPermission({
    roles: [
      "COLLECTION_EXECUTIVE",
      "COLLECTION_HEAD",
      "COLLECTION_MANAGER",
      "ADMIN",
      "SUPER_ADMIN",
    ],
    permissions: [
      { permission: "ALL", type: PermissionType.ALL },
      {
        permission: "POST_COLLECTIONS",
        type: PermissionType.ALL,
      },
    ],
    operator: "OR",
  })
  async getPostCollections(
    @Param("brandId") brandId: string,
    @Query() query: GetCollectionDto
  ) {
    return this.partnerCollectionService.getPostCollections(
      brandId,
      {
        page: query.page || 1,
        limit: query.limit || 10,
        dateFilter: query.dateFilter || "[]",
      },
      {
        search: query.search || "",
        assignedCollectionExecutive: query.assignedCollectionExecutive || "",
        assignedCollectionSupervisor: query.assignedCollectionSupervisor || "",
      }
    );
  }

  @Post("repayment-timeline")
  @UseInterceptors(FileInterceptor("file"))
  @HttpCode(HttpStatus.OK)
  async aadhaarDocumentUpload(
    @UploadedFile() file: Express.Multer.File,
    @Body() data: CreateRepaymentTimelineDto
  ) {
    return this.partnerCollectionService.createRepaymentTimeline(data, file);
  }

  @Get("repayment-timeline")
  async getRepaymentTimeline(
    @Param("brandId") brandId: string,
    @Query("loanId") loanId: string
  ) {
    return this.partnerCollectionService.getRepaymentTimeline(brandId, loanId);
  }
}
