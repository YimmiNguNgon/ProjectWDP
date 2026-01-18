import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  MoreVertical,
  Package,
  CheckCircle,
  XCircle,
  ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  views: number;
  sales: number;
  rating: number;
  image: string;
}

export default function SellerProducts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Mock products data
  const products: Product[] = [
    { id: '1', name: 'Áo thun cotton', price: 24.99, stock: 45, category: 'Thời trang', status: 'active', views: 1245, sales: 89, rating: 4.8, image: 'https://via.placeholder.com/80' },
    { id: '2', name: 'Tai nghe Bluetooth', price: 59.99, stock: 23, category: 'Điện tử', status: 'active', views: 856, sales: 42, rating: 4.5, image: 'https://via.placeholder.com/80' },
    { id: '3', name: 'Sách lập trình', price: 34.99, stock: 0, category: 'Sách', status: 'out_of_stock', views: 342, sales: 56, rating: 4.9, image: 'https://via.placeholder.com/80' },
    { id: '4', name: 'Bình nước thể thao', price: 19.99, stock: 12, category: 'Thể thao', status: 'active', views: 567, sales: 34, rating: 4.3, image: 'https://via.placeholder.com/80' },
    { id: '5', name: 'Đèn ngủ LED', price: 29.99, stock: 8, category: 'Nhà cửa', status: 'active', views: 789, sales: 67, rating: 4.7, image: 'https://via.placeholder.com/80' },
    { id: '6', name: 'Balo laptop', price: 44.99, stock: 5, category: 'Phụ kiện', status: 'inactive', views: 234, sales: 12, rating: 4.2, image: 'https://via.placeholder.com/80' },
  ];

  const categories = ['Tất cả', 'Thời trang', 'Điện tử', 'Sách', 'Thể thao', 'Nhà cửa', 'Phụ kiện'];
  const statuses = ['Tất cả', 'Đang bán', 'Hết hàng', 'Ngừng bán'];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'Đang bán' && product.status === 'active') ||
      (selectedStatus === 'Hết hàng' && product.status === 'out_of_stock') ||
      (selectedStatus === 'Ngừng bán' && product.status === 'inactive');
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: Product['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Đang bán</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Ngừng bán</Badge>;
      case 'out_of_stock':
        return <Badge variant="destructive">Hết hàng</Badge>;
    }
  };

  const handleDelete = (productId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      toast.success('Đã xóa sản phẩm');
      // Add API call here
    }
  };

  const handleToggleStatus = (productId: string, currentStatus: Product['status']) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    toast.success(`Đã ${newStatus === 'active' ? 'kích hoạt' : 'tạm ngừng'} sản phẩm`);
    // Add API call here
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý sản phẩm</h1>
          <p className="text-gray-600">Tổng cộng {filteredProducts.length} sản phẩm</p>
        </div>
        <Link to="/seller/products/new">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Thêm sản phẩm mới
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm sản phẩm..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-auto">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat === 'Tất cả' ? 'all' : cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-auto">
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                {statuses.map(status => (
                  <option key={status} value={status === 'Tất cả' ? 'all' : status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Product Image */}
              <div className="relative h-48 bg-gray-100">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  {getStatusBadge(product.status)}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        Xem chi tiết
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(product.id, product.status)}>
                        {product.status === 'active' ? (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Tạm ngừng
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Kích hoạt
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <p className="text-sm text-gray-600 mb-3">{product.category}</p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-center text-sm">
                  <div className="border-r">
                    <div className="font-semibold">${product.price}</div>
                    <div className="text-gray-500 text-xs">Giá</div>
                  </div>
                  <div className="border-r">
                    <div className="font-semibold">{product.stock}</div>
                    <div className="text-gray-500 text-xs">Tồn kho</div>
                  </div>
                  <div>
                    <div className="font-semibold">{product.sales}</div>
                    <div className="text-gray-500 text-xs">Đã bán</div>
                  </div>
                </div>

                {/* Rating */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-1">★</span>
                    <span>{product.rating}</span>
                    <span className="text-gray-500 ml-1">({product.views} lượt xem)</span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="h-3 w-3 mr-1" />
                    Sửa
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy sản phẩm</h3>
          <p className="text-gray-600 mb-6">Thử thay đổi bộ lọc hoặc thêm sản phẩm mới</p>
          <Link to="/seller/products/new">
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Thêm sản phẩm đầu tiên
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}