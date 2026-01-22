import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Gavel,
  Calendar,
  Clock,
  Truck,
  AlertCircle,
  ArrowLeft,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/use-auth';
import { Switch } from '@/components/ui/switch';

interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  sellerId: string;
  isAuction: boolean;
  createdAt: string;
  updatedAt: string;
  auctionEndTime: string | null;
  stock: number;
  sales: number;
  status: string;
  condition?: string;
  brand?: string;
  shippingCost?: number;
  returnPolicy?: string;
}

interface ProductFormData {
  title: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  isAuction: boolean;
  auctionEndTime: string | null;
  stock: number;
  status: string;
  condition: string;
  brand: string;
  shippingCost: number;
  returnPolicy: string;
}

export default function SellerEditProduct() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [originalProduct, setOriginalProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState<ProductFormData>({
    title: '',
    description: '',
    price: 0,
    image: '',
    categoryId: '',
    isAuction: false,
    auctionEndTime: null,
    stock: 1,
    status: 'active',
    condition: 'new',
    brand: '',
    shippingCost: 0,
    returnPolicy: '30_days'
  });

  const categories = [
    { id: '60d21b4667d0d8992e610c85', name: 'Điện tử' },
    { id: '60d21b4667d0d8992e610c86', name: 'Máy tính & Laptop' },
    { id: '60d21b4667d0d8992e610c87', name: 'Thời trang' },
    { id: '60d21b4667d0d8992e610c88', name: 'Phụ kiện' },
    { id: '60d21b4667d0d8992e610c89', name: 'Nhà cửa & Đời sống' },
  ];

  const statuses = [
    { value: 'active', label: 'Đang bán', color: 'green' },
    { value: 'inactive', label: 'Ngừng bán', color: 'gray' }
  ];


  // Fetch product data
  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoadingProduct(true);
      const response = await api.get(`/products/${id}`);
      const product: Product = response.data;
      
      setOriginalProduct(product);
      
      // Format form data
    //   const formattedData: ProductFormData = {
    //     title: product.title || '',
    //     description: product.description || '',
    //     price: product.price || 0,
    //     image: product.image || '',
    //     categoryId: product.categoryId || '',
    //     stock: product.stock || 1,
    //     status: product.status || 'active',
    //     brand: product.brand || '',
    //     shippingCost: product.shippingCost || 0,
    //   };
      
    //   setFormData(formattedData);
    //   setPreviewUrl(formattedData.image);
      
    } catch (error: any) {
      console.error('Error fetching product:', error);
      toast.error('Không thể tải thông tin sản phẩm');
      navigate('/seller/products');
    } finally {
      setLoadingProduct(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric fields
    if (name === 'price' || name === 'stock' || name === 'shippingCost') {
      const numValue = parseFloat(value) || 0;
      setFormData(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleToggleAuction = (checked: boolean) => {
    setFormData(prev => ({ 
      ...prev, 
      isAuction: checked,
      stock: checked ? 1 : prev.stock
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file hình ảnh (JPG, PNG, GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước file quá lớn. Tối đa 10MB');
      return;
    }

    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleAuctionEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) {
      setFormData(prev => ({ ...prev, auctionEndTime: null }));
      return;
    }
    
    const date = new Date(value);
    const isoString = date.toISOString();
    setFormData(prev => ({ ...prev, auctionEndTime: isoString }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm');
      return;
    }

    if (formData.price <= 0) {
      toast.error('Vui lòng nhập giá hợp lệ');
      return;
    }

    if (!formData.categoryId) {
      toast.error('Vui lòng chọn danh mục');
      return;
    }

    if (formData.stock < 0) {
      toast.error('Số lượng tồn kho không hợp lệ');
      return;
    }

    setLoading(true);

    try {
      // Prepare update data - chỉ gửi những trường cần update
      const updateData: Partial<ProductFormData> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: formData.price,
        categoryId: formData.categoryId,
        auctionEndTime: formData.isAuction ? formData.auctionEndTime : null,
        stock: formData.stock,
        status: formData.status,
        condition: formData.condition,
        brand: formData.brand.trim(),
        shippingCost: formData.shippingCost,
        returnPolicy: formData.returnPolicy,
      };

      // Nếu có ảnh mới, xử lý upload
      if (imageFile) {
        toast.info('Đang tải lên hình ảnh mới...');
        // Trong thực tế, bạn cần gọi API upload ảnh ở đây
        // Tạm thời dùng URL từ file
        const reader = new FileReader();
        reader.onloadend = async () => {
          updateData.image = reader.result as string;
          await performUpdate(updateData);
        };
        reader.readAsDataURL(imageFile);
      } else {
        // Giữ nguyên ảnh cũ
        updateData.image = formData.image;
        await performUpdate(updateData);
      }

    } catch (error: any) {
      console.error('Error updating product:', error);
      toast.error('Có lỗi xảy ra khi cập nhật sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const performUpdate = async (updateData: Partial<ProductFormData>) => {
    try {
      const response = await api.put(`/api/products/${id}`, updateData);
      
      if (response.data) {
        toast.success('Sản phẩm đã được cập nhật thành công!');
        navigate('/seller/products');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const calculateAuctionEndTime = () => {
    if (!formData.auctionEndTime) return '';
    const date = new Date(formData.auctionEndTime);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return '';
    }
  };

  const resetForm = () => {
    if (originalProduct) {
      const formattedData: ProductFormData = {
        title: originalProduct.title || '',
        description: originalProduct.description || '',
        price: originalProduct.price || 0,
        image: originalProduct.image || '',
        categoryId: originalProduct.categoryId || '',
        isAuction: originalProduct.isAuction || false,
        auctionEndTime: originalProduct.auctionEndTime || null,
        stock: originalProduct.stock || 1,
        status: originalProduct.status || 'active',
        condition: originalProduct.condition || 'new',
        brand: originalProduct.brand || '',
        shippingCost: originalProduct.shippingCost || 0,
        returnPolicy: originalProduct.returnPolicy || '30_days'
      };
      setFormData(formattedData);
      setPreviewUrl(formattedData.image);
      setImageFile(null);
    }
  };

  if (loadingProduct) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">Đang tải thông tin sản phẩm...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/seller/products')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Chỉnh sửa sản phẩm
                </h1>
                <p className="text-gray-600">
                  Cập nhật thông tin sản phẩm của bạn
                </p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Thông tin cơ bản
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
                    <Label htmlFor="description">Mô tả sản phẩm *</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Mô tả chi tiết về sản phẩm..."
                      rows={6}
                      value={formData.description}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="brand">Thương hiệu</Label>
                    <Input
                      id="brand"
                      name="brand"
                      placeholder="Nhập thương hiệu"
                      value={formData.brand}
                      onChange={handleChange}
                    />
                  </div>

                  {/* <div className="space-y-2">
                    <Label>Tình trạng sản phẩm</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {conditions.map((cond) => (
                        <label
                          key={cond.value}
                          className={`flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${
                            formData.condition === cond.value
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="condition"
                            value={cond.value}
                            checked={formData.condition === cond.value}
                            onChange={handleChange}
                            className="hidden"
                          />
                          <span className="text-sm text-center">{cond.label}</span>
                        </label>
                      ))}
                    </div>
                  </div> */}
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
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/3">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center h-48 flex flex-col items-center justify-center">
                        {previewUrl ? (
                          <>
                            <div className="relative w-full h-32 mb-2">
                              <img
                                src={previewUrl}
                                alt="Preview"
                                className="w-full h-full object-cover rounded"
                              />
                            </div>
                            <p className="text-sm text-gray-600">Hình ảnh hiện tại</p>
                          </>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">Chưa có hình ảnh</p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="md:w-2/3">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-2">Tải lên hình ảnh mới</p>
                        <p className="text-sm text-gray-500 mb-4">Định dạng: JPG, PNG. Tối đa 10MB</p>
                        <input
                          type="file"
                          id="image-upload"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('image-upload')?.click()}
                        >
                          Chọn hình ảnh mới
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Để giữ nguyên ảnh cũ, không chọn ảnh mới
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Pricing & Settings */}
            <div className="space-y-6">
              {/* Pricing & Stock */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Giá & Tồn kho
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Giá *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-8"
                        value={formData.price}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="stock">Số lượng tồn kho *</Label>
                    <div className="relative">
                      <Package className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="stock"
                        name="stock"
                        type="number"
                        min={formData.isAuction ? 1 : 0}
                        placeholder="Số lượng"
                        className="pl-10"
                        value={formData.stock}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  {formData.isAuction && (
                    <div className="space-y-2">
                      <Label htmlFor="auctionEndTime">Thời gian kết thúc</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          id="auctionEndTime"
                          name="auctionEndTime"
                          type="datetime-local"
                          className="pl-10"
                          value={calculateAuctionEndTime()}
                          onChange={handleAuctionEndTimeChange}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      </div>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Để trống nếu không giới hạn thời gian
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category & Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Danh mục & Trạng thái
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Danh mục *</Label>
                    <select
                      id="categoryId"
                      name="categoryId"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.categoryId}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Chọn danh mục</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Trạng thái sản phẩm</Label>
                    <select
                      id="status"
                      name="status"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.status}
                      onChange={handleChange}
                    >
                      {statuses.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* <div className="space-y-2">
                    <Label htmlFor="shippingCost">Phí vận chuyển ($)</Label>
                    <div className="relative">
                      <Truck className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                      <Input
                        id="shippingCost"
                        name="shippingCost"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-10"
                        value={formData.shippingCost}
                        onChange={handleChange}
                      />
                    </div>
                  </div> */}

                  {/* <div className="space-y-2">
                    <Label htmlFor="returnPolicy">Chính sách trả hàng</Label>
                    <select
                      id="returnPolicy"
                      name="returnPolicy"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.returnPolicy}
                      onChange={handleChange}
                    >
                      {returnPolicies.map(policy => (
                        <option key={policy.value} value={policy.value}>
                          {policy.label}
                        </option>
                      ))}
                    </select>
                  </div> */}
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
                      {loading ? (
                        <>
                          <span className="animate-spin mr-2">⟳</span>
                          Đang cập nhật...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Lưu thay đổi
                        </>
                      )}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full"
                      onClick={() => navigate('/seller/products')}
                      disabled={loading}
                    >
                      Hủy bỏ
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats
              {originalProduct && (
                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Thống kê nhanh</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tồn kho hiện tại:</span>
                        <span className="font-medium">{originalProduct.stock}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Đã bán:</span>
                        <span className="font-medium text-green-600">{originalProduct.sales}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Loại sản phẩm:</span>
                        <span className="font-medium">
                          {originalProduct.isAuction ? 'Đấu giá' : 'Giá cố định'}
                        </span>
                      </div>
                      {originalProduct.auctionEndTime && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Kết thúc đấu giá:</span>
                          <span className="font-medium">
                            {formatDate(originalProduct.auctionEndTime)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )} */}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}