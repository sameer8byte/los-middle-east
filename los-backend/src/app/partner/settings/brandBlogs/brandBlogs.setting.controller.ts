import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  Put,
  Request,
} from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { GetPartnerUser } from "src/common/decorators/get-user.decorator";
import { AuthenticatedPartnerUser } from "src/common/types/partner-user.types";
import { BrandBlogsService } from "./brandBlogs.setting.service";
import { CreateBlogDto } from "./dto/create-blog.dto";
import { UpdateBlogDto } from "./dto/update-blog.dto";
import { GetBlogsDto } from "./dto/get-blogs.dto";

@AuthType("partner")
@Controller("partner/brand/:brandId/settings/blogs")
export class BrandBlogsController {
  constructor(private readonly brandBlogsService: BrandBlogsService) {}

  /**
   * Get all blogs for a brand
   */
  @Get()
  async getBlogs(
    @Param("brandId") brandId: string,
    @Query() filters: GetBlogsDto
  ) {
    return this.brandBlogsService.getBlogs(brandId, filters);
  }

  /**
   * Get a single blog by ID
   */
  @Get(":blogId")
  async getBlogById(
    @Param("brandId") brandId: string,
    @Param("blogId") blogId: string
  ) {
    return this.brandBlogsService.getBlogById(brandId, blogId);
  }

  /**
   * Get a single blog by slug
   */
  @Get("slug/:slug")
  async getBlogBySlug(
    @Param("brandId") brandId: string,
    @Param("slug") slug: string
  ) {
    return this.brandBlogsService.getBlogBySlug(brandId, slug);
  }

  /**
   * Create a new blog
   */
  @Post()
  async createBlog(
    @Param("brandId") brandId: string,
    @Body() dto: CreateBlogDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
    @Request() req: any
  ) {
    const userId = req.user?.id;
    return this.brandBlogsService.createBlog(brandId, dto, partnerUser.id, userId);
  }

  /**
   * Update a blog
   */
  @Put(":blogId")
  async updateBlog(
    @Param("brandId") brandId: string,
    @Param("blogId") blogId: string,
    @Body() dto: UpdateBlogDto,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
    @Request() req: any
  ) {
    const userId = req.user?.id;
    return this.brandBlogsService.updateBlog(brandId, blogId, dto, partnerUser.id, userId);
  }

  /**
   * Delete a blog
   */
  @Delete(":blogId")
  async deleteBlog(
    @Param("brandId") brandId: string,
    @Param("blogId") blogId: string,
    @GetPartnerUser() partnerUser: AuthenticatedPartnerUser,
  ) {
    return this.brandBlogsService.deleteBlog(brandId, blogId, partnerUser.id);
  }
}

