import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDebounce } from "@/hooks/use-debounce";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  MoreVertical,
  Package,
  CheckCircle,
  XCircle,
  X,
  Calendar,
  User,
  Tag,
  BarChart3,
  Star,
  ShoppingBag,
  Clock,
  Package2,
  DollarSign,
  Hash,
  BarChart
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
import api from "@/lib/axios";

interface Product {
  _id: string;
  title: string;
  price: number;
  description: string;
  image: string;
  categoryId: string | null;
  sellerId: string;
  isAuction: boolean;
  auctionEndTime: string | null;
  createdAt: string;
  updatedAt: string;
  stock?: number;
  category?: string;
  status?: 'active' | 'inactive' | 'out_of_stock';
  views?: number;
  sales?: number;
  rating?: number;
}

export default function SellerProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get("categories")
      ? searchParams.get("categories")!.split(",")
      : [],
  );
  
  const [priceRange, setPriceRange] = useState<[number, number]>([
    parseInt(searchParams.get("minPrice") || "0"),
    parseInt(searchParams.get("maxPrice") || "10000"),
  ]);

  const debouncedPriceRange = useDebounce(priceRange, 300);
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1"),
  );
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  const categories = ['Tất cả', 'Thời trang', 'Electronics', 'Sách', 'Thể thao', 'Nhà cửa', 'Accessories'];
  const statuses = ['Tất cả', 'Đang bán', 'Ngừng bán'];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'Đang bán' && product.status === 'active') ||
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

  const handleViewDetail = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailModalOpen(true);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const params = new URLSearchParams();
        params.append("page", currentPage.toString());
        params.append("limit", itemsPerPage.toString());
        params.append("minPrice", debouncedPriceRange[0].toString());
        params.append("maxPrice", debouncedPriceRange[1].toString());
        
        const res = await api.get(`/api/products?${params.toString()}`);
        
        // Transform API data to match Product interface
        const transformedProducts = res.data.data.map((product: any) => ({
          ...product,
          stock: product.stock || Math.floor(Math.random() * 100),
          category: product.category || categories[Math.floor(Math.random() * (categories.length - 1)) + 1],
          status: (['active', 'inactive'] as const)[Math.floor(Math.random() * 2)],
          views: product.views || Math.floor(Math.random() * 1000),
          sales: product.sales || Math.floor(Math.random() * 100),
          rating: product.rating || (Math.random() * 2 + 3).toFixed(1)
        }));
        
        setProducts(transformedProducts);
        setTotalPages(Math.ceil((res.data.total || 0) / itemsPerPage));
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    };
    fetchProducts();
  }, [selectedCategories, currentPage, debouncedPriceRange]);

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
          <Card key={product._id} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-0">
              {/* Product Image */}
              <div className="relative h-48 bg-gray-100">
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3">
                  {getStatusBadge(product.status)}
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">{product.title}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetail(product)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Xem chi tiết
                      </DropdownMenuItem>
                      <Link to={`/seller/products/edit/${product._id}`}>
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem onClick={() => handleToggleStatus(product._id, product.status!)}>
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
                        onClick={() => handleDelete(product._id)}
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
                    <div className="font-semibold">${product.price.toLocaleString()}</div>
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

      {/* Product Detail Modal */}
      {isDetailModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Chi tiết sản phẩm</h2>
                <p className="text-sm text-gray-500">ID: {selectedProduct._id}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Product Image & Basic Info */}
                <div>
                  {/* Product Image */}
                  <div className="bg-gray-100 rounded-lg overflow-hidden mb-4">
                    <img
                      src={selectedProduct.image}
                      alt={selectedProduct.title}
                      className="w-full h-64 object-cover"
                    />
                  </div>

                  {/* Basic Info Cards */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                          <div>
                            <p className="text-sm text-gray-500">Giá bán</p>
                            <p className="text-lg font-semibold">${selectedProduct.price.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <Package2 className="h-5 w-5 text-blue-600 mr-2" />
                          <div>
                            <p className="text-sm text-gray-500">Tồn kho</p>
                            <p className="text-lg font-semibold">{selectedProduct.stock} sản phẩm</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Product Status */}
                  <Card className="mb-6">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="mr-3">
                            {selectedProduct.status === 'active' ? (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            ) : selectedProduct.status === 'inactive' ? (
                              <XCircle className="h-5 w-5 text-gray-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Trạng thái</p>
                            <p className="font-medium">
                              {selectedProduct.status === 'active' 
                                ? 'Đang bán' 
                                : selectedProduct.status === 'inactive' 
                                ? 'Ngừng bán' 
                                : 'Hết hàng'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Detailed Info */}
                <div>
                  {/* Product Title & Category */}
                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{selectedProduct.title}</h3>
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 text-gray-400 mr-2" />
                      <Badge variant="outline">{selectedProduct.category}</Badge>
                    </div>
                  </div>

                  {/* Description */}
                  <Card className="mb-6">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <Package className="h-4 w-4 mr-2" />
                        Mô tả sản phẩm
                      </h4>
                      <p className="text-gray-600 text-sm">{selectedProduct.description}</p>
                    </CardContent>
                  </Card>

                  {/* Performance Stats */}
                  <Card className="mb-6">
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Hiệu suất bán hàng
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{selectedProduct.sales}</p>
                          <p className="text-xs text-gray-500">Đã bán</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{selectedProduct.views}</p>
                          <p className="text-xs text-gray-500">Lượt xem</p>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center">
                            <Star className="h-4 w-4 text-yellow-500 mr-1" />
                            <span className="text-2xl font-bold">{selectedProduct.rating}</span>
                          </div>
                          <p className="text-xs text-gray-500">Đánh giá</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional Information */}
                  <Card>
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <Hash className="h-4 w-4 mr-2" />
                        Thông tin bổ sung
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Ngày tạo:</span>
                          </div>
                          <span className="text-sm font-medium">{formatDate(selectedProduct.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Cập nhật:</span>
                          </div>
                          <span className="text-sm font-medium">{formatDate(selectedProduct.updatedAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">Mã người bán:</span>
                          </div>
                          <span className="text-sm font-medium truncate ml-2">{selectedProduct.sellerId}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsDetailModalOpen(false)}
              >
                Đóng
              </Button>
              <Link to={`/seller/products/edit/${selectedProduct._id}`}>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}