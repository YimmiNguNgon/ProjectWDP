import { Link } from 'react-router-dom';
import {
  Package,
  ShoppingBag,
  DollarSign,
  Star,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default function SellerOverview() {
  const stats = {
    totalProducts: 12,
    activeProducts: 10,
    pendingOrders: 3,
    todayRevenue: 245.5,
    monthlyRevenue: 12560.75,
    conversionRate: 3.2,
    averageRating: 4.8,
    totalReviews: 23,
    viewsToday: 1245,
    messagesUnread: 5,
  };

  const recentOrders = [
    { id: '#ORD001', customer: 'John Carter', amount: 245.5, status: 'Shipping', date: '12/15/2023' },
    { id: '#ORD002', customer: 'Emily Tran', amount: 189.99, status: 'Completed', date: '12/14/2023' },
    { id: '#ORD003', customer: 'David Lee', amount: 320.0, status: 'Pending', date: '12/14/2023' },
  ];

  const recentReviews = [
    { id: '#REV001', customer: 'John Carter', rating: 5, comment: 'Great product and fast shipping', date: '12/15/2023' },
    { id: '#REV002', customer: 'Emily Tran', rating: 4, comment: 'Good quality, delivery was slightly late', date: '12/14/2023' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-gray-600">Quick view of your store performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.todayRevenue.toFixed(2)}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12.5% vs yesterday
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <div className="flex items-center text-xs text-gray-600">Needs processing</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProducts}/{stats.totalProducts}</div>
            <div className="flex items-center text-xs text-gray-600">Currently listed</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-600 fill-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating}/5</div>
            <div className="flex items-center text-xs text-gray-600">From {stats.totalReviews} reviews</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue in Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500">Revenue chart</p>
                <p className="text-sm text-gray-400">Total: ${stats.monthlyRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
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
                      order.status === 'Completed'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'Shipping'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {order.status}
                    </div>
                  </div>
                </div>
              ))}
              <Link to="/seller/orders" className="block text-center text-green-600 hover:text-green-700 text-sm">
                View all orders
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Reviews</CardTitle>
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
                View all reviews
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Conversion Rate</span>
                <span className="font-semibold">{stats.conversionRate}%</span>
              </div>
              <Progress value={stats.conversionRate * 10} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Views Today</span>
                <span className="font-semibold">{stats.viewsToday}</span>
              </div>
              <Progress value={60} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Unread Messages</span>
                <span className="font-semibold">{stats.messagesUnread}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MessageSquare className="h-4 w-4 mr-2" />
                <Link to="/seller/messages" className="text-green-600 hover:text-green-700">
                  Check inbox
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

