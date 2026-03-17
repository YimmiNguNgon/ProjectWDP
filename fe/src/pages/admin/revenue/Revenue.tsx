import { useEffect, useState } from "react";
import { DollarSign, Truck, TrendingUp, BarChart3, Calendar, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/axios";

interface MonthlyBucket {
  month: string;
  commission: number;
  shipping: number;
  total: number;
}

interface TopSeller {
  _id: string;
  username: string;
  commission: number;
  orders: number;
}

interface AdminRevenueStats {
  totalCommission: number;
  totalShipping: number;
  totalRevenue: number;
  totalOrders: number;
  monthly: MonthlyBucket[];
  topSellers: TopSeller[];
}

function getDateRange(range: string): { startDate?: string; endDate?: string } {
  if (range === "all") return {};
  const days = range === "7days" ? 7 : range === "30days" ? 30 : range === "90days" ? 90 : 365;
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { startDate: start.toISOString() };
}

export default function AdminRevenue() {
  const [timeRange, setTimeRange] = useState("30days");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminRevenueStats>({
    totalCommission: 0,
    totalShipping: 0,
    totalRevenue: 0,
    totalOrders: 0,
    monthly: [],
    topSellers: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = getDateRange(timeRange);
        const res = await api.get("/api/revenue/admin", { params });
        setStats(res.data);
      } catch (err) {
        console.error("[AdminRevenue] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange]);

  const maxMonthTotal = Math.max(...stats.monthly.map((m) => m.total), 1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Revenue</h1>
          <p className="text-gray-600">Platform commission and shipping income</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px] cursor-pointer">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem className="cursor-pointer" value="7days">Past 7 Days</SelectItem>
            <SelectItem className="cursor-pointer" value="30days">Past 30 Days</SelectItem>
            <SelectItem className="cursor-pointer" value="90days">Past 90 Days</SelectItem>
            <SelectItem className="cursor-pointer" value="year">This Year</SelectItem>
            <SelectItem className="cursor-pointer" value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Total System Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Commission + Shipping</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Platform Commission (5%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">${stats.totalCommission.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">From {stats.totalOrders} orders</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Truck className="h-4 w-4 text-purple-500" />
              Shipping Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">${stats.totalShipping.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">Total shipping fees collected</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart + Top Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : stats.monthly.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No revenue data available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.monthly.map((m) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <div className="text-sm font-medium w-20 flex-shrink-0">{m.month}</div>
                    <div className="flex-1 space-y-1">
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${(m.commission / maxMonthTotal) * 100}%` }}
                        />
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full"
                          style={{ width: `${(m.shipping / maxMonthTotal) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right w-28 flex-shrink-0">
                      <div className="font-semibold text-sm">${m.total.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        c: ${m.commission.toFixed(2)} · s: ${m.shipping.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-blue-500 rounded inline-block" /> Commission</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-1.5 bg-purple-500 rounded inline-block" /> Shipping</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Sellers by Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : stats.topSellers.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No data yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.topSellers.map((seller, idx) => (
                  <div key={seller._id} className="flex items-center justify-between p-2 rounded-lg border text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground w-5">{idx + 1}.</span>
                      <div>
                        <div className="font-medium">{seller.username ?? "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{seller.orders} orders</div>
                      </div>
                    </div>
                    <div className="font-semibold text-blue-600">${seller.commission.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
