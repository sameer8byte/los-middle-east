import api from "../../axios";
export interface Blog {
  id: string;
  brandId: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author?: string;
  featuredImage?: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface BlogsResponse {
  data: Blog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateBlogPayload {
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  author?: string;
  featuredImage?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedDate?: string;
}

export interface UpdateBlogPayload {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  author?: string;
  featuredImage?: string;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedDate?: string;
}

export interface GetBlogsParams {
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Get all blogs for a brand
 */
export const getBlogs = async (
  brandId: string,
  params?: GetBlogsParams
): Promise<BlogsResponse> => {
  const response = await api.get(
    `/partner/brand/${brandId}/settings/blogs`,
    {
      params,
      withCredentials: true,
    }
  );
  return response.data;
};

/**
 * Get a single blog by ID
 */
export const getBlogById = async (
  brandId: string,
  blogId: string
): Promise<Blog> => {
  const response = await api.get(
    `/partner/brand/${brandId}/settings/blogs/${blogId}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

/**
 * Get a single blog by slug
 */
export const getBlogBySlug = async (
  brandId: string,
  slug: string
): Promise<Blog> => {
  const response = await api.get(
    `/partner/brand/${brandId}/settings/blogs/slug/${slug}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

/**
 * Create a new blog
 */
export const createBlog = async (
  brandId: string,
  payload: CreateBlogPayload
): Promise<Blog> => {
  const response = await api.post(
    `/partner/brand/${brandId}/settings/blogs`,
    payload,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

/**
 * Update an existing blog
 */
export const updateBlog = async (
  brandId: string,
  blogId: string,
  payload: UpdateBlogPayload
): Promise<Blog> => {
  const response = await api.put(
    `/partner/brand/${brandId}/settings/blogs/${blogId}`,
    payload,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

/**
 * Delete a blog
 */
export const deleteBlog = async (
  brandId: string,
  blogId: string
): Promise<{ message: string }> => {
  const response = await api.delete(
    `/partner/brand/${brandId}/settings/blogs/${blogId}`,
    {
      withCredentials: true,
    }
  );
  return response.data;
};

