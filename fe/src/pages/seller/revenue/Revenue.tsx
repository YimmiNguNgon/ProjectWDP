import { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  BarChart3,
  Calendar,
} from "lucide-react";
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
  gross: number;
  fee: number;
  net: number;
  orders: number;
}

interface RevenueStats {
  totalGross: number;
  totalFee: number;
  totalNet: number;
  totalOrders: number;
  monthly: MonthlyBucket[];
}

function getDateRange(range: string): { startDate?: string; endDate?: string } {
  if (range === "all") return {};
  const days =
    range === "7days"
      ? 7
      : range === "30days"
        ? 30
        : range === "90days"
          ? 90
          : 365;
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { startDate: start.toISOString() };
}

export default function SellerRevenue() {
  const [timeRange, setTimeRange] = useState("30days");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<RevenueStats>({
    totalGross: 0,
    totalFee: 0,
    totalNet: 0,
    totalOrders: 0,
    monthly: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = getDateRange(timeRange);
        const res = await api.get("/api/revenue/seller", { params });
        setStats(res.data);
      } catch (err) {
        console.error("[Revenue] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [timeRange]);

  const maxMonthNet = Math.max(...stats.monthly.map((m) => m.net), 1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Revenue Management
          </h1>
          <p className="text-gray-600">Track your earnings and platform fees</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px] cursor-pointer">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem className="cursor-pointer" value="7days">
              Past 7 Days
            </SelectItem>
            <SelectItem className="cursor-pointer" value="30days">
              Past 30 Days
            </SelectItem>
            <SelectItem className="cursor-pointer" value="90days">
              Past 90 Days
            </SelectItem>
            <SelectItem className="cursor-pointer" value="year">
              This Year
            </SelectItem>
            <SelectItem className="cursor-pointer" value="all">
              All Time
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Gross Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${stats.totalGross.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total from {stats.totalOrders} orders
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              Platform Fee (5%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  -${stats.totalFee.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  5% commission per order
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Net Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  ${stats.totalNet.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your actual earnings (95%)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Chart */}
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
                  <div className="text-sm font-medium w-20 flex-shrink-0">
                    {m.month}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${(m.net / maxMonthNet) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right w-36 flex-shrink-0">
                    <div className="font-semibold text-sm text-green-600">
                      ${m.net.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      gross ${m.gross.toFixed(2)} · {m.orders} orders
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-20 bg-muted animate-pulse rounded" />
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Gross Revenue (from buyers)
                </span>
                <span className="font-semibold">
                  ${stats.totalGross.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Platform Commission (5%)</span>
                <span className="font-semibold">
                  -${stats.totalFee.toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-3 flex justify-between text-green-700 font-semibold">
                <span>Your Net Revenue (95%)</span>
                <span>${stats.totalNet.toFixed(2)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
