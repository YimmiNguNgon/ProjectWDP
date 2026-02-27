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
  active: 'Đang bán',
  paused: 'Tạm ngừng',
  ended: 'Kết thúc',
  deleted: 'Đã xóa',
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
      toast.error('Lỗi khi tải danh sách sản phẩm');
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
      toast.success(`Đã upload ${urls.length} ảnh`);
    } catch {
      toast.error('Lỗi khi upload ảnh');
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
      toast.error('Vui lòng điền tên sản phẩm và giá hợp lệ');
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
      toast.success('Cập nhật sản phẩm thành công');
      setIsDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Lỗi khi cập nhật sản phẩm');
    } finally {
      setSaving(false);
    }
  };

  // Toggle listing status
  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.listingStatus === 'active' ? 'paused' : 'active';
    try {
      await updateListingStatus(product._id, newStatus);
      toast.success(`Đã chuyển sang "${listingStatusLabel[newStatus]}"`);
      fetchProducts();
    } catch {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  // Soft delete
  const handleDelete = async (product: Product) => {
    if (!confirm(`Bạn có chắc muốn xóa sản phẩm "${product.title}"?`)) return;
    try {
      await deleteProduct(product._id);
      toast.success('Đã xóa sản phẩm');
      fetchProducts();
    } catch {
      toast.error('Lỗi khi xóa sản phẩm');
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Quản lý sản phẩm</h1>
          <p className="text-gray-600 mt-1">Tổng cộng {total} sản phẩm</p>
        </div>
        <Link to="/seller/products/new">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Thêm sản phẩm mới
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Tìm kiếm theo tên sản phẩm..."
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
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="paused">Tạm ngừng</option>
          <option value="ended">Kết thúc</option>
        </select>
        <Button onClick={handleSearch}>Tìm kiếm</Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hình ảnh</TableHead>
              <TableHead>Tên sản phẩm</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Giá</TableHead>
              <TableHead>Tồn kho</TableHead>
              <TableHead>Đặc điểm</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">Đang tải...</TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <Package className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Không có sản phẩm nào</p>
                  <Link to="/seller/products/new">
                    <Button className="mt-4 bg-green-600 hover:bg-green-700" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      Thêm sản phẩm đầu tiên
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
                    {typeof product.categoryId === 'object' ? product.categoryId?.name ?? '—' : '—'}
                  </TableCell>
                  <TableCell>${product.price.toFixed(2)}</TableCell>
                  <TableCell>{product.quantity ?? 0}</TableCell>
                  <TableCell>
                    {product.variants && product.variants.length > 0 ? (
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Layers className="h-3 w-3" />
                        {product.variants.length} đặc điểm
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
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
                        Sửa
                      </Button>
                      {product.listingStatus !== 'deleted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStatus(product)}
                        >
                          {product.listingStatus === 'active' ? 'Tạm ngừng' : 'Kích hoạt'}
                        </Button>
                      )}
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(product)}>
                        Xóa
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
          Trang trước
        </Button>
        <span className="flex items-center px-4">Trang {page} / {totalPages}</span>
        <Button variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
          Trang sau
        </Button>
      </div>

      {/* View Detail Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết sản phẩm</DialogTitle>
            <DialogDescription>Thông tin đầy đủ của sản phẩm</DialogDescription>
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
                  <span className="text-gray-500">Giá:</span>
                  <span className="ml-2 font-semibold">${viewingProduct.price.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Tồn kho:</span>
                  <span className="ml-2 font-semibold">{viewingProduct.quantity ?? 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Danh mục:</span>
                  <span className="ml-2">{typeof viewingProduct.categoryId === 'object' ? viewingProduct.categoryId?.name ?? '—' : '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Tình trạng:</span>
                  <span className="ml-2">{viewingProduct.condition === 'new' ? 'Mới' : viewingProduct.condition === 'like_new' ? 'Như mới' : viewingProduct.condition === 'used' ? 'Đã qua sử dụng' : viewingProduct.condition || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Trạng thái:</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${listingStatusColor[viewingProduct.listingStatus] ?? 'bg-gray-100 text-gray-800'}`}>
                    {listingStatusLabel[viewingProduct.listingStatus]}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Ngày tạo:</span>
                  <span className="ml-2">{new Date(viewingProduct.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>

              {/* Variants */}
              {viewingProduct.variants && viewingProduct.variants.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Đặc điểm sản phẩm
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
                  <h4 className="font-semibold mb-3">Tồn kho theo tổ hợp</h4>
                  <div className="space-y-2">
                    {viewingProduct.variantCombinations.map((combo) => (
                      <div key={combo.key} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                        <span>{combo.selections.map((s) => s.value).join(' / ')}</span>
                        <span className="font-semibold">Kho: {combo.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>Đóng</Button>
            <Button onClick={() => { setIsViewDialogOpen(false); if (viewingProduct) handleEditClick(viewingProduct); }}>
              Sửa sản phẩm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sửa sản phẩm</DialogTitle>
            <DialogDescription>Cập nhật thông tin sản phẩm</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Tên sản phẩm *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Mô tả</Label>
              <Textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Giá ($) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Số lượng</Label>
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
                <Label>Danh mục</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                >
                  <option value="">Chọn danh mục</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Tình trạng</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                >
                  <option value="new">Mới</option>
                  <option value="like_new">Như mới</option>
                  <option value="used">Đã qua sử dụng</option>
                </select>
              </div>
            </div>

            {/* Images */}
            <div className="grid gap-2">
              <Label>Hình ảnh sản phẩm</Label>
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={uploading}
              />
              {uploading && <p className="text-sm text-gray-500">Đang upload...</p>}
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
                Đặc điểm sản phẩm
              </Label>
              <ProductVariantsManager
                variants={formData.variants}
                onChange={(variants) => setFormData({ ...formData, variants })}
                variantCombinations={formData.variantCombinations}
                onCombinationsChange={(variantCombinations) =>
                  setFormData({ ...formData, variantCombinations })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Hủy</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



