import { useEffect, useState } from 'react';
import {
  createAdminCategory,
  deleteAdminCategory,
  getAllAdminCategories,
  type AdminCategory,
  updateAdminCategory,
} from '@/api/admin-categories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface CategoryForm {
  name: string;
  slug: string;
  imageUrl: string;
}

const DEFAULT_FORM: CategoryForm = {
  name: '',
  slug: '',
  imageUrl: '',
};

const toSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function CategoryManagement() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<CategoryForm>(DEFAULT_FORM);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await getAllAdminCategories({
        page,
        limit: 10,
        search: search.trim() || undefined,
      });
      setCategories(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    fetchCategories();
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const openEditDialog = (category: AdminCategory) => {
    setEditingCategory(category);
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      imageUrl: category.imageUrl || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const normalizedName = form.name.trim();
    const normalizedSlug = toSlug(form.slug || form.name);

    if (!normalizedName) {
      toast.error('Category name is required');
      return;
    }

    if (!normalizedSlug) {
      toast.error('Category slug is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: normalizedName,
        slug: normalizedSlug,
        imageUrl: form.imageUrl.trim(),
      };

      if (editingCategory) {
        await updateAdminCategory(editingCategory._id, payload);
        toast.success('Category updated successfully');
      } else {
        await createAdminCategory(payload);
        toast.success('Category created successfully');
      }

      setDialogOpen(false);
      setEditingCategory(null);
      setForm(DEFAULT_FORM);
      fetchCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (category: AdminCategory) => {
    const confirmed = window.confirm(
      `Delete category "${category.name}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteAdminCategory(category._id);
      toast.success('Category deleted successfully');

      if (categories.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        fetchCategories();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Category Management</h1>
          <p className="text-gray-500 mt-1">Total categories: {total}</p>
        </div>
        <Button onClick={openCreateDialog}>Create Category</Button>
      </div>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Image</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  No categories found
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category._id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell>{category.slug}</TableCell>
                  <TableCell>
                    {category.imageUrl ? (
                      <a
                        href={category.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View image
                      </a>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(category.createdAt).toLocaleDateString('en-US')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(category)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(category)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center gap-2 mt-6">
        <Button
          variant="outline"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <span className="flex items-center px-4">
          Page {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page === totalPages}
        >
          Next
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Update Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription>
              Fill category information and save changes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name *</Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
                placeholder="Category name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-slug">Slug *</Label>
              <Input
                id="category-slug"
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    slug: e.target.value,
                  }))
                }
                placeholder="electronics-accessories"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-image-url">Image URL</Label>
              <Input
                id="category-image-url"
                value={form.imageUrl}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    imageUrl: e.target.value,
                  }))
                }
                placeholder="https://..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? editingCategory
                  ? 'Updating...'
                  : 'Creating...'
                : editingCategory
                  ? 'Update'
                  : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
