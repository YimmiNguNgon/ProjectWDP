import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Upload,
  Image as ImageIcon,
  Tag,
  DollarSign,
  Package,
  Layers,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export default function AddProduct() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantCombinations, setVariantCombinations] = useState<ProductVariantCombination[]>([]);
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
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.title || !formData.price) {
      toast.error('Vui lòng điền tên sản phẩm và giá bán');
      setLoading(false);
      return;
    }

    try {
      await createProduct({
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity) || 0,
        condition: formData.condition,
        categoryId: formData.categoryId || undefined,
        variants,
        variantCombinations,
      });

      toast.success('Sản phẩm đã được thêm thành công!');
      navigate('/seller/products');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Có lỗi xảy ra khi thêm sản phẩm';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

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
            {/* Left Column - Main Info */}
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

              {/* Images */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Hình ảnh sản phẩm
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">Kéo thả hình ảnh vào đây hoặc click để chọn</p>
                    <p className="text-sm text-gray-500 mb-4">Định dạng: JPG, PNG, GIF. Tối đa 10MB</p>
                    <Button type="button" variant="outline">
                      Chọn hình ảnh
                    </Button>
                  </div>
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Tải lên ít nhất 3 hình ảnh chất lượng cao để tăng tỷ lệ chuyển đổi
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Variants / Đặc điểm */}
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

            {/* Right Column - Pricing & Details */}
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

              {/* Action Buttons */}
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={loading}
                    >
                      {loading ? 'Đang xử lý...' : 'Thêm sản phẩm'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/seller/products')}
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




