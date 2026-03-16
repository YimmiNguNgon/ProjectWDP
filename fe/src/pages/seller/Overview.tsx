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
  ShieldCheck,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import api from "@/lib/axios";
import { toast } from "sonner";

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
  shipping: "bg-cyan-100 text-cyan-800",
  ready_to_ship: "bg-yellow-100 text-yellow-800",
  created: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-800",
  returned: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const STATUS_LABEL: Record<string, string> = {
  delivered: "Completed",
  paid: "Paid",
  processing: "Processing",
  shipping: "Shipping",
  ready_to_ship: "Ready To Ship",
  created: "Created",
  cancelled: "Cancelled",
  returned: "Returned",
  completed: "Completed",
  failed: "Failed",
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

  // Description state
  const [description, setDescription] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");
  const [savingDesc, setSavingDesc] = useState(false);

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
            ["created", "paid", "processing"].includes(o.status),
          ).length;
          const completed = allOrders.filter(
            (o) => o.status === "delivered",
          ).length;
          const revenue = allOrders
            .filter((o) => o.status === "delivered")
            .reduce((sum: number, o: any) => sum + (o.totalAmount ?? 0), 0);

          setStats({
            pendingOrders: pending,
            completedOrders: completed,
            totalRevenue: revenue,
          });
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

  useEffect(() => {
    api.get("/api/users/me").then((res) => {
      const desc = res.data?.user?.sellerInfo?.productDescription ?? res.data?.sellerInfo?.productDescription ?? "";
      setDescription(desc);
    }).catch(() => {});
  }, []);

  const handleSaveDescription = async () => {
    setSavingDesc(true);
    try {
      await api.put("/api/users/update-user-profile", {
        username: user?.username ?? "",
        productDescription: descDraft,
      });
      setDescription(descDraft);
      setEditingDesc(false);
      toast.success("Description updated");
    } catch {
      toast.error("Failed to update description");
    } finally {
      setSavingDesc(false);
    }
  };

  const isProbation = user?.sellerStage === "PROBATION";
  const avgRating = user?.sellerInfo?.avgRating ?? 0;
  const shopName = user?.sellerInfo?.shopName ?? user?.username ?? "";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
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
          Refresh
        </Button>
      </div>

      {/* PROBATION banner */}
      {isProbation && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Account is in PROBATION stage
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Limits: 5 products/day · 10 orders/day · No listing of high-risk
              categories.{" "}
              <Link to="/seller/my-listings" className="underline font-medium">
                View details →
              </Link>
            </p>
          </div>
        </div>
      )}

      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 via-cyan-50 to-white">
        <CardContent className="py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  Seller Score Center
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  View score breakdown, moderation impact, and warning signals.
                </p>
              </div>
            </div>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to="/seller/trust-score">View score</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
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
                  From {stats.completedOrders} completed orders
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Orders
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-7 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.pendingOrders}</div>
                <div className="text-xs text-muted-foreground">
                  Orders awaiting processing
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Products
            </CardTitle>
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
                <div className="text-xs text-muted-foreground">
                  Active Products
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Rating
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-600 fill-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgRating > 0 ? avgRating.toFixed(1) : "--"}/5
            </div>
            <div className="text-xs text-muted-foreground">
              {avgRating > 0 ? "Average Rating" : "No Ratings Yet"}
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
              Upgrade Progress to NORMAL stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Completed Orders",
                  value: user.sellerInfo.successOrders ?? 0,
                  target: 20,
                  unit: "",
                  suffix: "/20",
                },
                {
                  label: "Average Rating",
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
                    <span className="text-xs text-muted-foreground">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-lg font-bold ${ok ? "text-green-600" : "text-amber-600"}`}
                      >
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

      {/* Shop Description */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Shop Description</CardTitle>
          {!editingDesc && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setDescDraft(description); setEditingDesc(true); }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {editingDesc ? (
            <div className="space-y-2">
              <Textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                placeholder="Describe your shop to buyers..."
                rows={4}
                className="resize-none"
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{descDraft.length}/500</p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveDescription} disabled={savingDesc}>
                  <Check className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingDesc(false)}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {description || "No description yet. Click the edit button to add one."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 bg-muted animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No orders yet</p>
              <p className="text-xs mt-1">
                Orders will appear here when customers purchase your products
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order._id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {order.orderId ||
                        `#${String(order._id).slice(-6).toUpperCase()}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.customer}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      ${(order.totalAmount ?? 0).toFixed(2)}
                    </div>
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
                View All Orders →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
