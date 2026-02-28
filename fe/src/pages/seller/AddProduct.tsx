import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Upload,
  Tag,
  DollarSign,
  Package,
  Layers,
  X,
  ImagePlus,
  Loader2,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { createProduct } from '@/api/seller-products';
import type { ProductVariant, ProductVariantCombination } from '@/api/seller-products';
import ProductVariantsManager from '@/components/seller/product-variants-manager';
import api from '@/lib/axios';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface ImageFile {
  file: File;
  previewUrl: string;
  uploading: boolean;
  uploadedUrl?: string;
  error?: string;
}

const MAX_IMAGES = 5;

export default function AddProduct() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantCombinations, setVariantCombinations] = useState<ProductVariantCombination[]>([]);
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);

  const totalVariantStock = variantCombinations.reduce(
    (sum, combo) => sum + (Number(combo.quantity) || 0),
    0,
  );

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    quantity: '',
    condition: 'new',
    categoryId: '',
  });

  useEffect(() => {
    api.get('/api/categories').then((res) => {
      const list = res.data?.data ?? res.data ?? [];
      setCategories(list);
    }).catch(() => { });

    // Cleanup preview URLs khi unmount
    return () => {
      imageFiles.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Xử lý chọn file ──────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - imageFiles.length;
    if (remaining <= 0) {
      toast.error(`Tối đa ${MAX_IMAGES} hình ảnh`);
      return;
    }

    const accepted = files.slice(0, remaining);
    const newImages: ImageFile[] = accepted.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: false,
    }));

    setImageFiles(prev => [...prev, ...newImages]);

    // Reset input để có thể chọn lại cùng file
    e.target.value = '';
  };

  // ── Kéo thả ──────────────────────────────────────────────────────────────────
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;

    const remaining = MAX_IMAGES - imageFiles.length;
    const accepted = files.slice(0, remaining);
    const newImages: ImageFile[] = accepted.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
      uploading: false,
    }));
    setImageFiles(prev => [...prev, ...newImages]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  // ── Xoá ảnh ──────────────────────────────────────────────────────────────────
  const removeImage = (idx: number) => {
    setImageFiles(prev => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // ── Set ảnh đại diện (đưa lên đầu) ───────────────────────────────────────────
  const setMainImage = (idx: number) => {
    if (idx === 0) return;
    setImageFiles(prev => {
      const copy = [...prev];
      const [main] = copy.splice(idx, 1);
      copy.unshift(main);
      return copy;
    });
    toast.success('Đã đặt làm ảnh đại diện');
  };

  // ── Upload tất cả ảnh lên Cloudinary ─────────────────────────────────────────
  const uploadAllImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];

    // Mark all as uploading
    setImageFiles(prev => prev.map(img => ({ ...img, uploading: true })));

    const formDataUpload = new FormData();
    imageFiles.forEach(img => formDataUpload.append('images', img.file));

    const res = await api.post('/api/upload/product-images', formDataUpload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const urls: string[] = res.data.urls ?? [];

    setImageFiles(prev => prev.map((img, i) => ({
      ...img,
      uploading: false,
      uploadedUrl: urls[i],
    })));

    return urls;
  };

  // ── Submit form ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.price) {
      toast.error('Vui lòng điền tên sản phẩm và giá bán');
      return;
    }

    setLoading(true);
    try {
      // Upload ảnh trước nếu có
      let imageUrls: string[] = [];
      if (imageFiles.length > 0) {
        toast.info('Đang tải ảnh lên...');
        imageUrls = await uploadAllImages();
      }

      await createProduct({
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity) || 0,
        condition: formData.condition,
        categoryId: formData.categoryId || undefined,
        image: imageUrls[0] ?? '',
        images: imageUrls,
        variants,
        variantCombinations,
      });

      toast.success('Sản phẩm đã được thêm thành công!');
      navigate('/seller/products');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Có lỗi xảy ra khi thêm sản phẩm';
      toast.error(msg);
      // Nếu lỗi xảy ra sau upload thì reset uploading state
      setImageFiles(prev => prev.map(img => ({ ...img, uploading: false })));
    } finally {
      setLoading(false);
    }
  };

  const isUploading = imageFiles.some(img => img.uploading);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Thêm sản phẩm mới</h1>
          <p className="text-gray-600">Tạo sản phẩm mới cho cửa hàng của bạn</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">

              {/* Product Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Thông tin sản phẩm
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Tên sản phẩm *</Label>
                    <Input
                      id="title"
                      name="title"
                      placeholder="Nhập tên sản phẩm"
                      value={formData.title}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Mô tả sản phẩm</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Mô tả chi tiết về sản phẩm..."
                      rows={6}
                      value={formData.description}
                      onChange={handleChange}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── Image Upload ── */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImagePlus className="h-5 w-5" />
                    Hình ảnh sản phẩm
                    <span className="ml-auto text-sm font-normal text-muted-foreground">
                      {imageFiles.length}/{MAX_IMAGES}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Drop zone */}
                  {imageFiles.length < MAX_IMAGES && (
                    <div
                      className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors select-none"
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                    >
                      <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm font-medium text-foreground mb-1">
                        Kéo thả ảnh vào đây hoặc click để chọn
                      </p>
                      <p className="text-xs text-muted-foreground">
                        JPG, PNG, WEBP · Tối đa 5MB/ảnh · Tối đa {MAX_IMAGES} ảnh
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </div>
                  )}

                  {/* Preview grid */}
                  {imageFiles.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {imageFiles.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square">
                          <img
                            src={img.previewUrl}
                            alt={`product-${idx}`}
                            className={`w-full h-full object-cover rounded-lg border-2 transition-all ${idx === 0
                                ? 'border-primary ring-2 ring-primary/30'
                                : 'border-border'
                              }`}
                          />

                          {/* Uploading overlay */}
                          {img.uploading && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                              <Loader2 className="h-6 w-6 text-white animate-spin" />
                            </div>
                          )}

                          {/* Main label */}
                          {idx === 0 && !img.uploading && (
                            <div className="absolute bottom-1 left-1 right-1 bg-primary/90 text-white text-[10px] font-medium text-center rounded py-0.5">
                              Ảnh chính
                            </div>
                          )}

                          {/* Action buttons (hover) */}
                          {!img.uploading && (
                            <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              {/* Set as main */}
                              {idx !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => setMainImage(idx)}
                                  title="Đặt làm ảnh chính"
                                  className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-white"
                                >
                                  <Star className="h-3.5 w-3.5 text-amber-500" />
                                </button>
                              )}
                              {/* Remove */}
                              <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                title="Xoá ảnh"
                                className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:bg-red-50"
                              >
                                <X className="h-3.5 w-3.5 text-red-500" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Add more button */}
                      {imageFiles.length < MAX_IMAGES && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        >
                          <ImagePlus className="h-5 w-5 mb-1" />
                          <span className="text-xs">Thêm</span>
                        </button>
                      )}
                    </div>
                  )}

                  {imageFiles.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      💡 Hover vào ảnh để xoá hoặc đặt làm ảnh chính. Ảnh đầu tiên sẽ được dùng làm ảnh đại diện.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Variants */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="h-5 w-5" />
                    Đặc điểm sản phẩm
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-4">
                    Thêm các đặc điểm như Kích thước, Màu sắc... và liệt kê các giá trị tương ứng.
                  </p>
                  <ProductVariantsManager
                    variants={variants}
                    onChange={setVariants}
                    variantCombinations={variantCombinations}
                    onCombinationsChange={setVariantCombinations}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Giá & Tồn kho
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Giá bán *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        placeholder="0.00"
                        className="pl-8"
                        value={formData.price}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Số lượng tồn kho</Label>
                    <div className="relative">
                      <Package className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        placeholder="Số lượng"
                        className="pl-10"
                        value={variantCombinations.length > 0 ? String(totalVariantStock) : formData.quantity}
                        onChange={handleChange}
                        disabled={variantCombinations.length > 0}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Danh mục</Label>
                    <select
                      id="categoryId"
                      name="categoryId"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.categoryId}
                      onChange={handleChange}
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map(cat => (
                        <option key={cat._id} value={cat._id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition">Tình trạng</Label>
                    <select
                      id="condition"
                      name="condition"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.condition}
                      onChange={handleChange}
                    >
                      <option value="new">Mới</option>
                      <option value="like_new">Như mới</option>
                      <option value="used">Đã qua sử dụng</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loading || isUploading}
                    >
                      {loading || isUploading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {isUploading ? 'Đang tải ảnh...' : 'Đang lưu...'}</>
                      ) : 'Thêm sản phẩm'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/seller/products')}
                      disabled={loading || isUploading}
                    >
                      Hủy bỏ
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
