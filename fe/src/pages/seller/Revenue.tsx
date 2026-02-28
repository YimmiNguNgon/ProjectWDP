import { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Users,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SellerRevenue() {
  const [timeRange, setTimeRange] = useState('30days');

  const stats = {
    totalRevenue: 12560.75,
    totalOrders: 156,
    avgOrderValue: 80.52,
    conversionRate: 3.2,
    returningCustomers: 45,
    newCustomers: 111,
    todayRevenue: 245.5,
    yesterdayRevenue: 218.25,
  };

  const monthlyData = [
    { month: 'Jan', revenue: 3245, orders: 42 },
    { month: 'Feb', revenue: 2987, orders: 38 },
    { month: 'Mar', revenue: 3567, orders: 45 },
    { month: 'Apr', revenue: 4123, orders: 52 },
    { month: 'May', revenue: 3890, orders: 49 },
    { month: 'Jun', revenue: 4567, orders: 58 },
    { month: 'Jul', revenue: 4987, orders: 63 },
    { month: 'Aug', revenue: 5234, orders: 67 },
    { month: 'Sep', revenue: 4789, orders: 61 },
    { month: 'Oct', revenue: 5567, orders: 71 },
    { month: 'Nov', revenue: 6123, orders: 78 },
    { month: 'Dec', revenue: 6890, orders: 88 },
  ];

  const topProducts = [
    { name: 'Cotton T-Shirt', revenue: 2456, sales: 89, growth: 12 },
    { name: 'Bluetooth Headphones', revenue: 1890, sales: 42, growth: 8 },
    { name: 'Programming Book', revenue: 1678, sales: 56, growth: 15 },
    { name: 'Sports Water Bottle', revenue: 1234, sales: 34, growth: 5 },
    { name: 'LED Night Light', revenue: 987, sales: 23, growth: -2 },
  ];

  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  };

  const revenueGrowth = calculateGrowth(stats.todayRevenue, stats.yesterdayRevenue);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Analytics</h1>
          <p className="text-gray-600">Track and analyze your store revenue</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
              <SelectItem value="year">This year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <div className="text-3xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
              <div className="text-gray-600 mb-2">Total Revenue</div>
              <div className={`flex items-center ${revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {revenueGrowth >= 0 ? (
                  <TrendingUp className="h-4 w-4 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 mr-1" />
                )}
                {Math.abs(revenueGrowth).toFixed(1)}% vs yesterday
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold">{stats.totalOrders}</div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">${stats.avgOrderValue.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Avg / Order</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{stats.conversionRate}%</div>
                <div className="text-sm text-gray-600">Conversion Rate</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{stats.returningCustomers}</div>
                <div className="text-sm text-gray-600">Returning Customers</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Revenue
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
                      <div className="text-xs text-gray-500">{month.orders} orders</div>
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

        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product) => (
                <div key={product.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-gray-500">{product.sales} sold</div>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Daily Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Today</span>
                <div className="font-semibold">${stats.todayRevenue.toFixed(2)}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Yesterday</span>
                <div className="font-semibold">${stats.yesterdayRevenue.toFixed(2)}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">This Week</span>
                <div className="font-semibold">$1,567.89</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">This Month</span>
                <div className="font-semibold">${stats.totalRevenue.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending</span>
                <div className="font-semibold">3</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Shipping</span>
                <div className="font-semibold">7</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Completed</span>
                <div className="font-semibold">142</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cancelled</span>
                <div className="font-semibold">4</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Customers</span>
                <div className="font-semibold">{stats.returningCustomers + stats.newCustomers}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">New</span>
                <div className="font-semibold">{stats.newCustomers}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Returning</span>
                <div className="font-semibold">{stats.returningCustomers}</div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Return Rate</span>
                <div className="font-semibold">
                  {((stats.returningCustomers / (stats.returningCustomers + stats.newCustomers)) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Highlights</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                  December revenue increased by 15% compared to November
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  Cotton T-Shirt contributes 19.6% of total revenue
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5"></div>
                  Conversion rate is highest on Tuesday and Wednesday
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Recommendations</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5"></div>
                  Increase ads for LED Night Light due to declining sales
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></div>
                  Run a loyalty campaign for returning customers
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5"></div>
                  Add products similar to Programming Book that are selling well
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

