import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Truck, 
  CheckCircle, 
  Clock, 
  XCircle,
  Package,
  Download,
  Eye,
  MoreVertical,
  X,
  User,
  CreditCard,
  Calendar,
  MapPin,
  Printer
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from 'sonner';
import { orderService } from '@/services/orderService';

interface Order {
  _id: string;
  username: string;
  email: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: number;
  date: string;
  paymentMethod: string;
  phone?: string;
  address?: string;
  orderDetails?: Array<{
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

// Component Popup Chi tiết đơn hàng
function OrderDetailsPopup({ order, onClose }: { order: Order | null, onClose: () => void }) {
  if (!order) return null;

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-300 text-yellow-800 bg-yellow-50">Chờ xác nhận</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-blue-300 text-blue-800 bg-blue-50">Đang xử lý</Badge>;
      case 'shipped':
        return <Badge variant="outline" className="border-purple-300 text-purple-800 bg-purple-50">Đang giao</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="border-green-300 text-green-800 bg-green-50">Đã giao</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-red-300 text-red-800 bg-red-50">Đã hủy</Badge>;
      default:
        return <Badge variant="outline">Không xác định</Badge>;
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Chi tiết đơn hàng</h2>
            <p className="text-gray-600">ID: {order._id}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {/* Thông tin chung */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Thông tin khách hàng</h3>
                  <p className="text-gray-900 font-semibold">{order.username}</p>
                  <p className="text-gray-600">{order.email}</p>
                  {order.phone && <p className="text-gray-600">📞 {order.phone}</p>}
                  {order.address && (
                    <div className="flex items-start gap-1 mt-1">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <p className="text-gray-600 text-sm">{order.address}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Phương thức thanh toán</h3>
                  <p className="text-gray-900">{order.paymentMethod}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-50">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Thời gian đặt hàng</h3>
                  <p className="text-gray-900">{formatDate(order.createdAt || order.date)}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Trạng thái đơn hàng</h3>
                <div className="flex items-center gap-2">
                  {getStatusBadge(order.status)}
                  {order.updatedAt && order.updatedAt !== order.createdAt && (
                    <span className="text-sm text-gray-500">
                      Cập nhật: {formatDate(order.updatedAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sản phẩm */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Sản phẩm đã đặt ({order.orderDetails?.length || order.items || 0})
            </h3>
            
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-700">Sản phẩm</th>
                    <th className="text-left p-3 font-medium text-gray-700">Đơn giá</th>
                    <th className="text-left p-3 font-medium text-gray-700">Số lượng</th>
                    <th className="text-left p-3 font-medium text-gray-700">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {order.orderDetails?.map((item, index) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-sm text-gray-500">ID: {item.productId}</div>
                      </td>
                      <td className="p-3">${item.unitPrice?.toFixed(2) || '0.00'}</td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3 font-medium">
                        ${((item.unitPrice || 0) * (item.quantity || 1)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Nếu không có orderDetails, hiển thị item tổng */}
                  {(!order.orderDetails || order.orderDetails.length === 0) && (
                    <tr className="border-t">
                      <td className="p-3">Sản phẩm đã đặt</td>
                      <td className="p-3">${order.total?.toFixed(2) || '0.00'}</td>
                      <td className="p-3">{order.items}</td>
                      <td className="p-3 font-medium">${order.total?.toFixed(2) || '0.00'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tổng kết */}
          <div className="border-t pt-6">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Tổng cộng:</span>
                  <span className="text-blue-600">${order.total?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          
        </div>
      </div>
    </div>
  );
}

export default function SellerOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  
  // State cho popup
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch orders khi component mount hoặc filter thay đổi
  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [selectedStatus]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }
      
      const result = await orderService.getOrders(params);
      setOrders(result.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const statsData = await orderService.getOrderStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleViewOrderDetails = async (orderId: string) => {
  console.log('Opening order details for ID:', orderId);
  setLoadingDetails(true);
  try {
    // Lấy chi tiết order từ API
    const orderDetails = await orderService.getOrderById(orderId);
    console.log('Order details received:', orderDetails);
    
    if (orderDetails) {
      console.log('Order has details:', {
        hasOrderDetails: !!orderDetails.orderDetails,
        orderDetailsCount: orderDetails.orderDetails?.length,
        hasPhone: !!orderDetails.phone,
        hasAddress: !!orderDetails.address
      });
      
      setSelectedOrder(orderDetails);
      setShowOrderDetails(true);
    } else {
      console.warn('No order details returned');
      toast.error('Không thể tải chi tiết đơn hàng');
    }
  } catch (error) {
    console.error('Error fetching order details:', error);
    toast.error('Có lỗi xảy ra khi tải chi tiết đơn hàng');
  } finally {
    setLoadingDetails(false);
  }
};

  const statuses = [
    { value: 'all', label: 'Tất cả', icon: Package },
    { value: 'pending', label: 'Chờ xác nhận', icon: Clock },
    { value: 'processing', label: 'Đang xử lý', icon: Package },
    { value: 'shipped', label: 'Đang giao', icon: Truck },
    { value: 'delivered', label: 'Đã giao', icon: CheckCircle },
    { value: 'cancelled', label: 'Đã hủy', icon: XCircle },
  ];

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-300 text-yellow-800 bg-yellow-50">Chờ xác nhận</Badge>;
      case 'processing':
        return <Badge variant="outline" className="border-blue-300 text-blue-800 bg-blue-50">Đang xử lý</Badge>;
      case 'shipped':
        return <Badge variant="outline" className="border-purple-300 text-purple-800 bg-purple-50">Đang giao</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="border-green-300 text-green-800 bg-green-50">Đã giao</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-red-300 text-red-800 bg-red-50">Đã hủy</Badge>;
      default:
        return <Badge variant="outline">Không xác định</Badge>;
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      const success = await orderService.updateOrderStatus(orderId, newStatus);
      if (success) {
        toast.success(`Đã cập nhật trạng thái đơn hàng ${orderId}`);
        // Refresh orders
        fetchOrders();
        fetchStats();
        
        // Cập nhật order đang xem nếu có
        if (selectedOrder && selectedOrder._id === orderId) {
          const updatedOrder = await orderService.getOrderById(orderId);
          setSelectedOrder(updatedOrder);
        }
      } else {
        toast.error('Cập nhật thất bại');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi cập nhật');
    }
  };

  const totalRevenue = orders
    .filter(order => order.status !== 'cancelled')
    .reduce((sum, order) => sum + order.total, 0);

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải đơn hàng...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 relative">
      {/* Popup chi tiết đơn hàng */}
      {showOrderDetails && (
        <OrderDetailsPopup
          order={selectedOrder}
          onClose={() => {
            setShowOrderDetails(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
          <p className="text-gray-600">
            {filteredOrders.length} đơn hàng - Tổng doanh thu: ${totalRevenue.toFixed(2)}
            {stats && ` | Tổng đơn hàng: ${stats.totalOrders || 0}`}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {statuses.slice(1).map((status) => {
          const Icon = status.icon;
          const count = orders.filter(order => order.status === status.value).length;
          return (
            <Card key={status.value}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-50">
                    <Icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-gray-600">{status.label}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
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
                  placeholder="Tìm kiếm theo ID, tên khách hàng, email..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto">
              {statuses.map((status) => {
                const Icon = status.icon;
                return (
                  <Button
                    key={status.value}
                    variant={selectedStatus === status.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedStatus(status.value)}
                    className="whitespace-nowrap"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {status.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 font-medium text-gray-600">Mã đơn hàng</th>
                  <th className="text-left p-4 font-medium text-gray-600">Khách hàng</th>
                  <th className="text-left p-4 font-medium text-gray-600">Số lượng</th>
                  <th className="text-left p-4 font-medium text-gray-600">Tổng tiền</th>
                  <th className="text-left p-4 font-medium text-gray-600">Trạng thái</th>
                  <th className="text-left p-4 font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order._id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium">{order._id}</div>
                      <div className="text-sm text-gray-500">{order.paymentMethod}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{order.username}</div>
                      <div className="text-sm text-gray-500">{order.email}</div>
                    </td>
                    <td className="p-4">{order.items} sản phẩm</td>
                    <td className="p-4 font-medium">${order.total.toFixed(2)}</td>
                    <td className="p-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {/* Nút xem chi tiết */}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewOrderDetails(order._id)}
                          disabled={loadingDetails}
                        >
                          {loadingDetails && selectedOrder?._id === order._id ? (
                            <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {order.status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(order._id, 'processing')}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Xác nhận đơn
                              </DropdownMenuItem>
                            )}
                            {order.status === 'processing' && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(order._id, 'shipped')}>
                                <Truck className="h-4 w-4 mr-2" />
                                Đánh dấu đã giao
                              </DropdownMenuItem>
                            )}
                            {(order.status === 'pending' || order.status === 'processing') && (
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleUpdateStatus(order._id, 'cancelled')}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Hủy đơn hàng
                              </DropdownMenuItem>
                            )}
                            
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {filteredOrders.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy đơn hàng</h3>
          <p className="text-gray-600">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      )}
    </div>
  );
}