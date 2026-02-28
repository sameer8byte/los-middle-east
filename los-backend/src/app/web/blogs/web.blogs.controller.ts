import { Controller, Get, Param, Query } from "@nestjs/common";
import { AuthType } from "src/common/decorators/auth.decorator";
import { WebBlogsService } from "./web.blogs.service";

@AuthType("public")
@Controller("web/brand/:brandId/blogs")
export class WebBlogsController {
  constructor(private readonly webBlogsService: WebBlogsService) {}

  /**
   * Get published blogs (public endpoint)
   */
  @Get()
  async getPublishedBlogs(
    @Param("brandId") brandId: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.webBlogsService.getPublishedBlogs(brandId, pageNum, limitNum);
  }

  /**
   * Get a single published blog by slug (public endpoint)
   */
  @Get("slug/:slug")
  async getPublishedBlogBySlug(
    @Param("brandId") brandId: string,
    @Param("slug") slug: string
  ) {
    return this.webBlogsService.getPublishedBlogBySlug(brandId, slug);
  }

  /**
   * Get a single published blog by ID (public endpoint)
   */
  @Get(":blogId")
  async getPublishedBlogById(
    @Param("brandId") brandId: string,
    @Param("blogId") blogId: string
  ) {
    return this.webBlogsService.getPublishedBlogById(brandId, blogId);
  }
}

