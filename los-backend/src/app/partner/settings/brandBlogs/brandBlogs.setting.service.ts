import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateBlogDto } from "./dto/create-blog.dto";
import { UpdateBlogDto } from "./dto/update-blog.dto";
import { GetBlogsDto } from "./dto/get-blogs.dto";
import { BrandSettingAuditLogService } from "../common/brand-setting-audit-log.service";

@Injectable()
export class BrandBlogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: BrandSettingAuditLogService,
  ) {}

  /**
   * Generate a URL-friendly slug from a title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  }

  /**
   * Check if a slug already exists for a brand
   */
  private async isSlugUnique(
    brandId: string,
    slug: string,
    excludeBlogId?: string
  ): Promise<boolean> {
    const existing = await this.prisma.brandBlog.findFirst({
      where: {
        brandId,
        slug,
        ...(excludeBlogId && { id: { not: excludeBlogId } }),
      },
    });
    return !existing;
  }

  /**
   * Get all blogs for a brand with filters and pagination
   */
  async getBlogs(brandId: string, filters: GetBlogsDto) {
    const { status, search, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { brandId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
        { author: { contains: search, mode: "insensitive" } },
      ];
    }

    const [blogs, total] = await Promise.all([
      this.prisma.brandBlog.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ publishedDate: "desc" }, { createdAt: "desc" }],
      }),
      this.prisma.brandBlog.count({ where }),
    ]);

    return {
      data: blogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single blog by ID
   */
  async getBlogById(brandId: string, blogId: string) {
    const blog = await this.prisma.brandBlog.findFirst({
      where: {
        id: blogId,
        brandId,
      },
    });

    if (!blog) {
      throw new NotFoundException("Blog not found");
    }

    return blog;
  }

  /**
   * Get a single blog by slug
   */
  async getBlogBySlug(brandId: string, slug: string) {
    const blog = await this.prisma.brandBlog.findFirst({
      where: {
        slug,
        brandId,
      },
    });

    if (!blog) {
      throw new NotFoundException("Blog not found");
    }

    return blog;
  }

  /**
   * Create a new blog
   */
  async createBlog(
    brandId: string,
    dto: CreateBlogDto,
    performedByUserId: string,
    userId?: string
  ) {
    try {
      // Generate slug if not provided
      const slug = dto.slug || this.generateSlug(dto.title);

      // Check if slug is unique
      const isUnique = await this.isSlugUnique(brandId, slug);
      if (!isUnique) {
        throw new ConflictException(
          `A blog with slug "${slug}" already exists for this brand`
        );
      }

      // Set published date if status is PUBLISHED and date not provided
      const publishedDate =
        dto.status === "PUBLISHED" && !dto.publishedDate
          ? new Date()
          : dto.publishedDate
          ? new Date(dto.publishedDate)
          : null;

      const blog = await this.prisma.brandBlog.create({
        data: {
          brandId,
          title: dto.title,
          slug,
          content: dto.content,
          excerpt: dto.excerpt,
          author: dto.author,
          featuredImage: dto.featuredImage,
          status: dto.status || "DRAFT",
          publishedDate,
          createdBy: userId,
          updatedBy: userId,
        },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_BLOG",
        performedByPartnerId: performedByUserId,
        action: "CREATE",
        changes: dto,
        status: "SUCCESS",
      });

      return blog;
    } catch (error) {
      // Audit failure logging
      if (!(error instanceof ConflictException)) {
        await this.auditLogService.createAuditLog({
          brandId,
          settingType: "BRAND_BLOG",
          performedByPartnerId: performedByUserId,
          action: "CREATE",
          status: "FAILURE",
          errorMessage: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Update an existing blog
   */
  async updateBlog(
    brandId: string,
    blogId: string,
    dto: UpdateBlogDto,
    performedByUserId: string,
    userId?: string
  ) {
    try {
      // Check if blog exists
      const existingBlog = await this.getBlogById(brandId, blogId);

      // If slug is being updated, check uniqueness
      if (dto.slug && dto.slug !== existingBlog.slug) {
        const isUnique = await this.isSlugUnique(brandId, dto.slug, blogId);
        if (!isUnique) {
          throw new ConflictException(
            `A blog with slug "${dto.slug}" already exists for this brand`
          );
        }
      }

      // If status is being changed to PUBLISHED and no published date exists, set it
      const publishedDate =
        dto.status === "PUBLISHED" && !existingBlog.publishedDate
          ? new Date()
          : dto.publishedDate
          ? new Date(dto.publishedDate)
          : undefined;

      const updateData: any = {
        ...dto,
        updatedBy: userId,
      };

      if (publishedDate !== undefined) {
        updateData.publishedDate = publishedDate;
      }

      const blog = await this.prisma.brandBlog.update({
        where: { id: blogId },
        data: updateData,
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_BLOG",
        performedByPartnerId: performedByUserId,
        action: "UPDATE",
        changes: dto,
        status: "SUCCESS",
      });

      return blog;
    } catch (error) {
      // Audit failure logging
      if (!(error instanceof ConflictException || error instanceof NotFoundException)) {
        await this.auditLogService.createAuditLog({
          brandId,
          settingType: "BRAND_BLOG",
          performedByPartnerId: performedByUserId,
          action: "UPDATE",
          status: "FAILURE",
          errorMessage: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Delete a blog
   */
  async deleteBlog(brandId: string, blogId: string, performedByUserId: string) {
    try {
      // Check if blog exists
      const existingBlog = await this.getBlogById(brandId, blogId);

      await this.prisma.brandBlog.delete({
        where: { id: blogId },
      });

      // Audit logging
      await this.auditLogService.createAuditLog({
        brandId,
        settingType: "BRAND_BLOG",
        performedByPartnerId: performedByUserId,
        action: "DELETE",
        changes: {
          blogId,
          title: existingBlog.title,
        },
        status: "SUCCESS",
      });

      return { message: "Blog deleted successfully" };
    } catch (error) {
      // Audit failure logging
      if (!(error instanceof NotFoundException)) {
        await this.auditLogService.createAuditLog({
          brandId,
          settingType: "BRAND_BLOG",
          performedByPartnerId: performedByUserId,
          action: "DELETE",
          status: "FAILURE",
          errorMessage: error.message,
        });
      }
      throw error;
    }
  }

  /**
   * Get published blogs (public endpoint)
   */
  async getPublishedBlogs(brandId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [blogs, total] = await Promise.all([
      this.prisma.brandBlog.findMany({
        where: {
          brandId,
          status: "PUBLISHED",
          publishedDate: {
            lte: new Date(), // Only show blogs published in the past
          },
        },
        skip,
        take: limit,
        orderBy: { publishedDate: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          author: true,
          featuredImage: true,
          publishedDate: true,
          // Exclude content to reduce payload size
        },
      }),
      this.prisma.brandBlog.count({
        where: {
          brandId,
          status: "PUBLISHED",
          publishedDate: {
            lte: new Date(),
          },
        },
      }),
    ]);

    return {
      data: blogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

