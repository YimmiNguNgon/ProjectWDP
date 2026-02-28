// pages/seller/AddProduct.jsx - SIMPLIFIED VERSION
import { useState , ChangeEvent, FormEvent} from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  Image as ImageIcon, 
  DollarSign, 
  Package, 
  FileText,
  Plus,
  X,
  Clock,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface ProductFormData {
  title: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  status: string;
  isAuction: boolean;
  image: string;
  auctionEndTime: string | null;
}

export default function SellerAddProduct() {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    status: 'active',
    isAuction: false,
    image: '',
    auctionEndTime: null,
  });
  
  const [uploading, setUploading] = useState(false);
  
  // Categories
  const categories = [
    'Electronics',
    'Fashion',
    'Home & Garden',
    'Books',
    'Sports',
    'Beauty',
    'Toys',
    'Food',
    'Furniture',
    'Other'
  ];
  
  // Handle form input changes
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type} = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };
  
  // Handle single image upload
  const handleSingleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;
    
    // Validate file type
    const isValidType = ['image/jpeg', 'image/png'].includes(file.type);
    if (!isValidType) {
      toast.error('Chỉ chấp nhận file JPG và PNG');
      return;
    }
    
    // Validate file size (5MB max)
    const isValidSize = file.size <= 5 * 1024 * 1024;
    if (!isValidSize) {
      toast.error('Kích thước file không được vượt quá 5MB');
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, image: reader.result as string }));
      toast.success('Upload ảnh thành công');
    };
    reader.onerror = () => {
      toast.error('Lỗi khi đọc file ảnh');
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    e.target.value = '';
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      toast.error('Vui lòng nhập tên sản phẩm');
      return;
    }
    
    if (!formData.price || Number(formData.price) <= 0) {
      toast.error('Vui lòng nhập giá hợp lệ');
      return;
    }
    
    if (!formData.stock || Number(formData.stock) < 0) {
      toast.error('Vui lòng nhập số lượng hợp lệ');
      return;
    }
    
    if (!formData.category) {
      toast.error('Vui lòng chọn danh mục');
      return;
    }
    
    if (!formData.image) {
      toast.error('Vui lòng upload ảnh sản phẩm');
      return;
    }
    
    setUploading(true);
    
    try {
      const productData = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        stock: Number(formData.stock),
        category: formData.category,
        status: formData.status,
        isAuction: formData.isAuction,
        image: formData.image,
        auctionEndTime: formData.isAuction ? formData.auctionEndTime : null,
      };
      
      console.log('Submitting product data:', productData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Thêm sản phẩm thành công!');
      navigate('/seller/products');
      
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Lỗi khi thêm sản phẩm');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/seller/products')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Thêm sản phẩm mới</h1>
            <p className="text-gray-600">Thêm sản phẩm mới vào cửa hàng</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Thông tin cơ bản
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Tên sản phẩm <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="Nhập tên sản phẩm"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">
                    Giá bán ($) <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      placeholder="0.00"
                      className="pl-10"
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stock">
                    Số lượng <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Layers className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="stock"
                      name="stock"
                      type="number"
                      placeholder="0"
                      min="0"
                      className="pl-10"
                      value={formData.stock}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">
                    Danh mục <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Trạng thái</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Mô tả sản phẩm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="description">Mô tả chi tiết</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Mô tả về sản phẩm..."
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Product Image - SIMPLIFIED */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Ảnh sản phẩm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {/* Upload Section */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {!formData.image ? (
                    <>
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">
                        Click để upload ảnh sản phẩm
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        Chỉ chấp nhận JPG, PNG (tối đa 5MB)
                      </p>
                      <Input
                        id="image"
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleSingleImageUpload}
                        className="hidden"
                      />
                      <Label htmlFor="image">
                        <Button type="button" variant="outline" asChild>
                          <span>Chọn ảnh</span>
                        </Button>
                      </Label>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative mx-auto max-w-xs">
                        <img
                          src={formData.image}
                          alt="Product preview"
                          className="w-full h-48 object-contain rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">
                        Click nút X để xóa và upload ảnh khác
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Or enter URL */}
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Hoặc nhập URL ảnh</Label>
                  <div className="flex gap-2">
                    <Input
                      id="imageUrl"
                      name="imageUrl"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={formData.image}
                      onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                    />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Auction Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Cài đặt đấu giá
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Chế độ đấu giá</Label>
                  <p className="text-sm text-gray-500">Bật chế độ đấu giá cho sản phẩm</p>
                </div>
                <Switch
                  checked={formData.isAuction}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, isAuction: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/seller/products')}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang thêm...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Thêm sản phẩm
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}