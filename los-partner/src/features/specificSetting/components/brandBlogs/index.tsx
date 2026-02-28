import  { useState, useEffect } from 'react';
import { Button } from '../../../../common/ui/button';
import { Input } from '../../../../common/ui/input';
import { Card } from '../../../../common/ui/card';
import { BlogEditor } from './BlogEditor';
import { cn } from '../../../../lib/utils';
import { getBorderRadius } from '../../../../lib/theme';
import { FaEdit, FaTrash, FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import {
  getBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  Blog,
} from '../../../../shared/services/api/settings/blogs.setting.api';
import { toast } from 'react-toastify';
import { useParams } from 'react-router-dom';



const BrandBlogs = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    author: '',
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED',
    featuredImage: '',
    excerpt: '',
  });

  // Fetch blogs on mount
  useEffect(() => {
    fetchBlogs();
  }, [brandId]);

  const fetchBlogs = async () => {
    if(!brandId) return;
    try {
      setLoading(true);
      const response = await getBlogs(brandId);
      setBlogs(response.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to fetch blogs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsEditing(true);
    setEditingBlog(null);
    setFormData({
      title: '',
      slug: '',
      content: '',
      author: '',
      status: 'DRAFT',
      featuredImage: '',
      excerpt: '',
    });
  };

  const handleEdit = (blog: Blog) => {
    setIsEditing(true);
    setEditingBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      author: blog.author || '',
      status: (blog.status === 'ARCHIVED' ? 'DRAFT' : blog.status) as 'DRAFT' | 'PUBLISHED',
      featuredImage: blog.featuredImage || '',
      excerpt: blog.excerpt || '',
    });
  };

  const handleDelete = async (id: string) => {
    if(!brandId) return;
    if (globalThis.confirm('Are you sure you want to delete this blog post?')) {
      try {
        setLoading(true);
        await deleteBlog(brandId, id);
        toast.success('Blog deleted successfully');
        fetchBlogs();
      } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Failed to delete blog');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if(!brandId) return;

    if (!formData.title || !formData.content) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: formData.title,
        slug: formData.slug || undefined,
        content: formData.content,
        excerpt: formData.excerpt || undefined,
        author: formData.author || undefined,
        featuredImage: formData.featuredImage || undefined,
        status: formData.status,
        publishedDate: formData.status === 'PUBLISHED' ? new Date().toISOString() : undefined,
      };

      if (editingBlog) {
        // Update existing blog
        await updateBlog(brandId, editingBlog.id, payload);
        toast.success('Blog updated successfully');
      } else {
        // Create new blog
        await createBlog(brandId, payload);
        toast.success('Blog created successfully');
      }

      setIsEditing(false);
      setEditingBlog(null);
      fetchBlogs();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save blog');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingBlog(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Blog Management</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Create and manage blog posts for your brand
          </p>
        </div>
        {!isEditing && (
          <Button onClick={handleCreate} leftIcon={<FaPlus />}>
            New Blog Post
          </Button>
        )}
      </div>

      {/* Editor Form */}
      {isEditing && (
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                {editingBlog ? 'Edit Blog Post' : 'Create New Blog Post'}
              </h2>
              <div className="flex gap-2">
              <Button onClick={handleSave} leftIcon={<FaSave />} loading={loading} disabled={loading}>
                Save
              </Button>
                <Button onClick={handleCancel} variant="outline" leftIcon={<FaTimes />}>
                  Cancel
                </Button>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Blog Title"
                placeholder="Enter blog title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                fullWidth
                required
              />
              <Input
                label="URL Slug"
                placeholder="auto-generated-from-title"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                fullWidth
                helperText="Leave empty to auto-generate from title"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Author Name"
                placeholder="Enter author name"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                fullWidth
              />
              <div className="space-y-1.5">
                <label htmlFor="blog-status" className="block text-sm font-medium text-[var(--foreground)]">
                  Status
                </label>
                <select
                  id="blog-status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as 'DRAFT' | 'PUBLISHED' })
                  }
                  className="block w-full text-sm text-[var(--foreground)] bg-[var(--background)] border border-[var(--border)] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-colors duration-200"
                  style={{ borderRadius: getBorderRadius('md') }}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
            </div>

            <Input
              label="Featured Image URL"
              placeholder="https://example.com/image.jpg"
              value={formData.featuredImage}
              onChange={(e) => setFormData({ ...formData, featuredImage: e.target.value })}
              fullWidth
            />

            <Input
              label="Excerpt (Optional)"
              placeholder="Brief description of the blog post"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              fullWidth
              helperText="A short summary to display in blog listings"
            />

            {/* Rich Text Editor */}
            <div className="space-y-1.5">
              <label htmlFor="blog-content" className="block text-sm font-medium text-[var(--foreground)]">
                Blog Content <span className="text-[var(--destructive)]">*</span>
              </label>
              <div id="blog-content">
                <BlogEditor
                  content={formData.content}
                  onChange={(html) => setFormData({ ...formData, content: html })}
                  placeholder="Start writing your blog post here..."
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Blog List */}
      {!isEditing && (
        <div className="space-y-4">
          {blogs.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[var(--secondary-bg)] flex items-center justify-center">
                  <FaPlus className="w-8 h-8 text-[var(--muted-foreground)]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                    No blog posts yet
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">
                    Get started by creating your first blog post
                  </p>
                  <Button onClick={handleCreate} leftIcon={<FaPlus />}>
                    Create Blog Post
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {blogs.map((blog) => (
                <Card key={blog.id} className="p-6 hover:shadow-lg transition-shadow duration-200">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-[var(--foreground)]">
                          {blog.title}
                        </h3>
                        <span
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded',
                            blog.status === 'PUBLISHED'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          )}
                          style={{ borderRadius: getBorderRadius('sm') }}
                        >
                          {blog.status.toLowerCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
                        {blog.author && (
                          <>
                            <span>By {blog.author}</span>
                            <span>•</span>
                          </>
                        )}
                        {blog.publishedDate && <span>{formatDate(blog.publishedDate)}</span>}
                        {blog.publishedDate && <span>•</span>}
                        <span>•</span>
                        <span className="font-mono text-xs">/{blog.slug}</span>
                      </div>

                      {blog.excerpt && (
                        <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">
                          {blog.excerpt}
                        </p>
                      )}

                      {blog.featuredImage && (
                        <div className="mt-3">
                          <img
                            src={blog.featuredImage}
                            alt={blog.title}
                            className="w-full max-w-xs h-32 object-cover rounded"
                            style={{ borderRadius: getBorderRadius('md') }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(blog)}
                        leftIcon={<FaEdit />}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(blog.id)}
                        leftIcon={<FaTrash />}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BrandBlogs;

