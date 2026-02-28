import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  ShoppingBag,
  DollarSign,
  Star,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import api from "@/lib/axios";

interface RecentOrder {
  _id: string;
  orderId: string;
  customer: string;
  totalAmount: number;
  status: string;
  date: string;
}

interface InventoryData {
  totalProducts: number;
  activeProducts: number;
  lowStockCount: number;
  outOfStock: number;
}

interface DashboardStats {
  pendingOrders: number;
  totalRevenue: number;
  completedOrders: number;
}

const STATUS_STYLE: Record<string, string> = {
  delivered: "bg-green-100 text-green-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-cyan-100 text-cyan-800",
  created: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  returned: "bg-orange-100 text-orange-800",
  failed: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<string, string> = {
  delivered: "Hoàn thành",
  paid: "Đã thanh toán",
  processing: "Đang xử lý",
  shipped: "Đang giao",
  created: "Chờ xác nhận",
  cancelled: "Đã huỷ",
  returned: "Đã hoàn",
  failed: "Thất bại",
};

export default function SellerOverview() {
  const { user } = useAuth();

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    pendingOrders: 0,
    totalRevenue: 0,
    completedOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [ordersRes, inventoryRes] = await Promise.allSettled([
          api.get("/api/orders", { params: { role: "seller", limit: 5 } }),
          api.get("/api/products/seller/inventory"),
        ]);

        // Xử lý orders
        if (ordersRes.status === "fulfilled") {
          const data = ordersRes.value.data;
          const orders: RecentOrder[] = (data.data ?? []).slice(0, 5);
          setRecentOrders(orders);

          // Tính stats từ tất cả đơn (không chỉ 5 đơn đầu)
          const allOrders: RecentOrder[] = data.data ?? [];
          const pending = allOrders.filter((o) =>
            ["created", "paid", "processing"].includes(o.status)
          ).length;
          const completed = allOrders.filter(
            (o) => o.status === "delivered"
          ).length;
          const revenue = allOrders
            .filter((o) => o.status === "delivered")
            .reduce((sum: number, o: any) => sum + (o.totalAmount ?? 0), 0);

          setStats({ pendingOrders: pending, completedOrders: completed, totalRevenue: revenue });
        }

        // Xử lý inventory
        if (inventoryRes.status === "fulfilled") {
          setInventory(inventoryRes.value.data.data);
        }
      } catch (err) {
        console.error("[Overview] Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const isProbation = user?.sellerStage === "PROBATION";
  const avgRating = user?.sellerInfo?.avgRating ?? 0;
  const shopName = user?.sellerInfo?.shopName ?? user?.username ?? "";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tổng quan</h1>
          <p className="text-gray-600">
            Shop: <strong>{shopName}</strong>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {/* PROBATION banner */}
      {isProbation && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Tài khoản đang ở giai đoạn PROBATION
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Giới hạn: 5 sản phẩm/ngày · 10 đơn/ngày · Không đăng danh mục rủi ro cao.{" "}
              <Link to="/seller/my-listings" className="underline font-medium">
                Xem chi tiết →
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng doanh thu</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  ${stats.totalRevenue.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Từ {stats.completedOrders} đơn hoàn thành
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đơn đang xử lý</CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.pendingOrders}</div>
                <div className="text-xs text-muted-foreground">Cần xử lý</div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sản phẩm đang bán</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            {loading || !inventory ? (
              <div className="h-7 w-20 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {inventory.activeProducts}/{inventory.totalProducts}
                </div>
                <div className="text-xs text-muted-foreground">Đang hoạt động</div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Đánh giá trung bình</CardTitle>
            <Star className="h-4 w-4 text-yellow-600 fill-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgRating > 0 ? avgRating.toFixed(1) : "--"}/5
            </div>
            <div className="text-xs text-muted-foreground">
              {avgRating > 0 ? "Điểm đánh giá" : "Chưa có đánh giá"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seller stage progress (nếu PROBATION) */}
      {isProbation && user?.sellerInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tiến độ nâng cấp lên NORMAL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Đơn thành công",
                  value: user.sellerInfo.successOrders ?? 0,
                  target: 20,
                  unit: "",
                  suffix: "/20",
                },
                {
                  label: "Rating TB",
                  value: avgRating,
                  target: 4.5,
                  unit: "⭐",
                  suffix: "/4.5",
                },
                {
                  label: "Refund rate",
                  value: user.sellerInfo.refundRate ?? 0,
                  target: 5,
                  unit: "%",
                  suffix: "< 5%",
                  lowerIsBetter: true,
                },
              ].map((item) => {
                const ok = item.lowerIsBetter
                  ? item.value < item.target
                  : item.value >= item.target;
                return (
                  <div
                    key={item.label}
                    className="flex flex-col gap-1 p-3 rounded-lg border bg-muted/30"
                  >
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-lg font-bold ${ok ? "text-green-600" : "text-amber-600"}`}>
                        {typeof item.value === "number"
                          ? item.value % 1 === 0
                            ? item.value
                            : item.value.toFixed(1)
                          : item.value}
                        {item.unit}
                      </span>
                      <Badge
                        variant={ok ? "default" : "secondary"}
                        className={`text-xs ${ok ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}`}
                      >
                        {ok ? "✓" : item.suffix}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle>Đơn hàng gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Chưa có đơn hàng nào</p>
              <p className="text-xs mt-1">Đơn hàng sẽ xuất hiện tại đây khi khách mua sản phẩm</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <div className="font-medium text-sm">{order.orderId || `#${String(order._id).slice(-6).toUpperCase()}`}</div>
                    <div className="text-xs text-muted-foreground">{order.customer}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">${(order.totalAmount ?? 0).toFixed(2)}</div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full inline-block ${STATUS_STYLE[order.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                </div>
              ))}
              <Link
                to="/seller/orders"
                className="block text-center text-primary hover:text-primary/80 text-sm mt-2"
              >
                Xem tất cả đơn hàng →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}