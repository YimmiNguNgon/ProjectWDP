import { useState } from 'react';
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
  MoreVertical
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

interface Order {
  id: string;
  customer: string;
  email: string;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: number;
  date: string;
  paymentMethod: string;
}

export default function SellerOrders() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Mock orders data
  const orders: Order[] = [
    { id: '#ORD001', customer: 'Nguyễn Văn A', email: 'nguyena@email.com', total: 245.50, status: 'pending', items: 2, date: '15/12/2023', paymentMethod: 'Credit Card' },
    { id: '#ORD002', customer: 'Trần Thị B', email: 'tranb@email.com', total: 189.99, status: 'processing', items: 1, date: '14/12/2023', paymentMethod: 'PayPal' },
    { id: '#ORD003', customer: 'Lê Văn C', email: 'lec@email.com', total: 320.00, status: 'shipped', items: 3, date: '14/12/2023', paymentMethod: 'Bank Transfer' },
    { id: '#ORD004', customer: 'Phạm Thị D', email: 'phamd@email.com', total: 156.75, status: 'delivered', items: 2, date: '13/12/2023', paymentMethod: 'Credit Card' },
    { id: '#ORD005', customer: 'Hoàng Văn E', email: 'hoange@email.com', total: 89.99, status: 'cancelled', items: 1, date: '12/12/2023', paymentMethod: 'PayPal' },
    { id: '#ORD006', customer: 'Đỗ Thị F', email: 'dof@email.com', total: 420.50, status: 'processing', items: 4, date: '11/12/2023', paymentMethod: 'Credit Card' },
  ];

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
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
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
    }
  };

  const handleUpdateStatus = (orderId: string, newStatus: Order['status']) => {
    toast.success(`Đã cập nhật trạng thái đơn hàng ${orderId}`);
    // Add API call here
  };

  const totalRevenue = orders
    .filter(order => order.status !== 'cancelled')
    .reduce((sum, order) => sum + order.total, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
          <p className="text-gray-600">{filteredOrders.length} đơn hàng - Tổng doanh thu: ${totalRevenue.toFixed(2)}</p>
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
                  <th className="text-left p-4 font-medium text-gray-600">Ngày đặt</th>
                  <th className="text-left p-4 font-medium text-gray-600">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium">{order.id}</div>
                      <div className="text-sm text-gray-500">{order.paymentMethod}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{order.customer}</div>
                      <div className="text-sm text-gray-500">{order.email}</div>
                    </td>
                    <td className="p-4">{order.items} sản phẩm</td>
                    <td className="p-4 font-medium">${order.total.toFixed(2)}</td>
                    <td className="p-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="p-4 text-gray-600">{order.date}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {order.status === 'pending' && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'processing')}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Xác nhận đơn
                              </DropdownMenuItem>
                            )}
                            {order.status === 'processing' && (
                              <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'shipped')}>
                                <Truck className="h-4 w-4 mr-2" />
                                Đánh dấu đã giao
                              </DropdownMenuItem>
                            )}
                            {(order.status === 'pending' || order.status === 'processing') && (
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Hủy đơn hàng
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              In hóa đơn
                            </DropdownMenuItem>
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