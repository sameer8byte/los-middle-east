import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class WebBlogsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get published blogs (public endpoint)
   */
  async getPublishedBlogs(
    brandId: string,
    page: number = 1,
    limit: number = 10
  ) {
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
          // Exclude content to reduce payload size in list view
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

  /**
   * Get a single published blog by slug
   */
  async getPublishedBlogBySlug(brandId: string, slug: string) {
    const blog = await this.prisma.brandBlog.findFirst({
      where: {
        slug,
        brandId,
        status: "PUBLISHED",
        publishedDate: {
          lte: new Date(),
        },
      },
    });

    if (!blog) {
      throw new NotFoundException("Blog not found");
    }

    return blog;
  }

  /**
   * Get a single published blog by ID
   */
  async getPublishedBlogById(brandId: string, blogId: string) {
    const blog = await this.prisma.brandBlog.findFirst({
      where: {
        id: blogId,
        brandId,
        status: "PUBLISHED",
        publishedDate: {
          lte: new Date(),
        },
      },
    });

    if (!blog) {
      throw new NotFoundException("Blog not found");
    }

    return blog;
  }
}

