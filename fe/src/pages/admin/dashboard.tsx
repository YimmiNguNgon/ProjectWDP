import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboardStats, type DashboardStats } from "../../api/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { ArrowRight, ChartColumn, RefreshCw, ShoppingBag, ShoppingCart, Users } from "lucide-react";
import { toast } from "sonner";

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US");

const formatMoney = (value: number) => moneyFormatter.format(value || 0);
const formatNumber = (value: number) => numberFormatter.format(value || 0);

interface TrendBarProps {
  label: string;
  value: number;
  maxValue: number;
  colorClass: string;
  valueLabel?: string;
}

function TrendBar({ label, value, maxValue, colorClass, valueLabel }: TrendBarProps) {
  const heightPercent = maxValue > 0 ? Math.max((value / maxValue) * 100, value > 0 ? 8 : 2) : 0;

  return (
    <div className="flex-1 min-w-[44px]">
      <div className="h-36 flex items-end">
        <div
          className={`w-full rounded-t-md ${colorClass}`}
          style={{ height: `${heightPercent}%` }}
          title={`${label}: ${valueLabel || formatNumber(value)}`}
        />
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">{label}</p>
      <p className="text-center text-xs font-semibold text-gray-700">{valueLabel || formatNumber(value)}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await getDashboardStats();
      setStats(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const trend = stats?.monthlyTrend || [];
  const orderMax = useMemo(() => Math.max(1, ...trend.map((item) => item.orders || 0)), [trend]);
  const revenueMax = useMemo(() => Math.max(1, ...trend.map((item) => item.revenue || 0)), [trend]);
  const userMax = useMemo(() => Math.max(1, ...trend.map((item) => item.newUsers || 0)), [trend]);
  const productMax = useMemo(() => Math.max(1, ...trend.map((item) => item.newProducts || 0)), [trend]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-lg text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  const topProducts = stats.topSellingProducts || [];
  const statusEntries = Object.entries(stats.orders.byStatus || {});

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Detailed operational snapshot and sales performance</p>
        </div>
        <Button variant="outline" onClick={fetchStats}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/users")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.users.total)}</div>
            <p className="text-xs text-muted-foreground mb-3">+{formatNumber(stats.users.newLast7Days)} in the last 7 days</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                navigate("/admin/users");
              }}
            >
              Manage Users
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/products")}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.products.total)}</div>
            <p className="text-xs text-muted-foreground mb-1">+{formatNumber(stats.products.newLast7Days)} new in 7 days</p>
            <p className="text-xs text-green-700 font-medium">{formatNumber(stats.products.active || 0)} active listings</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.orders.total)}</div>
            <p className="text-xs text-muted-foreground mb-1">+{formatNumber(stats.orders.newLast7Days)} new in 7 days</p>
            <p className="text-xs text-green-700 font-medium">
              Delivered rate {stats.orders.deliveredRate ?? 0}% • Cancelled {stats.orders.cancelledRate ?? 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <ChartColumn className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(stats.revenue?.total || 0)}</div>
            <p className="text-xs text-muted-foreground">Computed from non-cancelled/non-failed orders</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orders Trend (Last 6 Months)</CardTitle>
            <CardDescription>Order volume by month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              {trend.map((point) => (
                <TrendBar
                  key={point.key}
                  label={point.label}
                  value={point.orders}
                  maxValue={orderMax}
                  colorClass="bg-blue-500"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
            <CardDescription>Revenue by month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              {trend.map((point) => (
                <TrendBar
                  key={point.key}
                  label={point.label}
                  value={point.revenue}
                  maxValue={revenueMax}
                  colorClass="bg-emerald-500"
                  valueLabel={formatMoney(point.revenue)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Growth: New Users vs New Products</CardTitle>
            <CardDescription>Monthly onboarding and listing growth</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-blue-700 mb-2">New users</p>
              <div className="flex items-end gap-3">
                {trend.map((point) => (
                  <TrendBar
                    key={`${point.key}-users`}
                    label={point.label}
                    value={point.newUsers}
                    maxValue={userMax}
                    colorClass="bg-indigo-500"
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-2">New products</p>
              <div className="flex items-end gap-3">
                {trend.map((point) => (
                  <TrendBar
                    key={`${point.key}-products`}
                    label={point.label}
                    value={point.newProducts}
                    maxValue={productMax}
                    colorClass="bg-amber-500"
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
            <CardDescription>Distribution by workflow status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusEntries.length === 0 && (
              <p className="text-sm text-muted-foreground">No orders yet</p>
            )}
            {statusEntries.map(([status, count]) => {
              const ratio = stats.orders.total > 0 ? (count / stats.orders.total) * 100 : 0;
              return (
                <div key={status} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{status}</span>
                    <span className="font-semibold">
                      {formatNumber(count)} ({ratio.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="h-2 rounded bg-gray-100">
                    <div className="h-2 rounded bg-violet-500" style={{ width: `${Math.max(ratio, 2)}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top 3 Best-Selling Products</CardTitle>
          <CardDescription>Ranked by units sold (excluding cancelled/failed/returned orders)</CardDescription>
        </CardHeader>
        <CardContent>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales data yet</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {topProducts.map((product) => (
                <div key={product.rank} className="rounded-lg border p-4 bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-700">
                      #{product.rank}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">{formatNumber(product.unitsSold)} sold</span>
                  </div>
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.title}
                      className="mb-3 h-24 w-full rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="mb-3 h-24 w-full rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                      No image
                    </div>
                  )}
                  <h4 className="font-semibold line-clamp-2 min-h-[40px]">{product.title}</h4>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Units sold</span>
                      <span className="font-semibold">{formatNumber(product.unitsSold)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Orders</span>
                      <span className="font-semibold">{formatNumber(product.orderCount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Revenue</span>
                      <span className="font-semibold text-green-700">{formatMoney(product.revenue)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
