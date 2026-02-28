import { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Users,
  Calendar,
  BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/axios';

interface MonthlyBucket { month: string; revenue: number; orders: number; }
interface TopProduct { title: string; revenue: number; sales: number; }

interface RevenueStats {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  shippingOrders: number;
  uniqueBuyers: number;
}

function getDaysBack(range: string): number {
  switch (range) {
    case '7days': return 7;
    case '30days': return 30;
    case '90days': return 90;
    case 'year': return 365;
    default: return 36500; // "all"
  }
}

export default function SellerRevenue() {
  const [timeRange, setTimeRange] = useState('30days');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RevenueStats>({
    totalRevenue: 0, totalOrders: 0, avgOrderValue: 0,
    completedOrders: 0, cancelledOrders: 0, pendingOrders: 0,
    shippingOrders: 0, uniqueBuyers: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyBucket[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const daysBack = getDaysBack(timeRange);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);

        const res = await api.get('/api/orders', {
          params: {
            role: 'seller',
            limit: 1000,
            startDate: timeRange === 'all' ? undefined : startDate.toISOString(),
          },
        });

        const orders: any[] = res.data?.data ?? [];

        // ── Tính stats ──────────────────────────────────────────────────────
        const delivered = orders.filter(o => o.status === 'delivered');
        const cancelled = orders.filter(o => o.status === 'cancelled');
        const pending = orders.filter(o => ['created', 'paid', 'processing'].includes(o.status));
        const shipping = orders.filter(o => o.status === 'shipped');
        const totalRevenue = delivered.reduce((s: number, o: any) => s + (o.totalAmount ?? 0), 0);
        const uniqueBuyers = new Set(orders.map((o: any) => o.buyer?._id ?? o.buyer)).size;

        setStats({
          totalRevenue,
          totalOrders: orders.length,
          avgOrderValue: delivered.length > 0 ? totalRevenue / delivered.length : 0,
          completedOrders: delivered.length,
          cancelledOrders: cancelled.length,
          pendingOrders: pending.length,
          shippingOrders: shipping.length,
          uniqueBuyers,
        });

        // ── Nhóm theo tháng ─────────────────────────────────────────────────
        const buckets: Record<string, { revenue: number; orders: number }> = {};
        delivered.forEach((o: any) => {
          const d = new Date(o.createdAt);
          const key = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
          if (!buckets[key]) buckets[key] = { revenue: 0, orders: 0 };
          buckets[key].revenue += o.totalAmount ?? 0;
          buckets[key].orders += 1;
        });
        const monthly = Object.entries(buckets)
          .map(([month, v]) => ({ month, ...v }))
          .sort((a, b) => {
            const [am, ay] = a.month.replace('Tháng ', '').split('/').map(Number);
            const [bm, by] = b.month.replace('Tháng ', '').split('/').map(Number);
            return ay !== by ? ay - by : am - bm;
          })
          .slice(-12);
        setMonthlyData(monthly);

        // ── Top sản phẩm theo doanh thu ──────────────────────────────────────
        const productMap: Record<string, { title: string; revenue: number; sales: number }> = {};
        delivered.forEach((o: any) => {
          (o.items ?? []).forEach((item: any) => {
            const id = item.productId?._id ?? item.productId ?? 'unknown';
            const title = item.productId?.title ?? item.title ?? 'Sản phẩm';
            if (!productMap[id]) productMap[id] = { title, revenue: 0, sales: 0 };
            productMap[id].revenue += (item.unitPrice ?? 0) * (item.quantity ?? 1);
            productMap[id].sales += item.quantity ?? 1;
          });
        });
        const top = Object.values(productMap)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);
        setTopProducts(top);
      } catch (err) {
        console.error('[Revenue] Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  const maxMonthRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý doanh thu</h1>
          <p className="text-gray-600">Theo dõi và phân tích doanh thu của bạn</p>
        </div>
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

      {/* Revenue Overview */}
      <Card>
        <CardContent className="p-6">
          {loading ? (
            <div className="h-20 bg-muted animate-pulse rounded" />
          ) : (
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="text-center lg:text-left">
                <div className="text-3xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
                <div className="text-gray-600 mb-1">Tổng doanh thu</div>
                {stats.totalRevenue === 0 && (
                  <p className="text-xs text-muted-foreground">Chưa có đơn hoàn thành trong khoảng thời gian này</p>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Tổng đơn hàng', value: stats.totalOrders },
                  { label: 'Trung bình/đơn', value: `$${stats.avgOrderValue.toFixed(2)}` },
                  { label: 'Đơn hoàn thành', value: stats.completedOrders },
                  { label: 'Khách hàng', value: stats.uniqueBuyers },
                ].map(item => (
                  <div key={item.label} className="text-center">
                    <div className="text-lg font-bold">{item.value}</div>
                    <div className="text-sm text-gray-600">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Doanh thu theo tháng
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : monthlyData.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có dữ liệu doanh thu</p>
              </div>
            ) : (
              <div className="space-y-3">
                {monthlyData.map(month => (
                  <div key={month.month} className="flex items-center gap-3">
                    <div className="text-sm font-medium w-28 flex-shrink-0">{month.month}</div>
                    <div className="flex-1">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${(month.revenue / maxMonthRevenue) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right w-28 flex-shrink-0">
                      <div className="font-semibold text-sm">${month.revenue.toFixed(0)}</div>
                      <div className="text-xs text-muted-foreground">{month.orders} đơn</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Sản phẩm bán chạy</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có sản phẩm nào được bán</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">{product.title}</div>
                      <div className="text-xs text-muted-foreground">{product.sales} sản phẩm đã bán</div>
                    </div>
                    <div className="font-semibold text-sm">${product.revenue.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Status Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Tổng doanh thu
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <div className="h-20 bg-muted animate-pulse rounded" /> : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Từ đơn hoàn thành</span>
                  <span className="font-semibold">${stats.totalRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Trung bình / đơn</span>
                  <span className="font-semibold">${stats.avgOrderValue.toFixed(2)}</span>
                </div>
              </div>
            )}
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
            {loading ? <div className="h-20 bg-muted animate-pulse rounded" /> : (
              <div className="space-y-2 text-sm">
                {[
                  { label: 'Đang xử lý', value: stats.pendingOrders, color: 'text-amber-600' },
                  { label: 'Đang giao', value: stats.shippingOrders, color: 'text-blue-600' },
                  { label: 'Hoàn thành', value: stats.completedOrders, color: 'text-green-600' },
                  { label: 'Đã huỷ', value: stats.cancelledOrders, color: 'text-red-600' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className={`font-semibold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
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
            {loading ? <div className="h-20 bg-muted animate-pulse rounded" /> : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Khách hàng duy nhất</span>
                  <span className="font-semibold">{stats.uniqueBuyers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tổng đơn</span>
                  <span className="font-semibold">{stats.totalOrders}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}