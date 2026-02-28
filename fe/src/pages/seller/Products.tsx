import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Package, Layers, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  getMyListings,
  updateProduct,
  updateListingStatus,
  deleteProduct,
  type Product,
  type ProductVariant,
  type ProductVariantCombination,
} from '@/api/seller-products';
import ProductVariantsManager from '@/components/seller/product-variants-manager';
import api from '@/lib/axios';

interface Category {
  _id: string;
  name: string;
}

interface EditFormData {
  title: string;
  description: string;
  price: number;
  quantity: number;
  condition: string;
  categoryId: string;
  images: string[];
  variants: ProductVariant[];
  variantCombinations: ProductVariantCombination[];
}

const listingStatusLabel: Record<string, string> = {
  active: 'Active',
  paused: 'Pause',
  ended: 'Ended',
  deleted: 'Deleted',
};

const listingStatusColor: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  ended: 'bg-gray-100 text-gray-800',
  deleted: 'bg-red-100 text-red-800',
};

export default function SellerProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<EditFormData>({
    title: '',
    description: '',
    price: 0,
    quantity: 0,
    condition: 'new',
    categoryId: '',
    images: [],
    variants: [],
    variantCombinations: [],
  });
  const totalVariantStock = formData.variantCombinations.reduce(
    (sum, combo) => sum + (Number(combo.quantity) || 0),
    0,
  );

  useEffect(() => {
    api.get('/api/categories').then((res) => {
      setCategories(res.data?.data ?? res.data ?? []);
    }).catch(() => { });
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await getMyListings(params);
      setProducts(res.data ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(Math.ceil((res.total ?? 0) / 10) || 1);
    } catch {
      toast.error('Failed to load product list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, statusFilter]);

  const handleSearch = () => {
    setPage(1);
    fetchProducts();
  };

  // Open edit dialog
  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      title: product.title,
      description: product.description,
      price: product.price,
      quantity: product.quantity ?? 0,
      condition: product.condition || 'new',
      categoryId: typeof product.categoryId === 'object' ? product.categoryId?._id ?? '' : product.categoryId ?? '',
      images: product.images ?? [],
      variants: product.variants ?? [],
      variantCombinations: product.variantCombinations ?? [],
    });
    setIsDialogOpen(true);
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((file) => fd.append('images', file));
      const res = await api.post('/api/upload/product-images', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const urls: string[] = res.data.urls ?? [];
      setFormData((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
      toast.success(`Uploaded ${urls.length} images`);
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  // Save edit
  const handleSave = async () => {
    if (!editingProduct) return;
    if (!formData.title || formData.price <= 0) {
      toast.error('Please enter a valid product name and price');
      return;
    }
    setSaving(true);
    try {
      await updateProduct(editingProduct._id, {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        quantity: formData.quantity,
        condition: formData.condition,
        categoryId: formData.categoryId || undefined,
        images: formData.images,
        variants: formData.variants,
        variantCombinations: formData.variantCombinations,
      });
      toast.success('Product updated successfully');
      setIsDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  // Toggle listing status
  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.listingStatus === 'active' ? 'paused' : 'active';
    try {
      await updateListingStatus(product._id, newStatus);
      toast.success(`Changed to "${listingStatusLabel[newStatus]}"`);
      fetchProducts();
    } catch {
      toast.error('Failed to update listing status');
    }
  };

  // Soft delete
  const handleDelete = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete product "${product.title}"?`)) return;
    try {
      await deleteProduct(product._id);
      toast.success('Product deleted');
      fetchProducts();
    } catch {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Product Management</h1>
          <p className="text-gray-600 mt-1">Total {total} products</p>
        </div>
        <Link to="/seller/products/new">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Add New Product
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search by product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="paused">Pause</option>
          <option value="ended">Ended</option>
        </select>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Variants</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <Package className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No products found</p>
                  <Link to="/seller/products/new">
                    <Button className="mt-4 bg-green-600 hover:bg-green-700" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Your First Product
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product._id}>
                  <TableCell>
                    {product.images && product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-16 h-16 object-cover rounded"
                        onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/64?text=No+Image'; }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                        No Image
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px]">
                    <div className="truncate" title={product.title}>{product.title}</div>
                  </TableCell>
                  <TableCell>
                    {typeof product.categoryId === 'object' ? product.categoryId?.name ?? '-' : '-'}
                  </TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>{product.quantity ?? 0}</TableCell>
                  <TableCell>
                    {product.variants && product.variants.length > 0 ? (
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Layers className="h-3 w-3" />
                        {product.variants.length} variants
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs ${listingStatusColor[product.listingStatus] ?? 'bg-gray-100 text-gray-800'}`}>
                      {listingStatusLabel[product.listingStatus] ?? product.listingStatus}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(product.createdAt).toLocaleDateString('vi-VN')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={() => { setViewingProduct(product); setIsViewDialogOpen(true); }}>
                        <Eye className="h-3 w-3 mr-1" />
                        Xem
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEditClick(product)}>
                        Edit
                      </Button>
                      {product.listingStatus !== 'deleted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStatus(product)}
                        >
                          {product.listingStatus === 'active' ? 'Pause' : 'Activate'}
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(product)}>
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

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-6">
        <Button variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
          Previous
        </Button>
        <span className="flex items-center px-4">Page {page} / {totalPages}</span>
        <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
          Next
        </Button>
      </div>

      {/* View Detail Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>Full product information</DialogDescription>
          </DialogHeader>
          {viewingProduct && (
            <div className="space-y-5 py-2">
              {/* Images */}
              {viewingProduct.images && viewingProduct.images.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {viewingProduct.images.map((url, i) => (
                    <img key={i} src={url} alt="" className="w-24 h-24 object-cover rounded border" />
                  ))}
                </div>
              ) : (
                <div className="w-24 h-24 bg-gray-100 rounded border flex items-center justify-center text-xs text-gray-400">No Image</div>
              )}

              {/* Title & Description */}
              <div>
                <h3 className="text-lg font-bold">{viewingProduct.title}</h3>
                {viewingProduct.description && (
                  <p className="text-sm text-gray-600 mt-1">{viewingProduct.description}</p>
                )}
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Price:</span>
                  <span className="ml-2 font-semibold">${viewingProduct.price.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Stock:</span>
                  <span className="ml-2 font-semibold">{viewingProduct.quantity ?? 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Category:</span>
                  <span className="ml-2">{typeof viewingProduct.categoryId === 'object' ? viewingProduct.categoryId?.name ?? '-' : '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Condition:</span>
                  <span className="ml-2">{viewingProduct.condition === 'new' ? 'New' : viewingProduct.condition === 'like_new' ? 'Like New' : viewingProduct.condition === 'used' ? 'Used' : viewingProduct.condition || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${listingStatusColor[viewingProduct.listingStatus] ?? 'bg-gray-100 text-gray-800'}`}>
                    {listingStatusLabel[viewingProduct.listingStatus]}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Created Date:</span>
                  <span className="ml-2">{new Date(viewingProduct.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>

              {/* Variants */}
              {viewingProduct.variants && viewingProduct.variants.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Product Variants
                  </h4>
                  <div className="space-y-4">
                    {viewingProduct.variants.map((variant) => (
                      <div key={variant.name}>
                        <p className="text-sm font-medium text-gray-700 mb-2">{variant.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {variant.options.map((opt) => (
                            <div
                              key={opt.value}
                              className="border rounded-md px-3 py-2 text-sm border-solid bg-white"
                            >
                              <div className="font-medium">{opt.value}</div>
                              <div className="text-xs text-gray-500 space-x-2">
                                {opt.sku && <span>SKU: {opt.sku}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewingProduct.variantCombinations && viewingProduct.variantCombinations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3">Combination Stock</h4>
                  <div className="space-y-2">
                    {viewingProduct.variantCombinations.map((combo) => (
                      <div key={combo.key} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                        <span>{combo.selections.map((s) => s.value).join(' / ')}</span>
                        <span className="font-semibold">
                          Price: ${Number(combo.price ?? viewingProduct.price ?? 0).toFixed(2)} | Stock: {combo.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => { setIsViewDialogOpen(false); if (viewingProduct) handleEditClick(viewingProduct); }}>
              Edit Product
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product information</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Product Name *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Price ($) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.variantCombinations.length > 0 ? totalVariantStock : formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                  disabled={formData.variantCombinations.length > 0}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Condition</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                >
                  <option value="new">New</option>
                  <option value="like_new">Like New</option>
                  <option value="used">Used</option>
                </select>
              </div>
            </div>

            {/* Images */}
            <div className="grid gap-2">
              <Label>Product Images</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
              {formData.images.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {formData.images.map((url, index) => (
                    <div key={index} className="relative group">
                      <img src={url} alt="" className="w-full h-20 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Variants */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Product Variants
              </Label>
              <ProductVariantsManager
                variants={formData.variants}
                onChange={(variants) => setFormData({ ...formData, variants })}
                variantCombinations={formData.variantCombinations}
                basePrice={Number(formData.price) || 0}
                onCombinationsChange={(variantCombinations) =>
                  setFormData({ ...formData, variantCombinations })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}






