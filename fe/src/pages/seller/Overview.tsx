import { Link } from 'react-router-dom';
import { 
  Package, 
  ShoppingBag, 
  DollarSign, 
  Users, 
  Star,
  TrendingUp,
  TrendingDown,
  Eye,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function SellerOverview() {
  // Mock data - replace with API calls
  const stats = {
    totalProducts: 12,
    activeProducts: 10,
    pendingOrders: 3,
    completedOrders: 45,
    todayRevenue: 245.50,
    monthlyRevenue: 12560.75,
    totalCustomers: 156,
    conversionRate: 3.2,
    averageRating: 4.8,
    totalReviews: 23,
    viewsToday: 1245,
    messagesUnread: 5
  };

  const recentOrders = [
    { id: '#ORD001', customer: 'Nguyễn Văn A', amount: 245.50, status: 'Đang giao', date: '15/12/2023' },
    { id: '#ORD002', customer: 'Trần Thị B', amount: 189.99, status: 'Hoàn thành', date: '14/12/2023' },
    { id: '#ORD003', customer: 'Lê Văn C', amount: 320.00, status: 'Chờ xác nhận', date: '14/12/2023' },
  ];

  const recentReviews = [
    { id: '#REV001', customer: 'Nguyễn Văn A', rating: 5, comment: 'Sản phẩm tốt, giao hàng nhanh', date: '15/12/2023' },
    { id: '#REV002', customer: 'Trần Thị B', rating: 4, comment: 'Chất lượng tốt nhưng hơi chậm', date: '14/12/2023' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-gray-600">Xem nhanh tình hình kinh doanh của bạn</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Xuất báo cáo</Button>
          <Button className="bg-green-600 hover:bg-green-700">
            Thêm sản phẩm mới
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu hôm nay</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.todayRevenue.toFixed(2)}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% so với hôm qua
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đơn hàng đang chờ</CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <div className="flex items-center text-xs text-gray-600">
              Cần xử lý ngay
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sản phẩm đang bán</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProducts}/{stats.totalProducts}</div>
            <div className="flex items-center text-xs text-gray-600">
              Hoạt động
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đánh giá trung bình</CardTitle>
            <Star className="h-4 w-4 text-yellow-600 fill-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating}/5</div>
            <div className="flex items-center text-xs text-gray-600">
              Từ {stats.totalReviews} đánh giá
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Doanh thu 30 ngày qua</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">📈</div>
                <p className="text-gray-500">Biểu đồ doanh thu</p>
                <p className="text-sm text-gray-400">Tổng: ${stats.monthlyRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Đơn hàng gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{order.id}</div>
                    <div className="text-sm text-gray-500">{order.customer}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${order.amount.toFixed(2)}</div>
                    <div className={`text-xs px-2 py-1 rounded-full inline-block ${
                      order.status === 'Hoàn thành' ? 'bg-green-100 text-green-800' :
                      order.status === 'Đang giao' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status}
                    </div>
                  </div>
                </div>
              ))}
              <Link to="/seller/orders" className="block text-center text-green-600 hover:text-green-700 text-sm">
                Xem tất cả đơn hàng →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Reviews */}
        <Card>
          <CardHeader>
            <CardTitle>Đánh giá mới</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentReviews.map((review) => (
                <div key={review.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{review.customer}</div>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${i < review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{review.comment}</p>
                  <div className="text-xs text-gray-500">{review.date}</div>
                </div>
              ))}
              <Link to="/seller/reviews" className="block text-center text-green-600 hover:text-green-700 text-sm">
                Xem tất cả đánh giá →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Chỉ số hiệu suất</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tỷ lệ chuyển đổi</span>
                <span className="font-semibold">{stats.conversionRate}%</span>
              </div>
              <Progress value={stats.conversionRate * 10} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Lượt xem hôm nay</span>
                <span className="font-semibold">{stats.viewsToday}</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tin nhắn chưa đọc</span>
                <span className="font-semibold">{stats.messagesUnread}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MessageSquare className="h-4 w-4 mr-2" />
                <Link to="/seller/messages" className="text-green-600 hover:text-green-700">
                  Kiểm tra hộp thư
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}