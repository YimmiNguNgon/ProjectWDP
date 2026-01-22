import { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  Users, 
  Calendar,
  Download,
  Filter,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function SellerRevenue() {
  const [timeRange, setTimeRange] = useState('30days');
  const [currency, setCurrency] = useState('USD');

  // Mock data
  const stats = {
    totalRevenue: 12560.75,
    totalOrders: 156,
    avgOrderValue: 80.52,
    conversionRate: 3.2,
    returningCustomers: 45,
    newCustomers: 111,
    todayRevenue: 245.50,
    yesterdayRevenue: 218.25,
  };

  const monthlyData = [
    { month: 'Tháng 1', revenue: 3245, orders: 42 },
    { month: 'Tháng 2', revenue: 2987, orders: 38 },
    { month: 'Tháng 3', revenue: 3567, orders: 45 },
    { month: 'Tháng 4', revenue: 4123, orders: 52 },
    { month: 'Tháng 5', revenue: 3890, orders: 49 },
    { month: 'Tháng 6', revenue: 4567, orders: 58 },
    { month: 'Tháng 7', revenue: 4987, orders: 63 },
    { month: 'Tháng 8', revenue: 5234, orders: 67 },
    { month: 'Tháng 9', revenue: 4789, orders: 61 },
    { month: 'Tháng 10', revenue: 5567, orders: 71 },
    { month: 'Tháng 11', revenue: 6123, orders: 78 },
    { month: 'Tháng 12', revenue: 6890, orders: 88 },
  ];

  const topProducts = [
    { name: 'Áo thun cotton', revenue: 2456, sales: 89, growth: 12 },
    { name: 'Tai nghe Bluetooth', revenue: 1890, sales: 42, growth: 8 },
    { name: 'Sách lập trình', revenue: 1678, sales: 56, growth: 15 },
    { name: 'Bình nước thể thao', revenue: 1234, sales: 34, growth: 5 },
    { name: 'Đèn ngủ LED', revenue: 987, sales: 23, growth: -2 },
  ];

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  };

  const revenueGrowth = calculateGrowth(stats.todayRevenue, stats.yesterdayRevenue);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý doanh thu</h1>
          <p className="text-gray-600">Theo dõi và phân tích doanh thu của bạn</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">7 ngày qua</SelectItem>
              <SelectItem value="30days">30 ngày qua</SelectItem>
              <SelectItem value="90days">90 ngày qua</SelectItem>
              <SelectItem value="year">Năm nay</SelectItem>
              <SelectItem value="all">Tất cả</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Revenue Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <div className="text-3xl font-bold">
                ${stats.totalRevenue.toFixed(2)}
              </div>
              <div className="text-gray-600 mb-2">Tổng doanh thu</div>
              <div className={`flex items-center ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueGrowth >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(revenueGrowth).toFixed(1)}% so với hôm qua
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold">{stats.totalOrders}</div>
                <div className="text-sm text-gray-600">Tổng đơn hàng</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">${stats.avgOrderValue.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Trung bình/đơn</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{stats.conversionRate}%</div>
                <div className="text-sm text-gray-600">Tỷ lệ chuyển đổi</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{stats.returningCustomers}</div>
                <div className="text-sm text-gray-600">Khách quay lại</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Doanh thu theo tháng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {monthlyData.map((month) => (
                <div key={month.month} className="flex items-center justify-between">
                  <div className="text-sm font-medium">{month.month}</div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">${month.revenue.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">{month.orders} đơn hàng</div>
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(month.revenue / 7000) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product) => (
                <div key={product.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.sales} sản phẩm đã bán</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${product.revenue.toFixed(2)}</div>
                    <div className={`text-xs ${product.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.growth >= 0 ? '+' : ''}{product.growth}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Doanh thu theo ngày
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Hôm nay</span>
                <div className="font-semibold">${stats.todayRevenue.toFixed(2)}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Hôm qua</span>
                <div className="font-semibold">${stats.yesterdayRevenue.toFixed(2)}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tuần này</span>
                <div className="font-semibold">$1,567.89</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tháng này</span>
                <div className="font-semibold">${stats.totalRevenue.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              Đơn hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Đang chờ xử lý</span>
                <div className="font-semibold">3</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Đang giao hàng</span>
                <div className="font-semibold">7</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Đã hoàn thành</span>
                <div className="font-semibold">142</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Đã hủy</span>
                <div className="font-semibold">4</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Khách hàng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tổng khách hàng</span>
                <div className="font-semibold">{stats.returningCustomers + stats.newCustomers}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Khách mới</span>
                <div className="font-semibold">{stats.newCustomers}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Khách quay lại</span>
                <div className="font-semibold">{stats.returningCustomers}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Tỷ lệ quay lại</span>
                <div className="font-semibold">
                  {((stats.returningCustomers / (stats.returningCustomers + stats.newCustomers)) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin chi tiết</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Điểm nổi bật</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                  Doanh thu tháng 12 tăng 15% so với tháng 11
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  Sản phẩm "Áo thun cotton" chiếm 19.6% tổng doanh thu
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5"></div>
                  Tỷ lệ chuyển đổi cao nhất vào thứ 3 và thứ 4
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Khuyến nghị</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5"></div>
                  Tăng quảng cáo cho sản phẩm "Đèn ngủ LED" đang giảm doanh thu
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></div>
                  Tạo chương trình khuyến mãi cho khách hàng quay lại
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5"></div>
                  Bổ sung thêm sản phẩm tương tự "Sách lập trình" đang bán chạy
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}